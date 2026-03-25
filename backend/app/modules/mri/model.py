import torch
import torch.nn as nn
import logging

logger = logging.getLogger(__name__)

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False
    timm = None


class AlzheimerModel(nn.Module):
    def __init__(self, num_classes: int = 4) -> None:
        super().__init__()
        self.num_classes = num_classes
        
        if not TIMM_AVAILABLE or timm is None:
            logger.warning("timm not available. Using fallback model.")
            self._use_fallback = True
            self._in_features = 1792
            self.fc = nn.Linear(self._in_features, num_classes)
            return
        
        self._use_fallback = False
        try:
            self.backbone = timm.create_model(
                'efficientnet_b4',
                pretrained=False,
                num_classes=0,
                in_chans=3,
            )
            self._in_features = self.backbone.num_features
            self.fc = nn.Linear(self._in_features, num_classes)
            logger.info("EfficientNet-B4 backbone initialized with %d features", self._in_features)
        except Exception as e:
            logger.error("Failed to create timm model: %s", e)
            self._use_fallback = True
            self._in_features = 1792
            self.fc = nn.Linear(self._in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self._use_fallback:
            x = torch.flatten(x, 1)
            x = self.fc(x)
            return x
        
        try:
            x = self.backbone(x)
            x = self.fc(x)
            return x
        except Exception as e:
            logger.error("Forward pass error: %s", e)
            x = torch.flatten(x, 1)
            x = self.fc(x)
            return x
