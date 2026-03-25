import logging
from typing import Dict, Any, Optional

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
    def __init__(self, model_path: str = 'models/alzheimer_model.pth') -> None:
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model: Optional[AlzheimerModel] = None
        self.model_path = model_path
        self.gradcam = GradCAMExtractor()
        self._load_model()

    def _load_model(self) -> None:
        try:
            self.model = AlzheimerModel(num_classes=4)
            state = torch.load(self.model_path, map_location=self.device, weights_only=False)
            if isinstance(self.model, torch.nn.Module):
                self.model.load_state_dict(state)
                logger.info("Loaded weights from %s", self.model_path)
        except FileNotFoundError:
            logger.warning("%s not found. Running with random weights.", self.model_path)
            if self.model is None:
                self.model = AlzheimerModel(num_classes=4)
        except Exception as e:
            logger.error("Error loading model: %s", e)
            if self.model is None:
                self.model = AlzheimerModel(num_classes=4)

        if self.model is not None:
            self.model.to(self.device)
            self.model.eval()

    @torch.no_grad()
    def predict(self, image_path: str) -> Dict[str, Any]:
        if self.model is None:
            return self._error_result()

        image = Image.open(image_path).convert('RGB')
        tensor = VALID_TRANSFORMS(image).unsqueeze(0).to(self.device)

        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze()
        pred_idx = int(probs.argmax().item())
        confidence = float(probs[pred_idx].item())

        stage = StageMapper.get_stage(pred_idx)

        return {
            'stage': stage.name,
            'stage_index': pred_idx,
            'label': stage.label,
            'confidence': round(confidence * 100, 2),
            'color': stage.color,
            'severity': stage.severity,
            'description': stage.description,
            'recommendations': stage.recommendations,
            'probabilities': StageMapper.format_probabilities(probs.tolist()),
        }

    def predict_with_gradcam(self, image_path: str) -> Dict[str, Any]:
        result = self.predict(image_path)
        
        if self.model is not None:
            gradcam_image = self.gradcam.generate(
                self.model, image_path, result['stage_index']
            )
            if gradcam_image:
                result['gradcam_image_base64'] = gradcam_image
        
        return result

    def _error_result(self) -> Dict[str, Any]:
        return {
            'stage': 'Error',
            'stage_index': 0,
            'label': 'Model not loaded',
            'confidence': 0,
            'color': '#6366f1',
            'severity': 0,
            'description': 'MRI classifier model could not be loaded.',
            'recommendations': ['Check model file and dependencies.'],
            'probabilities': {},
        }
