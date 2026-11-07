import logging
import torch
import torch.nn as nn
import torchvision.models as tv_models

logger = logging.getLogger(__name__)


class AlzheimerModel(nn.Module):
    """Research-grade Alzheimer's MRI Classifier.

    Production checkpoint (backend/app/models/alzheimer_model.pth) is a
    3-class ResNet18 (classifier [3, 512]) trained on the ADNI CN/MCI/AD
    lineage. Supports ResNet-18 and ResNet-50.
    """

    def __init__(self, num_classes: int = 3, architecture: str = 'resnet18') -> None:
        super().__init__()
        self.num_classes = num_classes
        self.architecture = architecture

        if architecture == 'resnet50':
            self.backbone = tv_models.resnet50(weights=None)
        else:
            self.backbone = tv_models.resnet18(weights=None)

        in_features = self.backbone.fc.in_features
        self.backbone.fc = nn.Identity()
        self.classifier = nn.Linear(in_features, num_classes)
        logger.info(
            "Initialized %s MRI model architecture (%d classes)",
            'ResNet-50' if architecture == 'resnet50' else 'ResNet-18',
            num_classes,
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        if x.dim() == 5:
            # Multi-slice 3D volume representation: [batch, slices, C, H, W]
            batch_size, num_slices, channels, height, width = x.shape
            features = self.backbone(
                x.reshape(batch_size * num_slices, channels, height, width)
            )
            features = features.reshape(batch_size, num_slices, -1).mean(dim=1)
        else:
            features = self.backbone(x)
        return self.classifier(features)
