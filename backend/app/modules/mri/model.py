import torch
import torch.nn as nn

try:
    import timm
    TIMM_AVAILABLE = True
except ImportError:
    TIMM_AVAILABLE = False
    timm = None


class AlzheimerModel(nn.Module):
    def __init__(self, num_classes: int = 4) -> None:
        super().__init__()
        if not TIMM_AVAILABLE or timm is None:
            raise ImportError("timm is required for MRI classification")
        
        self.backbone = timm.create_model(
            'efficientnet_b4',
            pretrained=False,
            num_classes=0
        )
        in_features = int(self.backbone.num_features)
        self.fc = nn.Linear(in_features, num_classes)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        x = self.backbone(x)
        x = self.fc(x)
        return x
