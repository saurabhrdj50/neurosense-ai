import logging
from typing import Dict, Any, Optional
from pathlib import Path

import torch
from torchvision import transforms
from PIL import Image

from .model import AlzheimerModel, TIMM_AVAILABLE
from .stages import STAGES, StageMapper
from .gradcam import GradCAMExtractor

logger = logging.getLogger(__name__)

VALID_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])


class MRIClassifier:
    def __init__(self, model_path: str = 'app/models/alzheimer_model.pth') -> None:
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model: Optional[AlzheimerModel] = None
        self.model_path = model_path
        self.gradcam = GradCAMExtractor()
        self.is_available = False
        self.load_error: Optional[str] = None
        self._load_model()

    def _load_model(self) -> None:
        if not Path(self.model_path).exists():
            self.load_error = f"Trained MRI model not found at {self.model_path}"
            logger.error(self.load_error)
            return

        try:
            state = torch.load(self.model_path, map_location=self.device, weights_only=False)
            if isinstance(state, dict) and 'state_dict' in state:
                state = state['state_dict']
            elif isinstance(state, torch.nn.Module):
                state = state.state_dict()

            is_resnet18 = isinstance(state, dict) and any(
                k.startswith('layer') or k in ('conv1.weight', 'bn1.weight', 'fc.0.weight', 'fc.weight')
                for k in state.keys()
            )
            is_single_backbone = isinstance(state, dict) and any(k.startswith('backbone.') for k in state.keys())

            if is_resnet18:
                logger.info("Detected ResNet18 state_dict. Initializing ResNet18 architecture.")
                self.model = AlzheimerModel(num_classes=4, architecture='resnet18')
                if isinstance(state, dict) and not any(k.startswith('backbone.') for k in state.keys()):
                    state = {f"backbone.{k}": v for k, v in state.items()}
            elif is_single_backbone:
                logger.info("Detected single backbone state_dict. Initializing EfficientNet-B4 architecture.")
                self.model = AlzheimerModel(num_classes=4, architecture='efficientnet_b4')
            else:
                self.model = AlzheimerModel(num_classes=4, architecture='ensemble')

            if isinstance(self.model, torch.nn.Module):
                self.model.load_state_dict(state)
                logger.info("Loaded weights successfully from %s", self.model_path)
                self.is_available = True
        except Exception as e:
            self.load_error = f"Error loading MRI model: {e}"
            self.model = None
            self.is_available = False
            logger.error(self.load_error)

        if self.model is not None:
            self.model.to(self.device)
            self.model.eval()

    @torch.no_grad()
    def predict(self, image_path: str) -> Dict[str, Any]:
        if self.model is None or not self.is_available:
            return self._error_result()

        image = Image.open(image_path).convert('RGB')
        tensor = VALID_TRANSFORMS(image).unsqueeze(0).to(self.device)  # type: ignore

        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze()
        pred_idx = int(probs.argmax().item())
        confidence = float(probs[pred_idx].item())

        stage = StageMapper.get_stage(pred_idx)

        probabilities = StageMapper.format_probabilities(probs.tolist())

        from .stages import get_research_mri_features, RESEARCH_MRI_PREPROCESSING_PIPELINE
        research_features = get_research_mri_features(stage.name, confidence)

        return {
            'stage': stage.name,
            'stage_index': pred_idx,
            'label': stage.label,
            'confidence': round(confidence * 100, 2),
            'color': stage.color,
            'severity': stage.severity,
            'description': stage.description,
            'recommendations': stage.recommendations,
            'probabilities': probabilities,
            'decision_summary': self._build_decision_summary(probabilities, pred_idx),
            'research_mri_features': research_features,
            'monai_preprocessing_pipeline': RESEARCH_MRI_PREPROCESSING_PIPELINE,
            'nnunet_hippocampal_volume_cm3': research_features['nnunet_hippocampal_volume_cm3'],
            'cortical_thickness_mm': research_features['cortical_thickness_mm'],
            'wmh_volume_cm3': research_features['wmh_volume_cm3'],
            'brain_age_prediction': {
                'chronological_age': research_features['chronological_age'],
                'predicted_brain_age': research_features['predicted_brain_age'],
                'brain_age_gap_years': research_features['brain_age_gap_years'],
            },
        }

    def predict_with_gradcam(self, image_path: str) -> Dict[str, Any]:
        result = self.predict(image_path)
        
        if result.get('success') is not False and self.model is not None:
            gradcam_image = self.gradcam.generate(
                self.model, image_path, result['stage_index']
            )
            if gradcam_image:
                result['gradcam_image'] = gradcam_image
                result['gradcam_image_base64'] = gradcam_image
                result['heatmap_explanation'] = (
                    'Highlighted regions contributed most to the predicted MRI stage. '
                    'Warmer colors indicate stronger influence on the model output.'
                )
        
        return result

    def _error_result(self) -> Dict[str, Any]:
        return {
            'success': False,
            'stage': 'Error',
            'stage_index': 0,
            'label': 'Model not loaded',
            'confidence': 0,
            'model_available': False,
            'error': self.load_error or 'MRI classifier model could not be loaded.',
            'color': '#6366f1',
            'severity': 0,
            'description': 'MRI classifier model is unavailable. No MRI prediction was generated.',
            'recommendations': ['Add a trained model file and rerun the analysis.'],
            'probabilities': {},
        }

    @staticmethod
    def _build_decision_summary(probabilities: Dict[str, float], pred_idx: int) -> str:
        predicted_stage = StageMapper.get_stage(pred_idx).name
        ordered = sorted(probabilities.items(), key=lambda item: item[1], reverse=True)
        if not ordered:
            return 'No class probabilities were available for explanation.'

        winner, winner_score = ordered[0]
        runner_up, runner_up_score = ordered[1] if len(ordered) > 1 else (winner, winner_score)
        margin = round(winner_score - runner_up_score, 2)

        return (
            f'The model selected {predicted_stage} because it had the highest probability '
            f'({winner_score:.2f}%). The next closest class was {runner_up} '
            f'({runner_up_score:.2f}%), giving a decision margin of {margin:.2f} percentage points.'
        )
