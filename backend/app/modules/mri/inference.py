import logging
import os
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

            is_resnet18 = isinstance(state, dict) and (
                any(
                    k.startswith('layer') or k in ('conv1.weight', 'bn1.weight', 'fc.0.weight', 'fc.weight')
                    for k in state.keys()
                )
                or (
                    'classifier.weight' in state
                    and 'backbone.conv1.weight' in state
                    and 'backbone.bn1.weight' in state
                    and any(k.startswith('backbone.layer') and '.conv' in k for k in state.keys())
                )
            )
            is_single_backbone = isinstance(state, dict) and any(k.startswith('backbone.') for k in state.keys())

            if is_resnet18:
                num_classes = self._infer_num_classes(state) or 4
                logger.info("Detected ResNet18 state_dict (%d classes). Initializing ResNet18 architecture.", num_classes)
                self.model = AlzheimerModel(num_classes=num_classes, architecture='resnet18')
                if isinstance(state, dict) and not any(k.startswith('backbone.') for k in state.keys()):
                    wrapped = {f"backbone.{k}": v for k, v in state.items() if k != '_metadata'}
                    if 'backbone.fc.weight' in wrapped:
                        wrapped['classifier.weight'] = wrapped.pop('backbone.fc.weight')
                        if 'backbone.fc.bias' in wrapped:
                            wrapped['classifier.bias'] = wrapped.pop('backbone.fc.bias')
                    state = wrapped
            elif is_single_backbone:
                num_classes = self._infer_num_classes(state) or 4
                logger.info("Detected single backbone state_dict. Initializing EfficientNet-B4 architecture.")
                self.model = AlzheimerModel(num_classes=num_classes, architecture='efficientnet_b4')
            else:
                num_classes = self._infer_num_classes(state) or 4
                self.model = AlzheimerModel(num_classes=num_classes, architecture='ensemble')

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

        if self._is_nifti_file(image_path):
            from .nifti import preprocess_volume
            samples, _ = preprocess_volume(image_path)
            tensor = torch.from_numpy(samples).permute(0, 3, 1, 2).float()
            tensor = tensor.unsqueeze(0).to(self.device)
        else:
            image = Image.open(image_path).convert('RGB')
            tensor = VALID_TRANSFORMS(image).unsqueeze(0).to(self.device)  # type: ignore

        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze()
        if probs.dim() == 0:
            probs = probs.unsqueeze(0)
        pred_idx = int(probs.argmax().item())
        confidence = float(probs[pred_idx].item())

        stage = StageMapper.get_stage(pred_idx)

        probabilities = StageMapper.format_probabilities(probs.tolist())

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
        }

    def predict_with_gradcam(self, image_path: str) -> Dict[str, Any]:
        result = self.predict(image_path)
        
        if result.get('success') is not False and self.model is not None:
            preview_path = image_path
            cleanup_path = None
            if self._is_nifti_file(image_path):
                cleanup_path = self._write_preview_png(image_path)
                if cleanup_path:
                    preview_path = cleanup_path

            try:
                gradcam_image = self.gradcam.generate(
                    self.model, preview_path, result['stage_index']
                )
            except Exception:
                gradcam_image = None
            finally:
                if cleanup_path and os.path.exists(cleanup_path):
                    os.remove(cleanup_path)

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
    def _is_nifti_file(path: str) -> bool:
        """
        Detect a NIfTI volume by filename extension OR by content sniffing
        (gzip magic / NIfTI magic). Content sniffing matters because the
        temp upload files may not carry the original extension.
        """
        low = str(path).lower()
        if low.endswith('.nii') or low.endswith('.nii.gz') or low.endswith('.nii.gz.tmp'):
            return True
        try:
            with open(path, 'rb') as f:
                magic = f.read(4)
        except OSError:
            return False
        if magic[:2] == b'\x1f\x8b' or magic[:1] == b'\x2b':
            return True
        if len(magic) == 4 and magic == b'\x6e\x2b\x31':
            return True
        return False

    def _write_preview_png(self, image_path: str) -> Optional[str]:
        """Render a 2D preview slice for NIfTI Grad-CAM overlays."""
        try:
            from .nifti import render_volume_preview

            preview_array = render_volume_preview(image_path, size=256)
            preview_img = Image.fromarray(preview_array, mode='L').convert('RGB')
            preview_path = f"{image_path}.preview.png"
            preview_img.save(preview_path)
            return preview_path
        except Exception:
            return None

    @staticmethod
    def _infer_num_classes(state: Dict[str, Any]) -> Optional[int]:
        for key in ('classifier.weight', 'fc.weight', 'backbone.fc.weight', 'fc.0.weight'):
            if key in state:
                weight = state[key]
                if hasattr(weight, 'ndim') and weight.ndim == 2:
                    return int(weight.shape[0])
        return None



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
