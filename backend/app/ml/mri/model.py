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
    Supports ResNet18, ResNet50, Swin Transformer, ConvNeXt V2, EfficientNetV2, and Vision Transformer architectures.
    Includes an ensemble soft-voting mode combining multiple deep backbones.

    The production checkpoint (backend/app/models/alzheimer_model.pth) is a
    3-class ResNet18 (classifier [3, 512]) trained on the ADNI CN/MCI/AD
    lineage, hence the default ``num_classes=3``.
    """
    def __init__(self, num_classes: int = 3, architecture: str = 'ensemble') -> None:
        super().__init__()
        self.num_classes = num_classes
        self.architecture = architecture
        self._use_fallback = False

        if architecture in ('resnet18', 'resnet50'):
            self.backbone = tv_models.resnet18(weights=None) if architecture == 'resnet18' else tv_models.resnet50(weights=None)
            in_features = self.backbone.fc.in_features
            self.backbone.fc = nn.Identity()
            self.classifier = nn.Linear(in_features, num_classes)
            self.fc = None
            logger.info("Initialized %s MRI model architecture", 'ResNet18' if architecture == 'resnet18' else 'ResNet-50')
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

        if self.architecture in ('resnet18', 'resnet50') and hasattr(self, 'backbone'):
            if x.dim() == 5:
                batch_size, num_slices, channels, height, width = x.shape
                features = self.backbone(
                    x.reshape(batch_size * num_slices, channels, height, width)
                )
                features = features.reshape(batch_size, num_slices, -1).mean(dim=1)
            else:
                features = self.backbone(x)
            return self.classifier(features)

        if self.architecture == 'ensemble' and hasattr(self, 'backbone_swin'):
            out_swin = self.backbone_swin(x)
            out_conv = self.backbone_convnext(x)
            out_eff = self.backbone_effnet(x)
            # Soft voting ensemble logits average
            return (out_swin + out_conv + out_eff) / 3.0

        # A forward-pass failure must propagate so inference returns a
        # structured error result. The previous fallback ran self.fc on raw
        # pixels — for the ensemble arch self.fc is None (TypeError) and for
        # timm backbones the feature dims don't match — masking the real
        # error with a confusing secondary crash.
        feat = self.backbone(x)
        return self.fc(feat)

