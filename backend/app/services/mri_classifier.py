"""
MRI Classifier Module
Uses the trained alzheimer_model.pth (EfficientNet-B4 backbone via timm)
to classify Alzheimer's stages from MRI brain images.
"""

from __future__ import annotations

import io
import base64
import logging
from typing import Dict, Any, Optional

import torch
import torch.nn as nn
import torch.nn.functional as F
from torchvision import transforms
from PIL import Image
import numpy as np

logger = logging.getLogger(__name__)

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False
    logger.warning("timm not installed — MRI classification disabled.")


class AlzheimerModel(nn.Module):
    """EfficientNet-B4 based MRI classifier for Alzheimer's staging."""
    
    def __init__(self, num_classes: int = 4) -> None:
        super().__init__()
        if not TIMM_AVAILABLE:
            raise ImportError("timm is required for MRI classification")
        
        self.backbone = timm.create_model(
            'efficientnet_b4', pretrained=False, num_classes=0
        )
        # timm models return num_features attribute
        in_features: int = int(self.backbone.num_features)  # type: ignore[assignment]
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.fc(x)
        return x


STAGES: Dict[int, Dict[str, Any]] = {
    0: {
        'name': 'Non-Demented',
        'label': 'No Alzheimer\'s Detected',
        'color': '#22c55e',
        'severity': 0,
        'description': (
            'No significant cognitive decline detected. '
            'Brain structure appears normal for the patient\'s age group.'
        ),
        'recommendations': [
            'Continue regular cognitive health check-ups',
            'Maintain an active lifestyle and healthy diet',
            'Engage in mentally stimulating activities',
            'Monitor for any changes in memory or behaviour',
        ],
    },
    1: {
        'name': 'Very Mild Demented',
        'label': 'Very Mild Cognitive Impairment',
        'color': '#eab308',
        'severity': 1,
        'description': (
            'Very subtle cognitive changes detected. '
            'Minor memory lapses may be present, often attributed to normal ageing.'
        ),
        'recommendations': [
            'Schedule a full neurological evaluation',
            'Start cognitive training exercises',
            'Consider Mediterranean diet',
            'Increase social engagement and physical activity',
        ],
    },
    2: {
        'name': 'Mild Demented',
        'label': 'Mild Alzheimer\'s Disease',
        'color': '#f97316',
        'severity': 2,
        'description': (
            'Mild cognitive impairment detected. '
            'Memory loss and confusion may begin to affect daily activities.'
        ),
        'recommendations': [
            'Immediate consultation with a neurologist',
            'Consider medication options (cholinesterase inhibitors)',
            'Begin structured cognitive rehabilitation',
            'Establish caregiver support system',
        ],
    },
    3: {
        'name': 'Moderate Demented',
        'label': 'Moderate Alzheimer\'s Disease',
        'color': '#ef4444',
        'severity': 3,
        'description': (
            'Moderate cognitive decline detected. '
            'Significant memory loss and functional impairment are likely present.'
        ),
        'recommendations': [
            'Urgent specialist referral required',
            'Comprehensive care plan with caregiver training',
            'Evaluate safety at home — wandering risk assessment',
            'Begin music and art therapy programs',
        ],
    },
}


VALID_TRANSFORMS = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(
        mean=[0.485, 0.456, 0.406],
        std=[0.229, 0.224, 0.225],
    ),
])


class MRIClassifier:
    """Wraps the trained AlzheimerModel for inference."""

    def __init__(self, model_path: str = 'models/alzheimer_model.pth') -> None:
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.model: Optional[AlzheimerModel] = None
        self.model_path = model_path
        self._load_model()

    def _load_model(self) -> None:
        """Load the PyTorch model."""
        try:
            self.model = AlzheimerModel(num_classes=4)
            state = torch.load(self.model_path, map_location=self.device, weights_only=False)
            if isinstance(self.model, nn.Module):
                self.model.load_state_dict(state)
                logger.info("Loaded weights from %s", self.model_path)
        except FileNotFoundError:
            logger.warning(
                "%s not found. Running with random weights — place your trained .pth file in models/.",
                self.model_path,
            )
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
        """
        Run inference on a single MRI image.
        """
        if self.model is None:
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

        image = Image.open(image_path).convert('RGB')
        tensor = VALID_TRANSFORMS(image)
        tensor = tensor.unsqueeze(0).to(self.device)  # type: ignore[union-attr]

        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze()
        pred_idx = int(probs.argmax().item())
        confidence = float(probs[pred_idx].item())

        stage_info = STAGES[pred_idx]

        all_probs = {
            STAGES[i]['name']: round(float(probs[i].item()) * 100, 2)
            for i in range(4)
        }

        return {
            'stage': stage_info['name'],
            'stage_index': pred_idx,
            'label': stage_info['label'],
            'confidence': round(confidence * 100, 2),
            'color': stage_info['color'],
            'severity': stage_info['severity'],
            'description': stage_info['description'],
            'recommendations': stage_info['recommendations'],
            'probabilities': all_probs,
        }

    def predict_with_gradcam(self, image_path: str) -> Dict[str, Any]:
        """
        Run inference AND produce a Grad-CAM heatmap overlay.
        """
        if self.model is None:
            result = self.predict(image_path)
            result['gradcam_image_base64'] = None
            return result

        image = Image.open(image_path).convert('RGB')
        original_size = image.size
        tensor = VALID_TRANSFORMS(image)
        tensor = tensor.unsqueeze(0).to(self.device)
        tensor.requires_grad_(True)

        target_layer = None
        for module in reversed(list(self.model.modules())):
            if isinstance(module, nn.Conv2d):
                target_layer = module
                break

        if target_layer is None:
            result = self.predict(image_path)
            result['gradcam_image_base64'] = None
            return result

        activations = []
        gradients = []

        def fwd_hook(m: nn.Module, inp: Any, out: torch.Tensor) -> None:
            activations.append(out.detach())

        def bwd_hook(m: nn.Module, gi: Any, go: torch.Tensor) -> None:
            gradients.append(go[0].detach())

        fwd_handle = target_layer.register_forward_hook(fwd_hook)
        bwd_handle = target_layer.register_full_backward_hook(bwd_hook)

        self.model.eval()
        logits = self.model(tensor)
        probs = torch.softmax(logits, dim=1).squeeze()
        pred_idx = int(probs.argmax().item())
        confidence = float(probs[pred_idx].item())

        self.model.zero_grad()
        logits[0, pred_idx].backward()

        fwd_handle.remove()
        bwd_handle.remove()

        act = activations[0].squeeze(0)
        grad = gradients[0].squeeze(0)
        weights = grad.mean(dim=(1, 2))
        cam = (weights[:, None, None] * act).sum(dim=0)
        cam = F.relu(cam)
        cam = cam - cam.min()
        max_val = cam.max()
        if max_val > 0:
            cam = cam / max_val
        cam_np = cam.cpu().numpy()

        cam_resized = np.array(
            Image.fromarray((cam_np * 255).astype(np.uint8)).resize(
                original_size, Image.BILINEAR  # type: ignore[attr-defined]
            )
        ) / 255.0

        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        import matplotlib.cm as cm

        colormap = cm.get_cmap('jet')
        heatmap = colormap(cam_resized)[:, :, :3]
        original_np = np.array(image.resize(original_size)) / 255.0

        overlay = 0.55 * original_np + 0.45 * heatmap
        overlay = np.clip(overlay, 0, 1)

        fig, ax = plt.subplots(1, 1, figsize=(5, 5), dpi=100)
        ax.imshow(overlay)
        ax.axis('off')
        fig.tight_layout(pad=0)
        buf = io.BytesIO()
        fig.savefig(buf, format='png', bbox_inches='tight', pad_inches=0, dpi=100)
        plt.close(fig)
        buf.seek(0)
        b64 = base64.b64encode(buf.read()).decode('utf-8')

        stage_info = STAGES[pred_idx]
        all_probs = {
            STAGES[i]['name']: round(float(probs[i].item()) * 100, 2)
            for i in range(4)
        }

        return {
            'stage': stage_info['name'],
            'stage_index': pred_idx,
            'label': stage_info['label'],
            'confidence': round(confidence * 100, 2),
            'color': stage_info['color'],
            'severity': stage_info['severity'],
            'description': stage_info['description'],
            'recommendations': stage_info['recommendations'],
            'probabilities': all_probs,
            'gradcam_image_base64': b64,
        }
