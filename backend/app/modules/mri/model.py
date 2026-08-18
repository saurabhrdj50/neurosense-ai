import torch
import torch.nn as nn
import logging
import torchvision.models as tv_models

logger = logging.getLogger(__name__)

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False
    timm = None


class AlzheimerModel(nn.Module):
    """
    Research-grade Alzheimer's MRI Classifier.
    Supports ResNet18, Swin Transformer, ConvNeXt V2, EfficientNetV2, and Vision Transformer architectures.
    Includes an ensemble soft-voting mode combining multiple deep backbones.
    """
    def __init__(self, num_classes: int = 4, architecture: str = 'ensemble') -> None:
        super().__init__()
        self.num_classes = num_classes
        self.architecture = architecture
        self._use_fallback = False

        if architecture == 'resnet18':
            self.backbone = tv_models.resnet18(weights=None)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Sequential(
                nn.Linear(in_features, 256),
                nn.ReLU(),
                nn.Dropout(0.4),
                nn.Linear(256, num_classes)
            )
            self.fc = None
            logger.info("Initialized ResNet18 MRI model architecture")
            return

        if not TIMM_AVAILABLE or timm is None:
            logger.warning("timm not available. Using linear fallback model.")
            self._use_fallback = True
            self._in_features = 1792
            self.fc = nn.Linear(self._in_features, num_classes)
            return

        try:
            if architecture == 'swin':
                self.backbone = timm.create_model('swin_base_patch4_window7_224', pretrained=False, num_classes=0, in_chans=3)
            elif architecture == 'convnext':
                self.backbone = timm.create_model('convnextv2_tiny', pretrained=False, num_classes=0, in_chans=3)
            elif architecture == 'vit':
                self.backbone = timm.create_model('vit_base_patch16_224', pretrained=False, num_classes=0, in_chans=3)
            elif architecture == 'efficientnetv2' or architecture == 'efficientnet_b4':
                self.backbone = timm.create_model('efficientnet_b4', pretrained=False, num_classes=0, in_chans=3)
            elif architecture == 'ensemble':
                # Create Swin, ConvNeXt V2, and EfficientNetV2 sub-backbones
                self.backbone_swin = timm.create_model('swin_base_patch4_window7_224', pretrained=False, num_classes=num_classes, in_chans=3)
                self.backbone_convnext = timm.create_model('convnextv2_tiny', pretrained=False, num_classes=num_classes, in_chans=3)
                self.backbone_effnet = timm.create_model('efficientnet_b4', pretrained=False, num_classes=num_classes, in_chans=3)
                self.fc = None
                logger.info("Initialized Swin + ConvNeXt V2 + EfficientNet Ensemble")
                return
            else:
                self.backbone = timm.create_model('efficientnet_b4', pretrained=False, num_classes=0, in_chans=3)

            self._in_features = getattr(self.backbone, 'num_features', 1792)
            self.fc = nn.Linear(self._in_features, num_classes)
            logger.info("MRI backbone '%s' initialized with %d features", architecture, self._in_features)

        except Exception as e:
            logger.error("Failed to create timm model for '%s', using EfficientNet fallback: %s", architecture, e)
            try:
                self.backbone = timm.create_model('efficientnet_b4', pretrained=False, num_classes=0, in_chans=3)
                self._in_features = self.backbone.num_features
                self.fc = nn.Linear(self._in_features, num_classes)
            except Exception as e2:
                logger.error("Fallback creation failed: %s", e2)
                self._use_fallback = True
                self._in_features = 1792
                self.fc = nn.Linear(self._in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if self._use_fallback:
            x = torch.flatten(x, 1)
            return self.fc(x)

        if self.architecture == 'resnet18' and hasattr(self, 'backbone'):
            return self.backbone(x)

        if self.architecture == 'ensemble' and hasattr(self, 'backbone_swin'):
            try:
                out_swin = self.backbone_swin(x)
                out_conv = self.backbone_convnext(x)
                out_eff = self.backbone_effnet(x)
                # Soft voting ensemble logits average
                return (out_swin + out_conv + out_eff) / 3.0
            except Exception as e:
                logger.error("Ensemble forward pass failed, using single backbone: %s", e)
                if hasattr(self, 'backbone_effnet'):
                    return self.backbone_effnet(x)
                x = torch.flatten(x, 1)
                return self.fc(x)

        try:
            feat = self.backbone(x)
            return self.fc(feat)
        except Exception as e:
            logger.error("Forward pass error: %s", e)
            x = torch.flatten(x, 1)
            return self.fc(x)

