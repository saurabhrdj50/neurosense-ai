
import os, sys, random, glob, time, json
from typing import Tuple, Dict, Any, List, Optional
import numpy as np
import torch
import torch.nn as nn
from monai.networks.nets import resnet18 as monai_resnet18

# ==========================================
# 2. CENTRAL EDITABLE CONFIGURATION (VERSION 2)
# ==========================================
# All configurable hyperparameters live here — never hard-code values elsewhere.
EPOCHS: int = 15
LEARNING_RATE: float = 1e-4
WEIGHT_DECAY: float = 1e-2             # AdamW weight decay regularization
ARCHITECTURE: str = "MONAI_3D_ResNet18_TransferLearning"

# ==========================================
# TRANSFER LEARNING CONFIGURATION (V2)
# ==========================================
USE_PRETRAINED: bool = True            # Set False to disable transfer learning (100% V1 baseline behavior)
PRETRAINED_SOURCE: str = "MedicalNet"   # Source of pretrained 3D weights ("MedicalNet" via MONAI)
FREEZE_BACKBONE: bool = True           # Freeze early backbone layers (conv1, bn1, layer1, layer2)
UNFREEZE_LAST_BLOCKS: bool = True      # Unfreeze layer3 & layer4 for fine-tuning when FREEZE_BACKBONE=True

BATCH_SIZE_OVERRIDE: Optional[int] = None  # Set integer e.g., 4 to override hardware report
GRADIENT_ACCUMULATION_STEPS: int = 1      # Accumulate gradients over N batches
EARLY_STOPPING_PATIENCE: int = 5          # Epochs without improvement before stopping
EARLY_STOPPING_MIN_DELTA: float = 1e-4    # Minimum improvement threshold
USE_AMP: bool = True                       # Automatic Mixed Precision acceleration
USE_CACHE: bool = True                     # Copy/Unzip dataset to local SSD (/content/dataset_cache) in Colab
CLEAN_CACHE_AFTER_TRAINING: bool = False   # Optionally remove local SSD cache after training completes
SMOKE_TEST: bool = True                    # Set True for rapid pipeline validation (truncated splits)
SEED: int = 42
CHECKPOINT_DIR: str = "./Training_Outputs"
OUTPUT_DIR: str = "./Training_Outputs"

# Reproducibility & Determinism
os.environ["PYTHONHASHSEED"] = str(SEED)
random.seed(SEED)
np.random.seed(SEED)
import torch
torch.manual_seed(SEED)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(SEED)
    torch.backends.cudnn.deterministic = True
    torch.backends.cudnn.benchmark = False

os.makedirs(CHECKPOINT_DIR, exist_ok=True)
os.makedirs(os.path.join(OUTPUT_DIR, "Figures"), exist_ok=True)

print(f"[CONFIG] Initialized Version 2 Pipeline Configuration (SEED={SEED}).")
print(f"  - Transfer Learning Enabled: {USE_PRETRAINED} (Source: '{PRETRAINED_SOURCE}')")
print(f"  - Freeze Backbone:           {FREEZE_BACKBONE} (Unfreeze Last Blocks: {UNFREEZE_LAST_BLOCKS})")

DEVICE = torch.device('cpu')
NUM_CLASSES = 3
CLASS_NAMES = ['CN', 'MCI', 'AD']

# ==========================================
# 11. 3D DEEP LEARNING MODEL ARCHITECTURE & PRETRAINED WEIGHT LOADING
# ==========================================
import torch.nn as nn
from monai.networks.nets import resnet18 as monai_resnet18

class ADNI3DResNetClassifier(nn.Module):
    # 3D ResNet-18 Classifier with MONAI Backbone for ADNI MRI volumes
    def __init__(self, num_classes: int = 3, spatial_dims: int = 3, in_channels: int = 1, dropout_prob: float = 0.3, shortcut_type: str = 'B', bias_downsample: bool = False):
        super().__init__()
        self.backbone = monai_resnet18(
            spatial_dims=spatial_dims,
            n_input_channels=in_channels,
            num_classes=512,
            shortcut_type=shortcut_type,
            bias_downsample=bias_downsample
        )
        self.classifier = nn.Sequential(
            nn.Dropout(dropout_prob),
            nn.Linear(512, 128),
            nn.ReLU(inplace=True),
            nn.Dropout(dropout_prob),
            nn.Linear(128, num_classes)
        )
        
    def forward(self, x: torch.Tensor) -> torch.Tensor:
        features = self.backbone(x)
        logits = self.classifier(features)
        return logits

def load_pretrained_medical_weights(model: nn.Module, pretrained_source: str = "MedicalNet") -> Dict[str, Any]:
    # Safely loads 3D MedicalNet pretrained weights into the matching backbone layers
    if pretrained_source == "MedicalNet":
        print(f"[TRANSFER LEARNING] Loading 3D MedicalNet pretrained weights ('{pretrained_source}')...")
        # Instantiate pretrained MONAI ResNet-18 model (downloads MedicalNet 23-dataset checkpoint resnet_18_23dataset.pth)
        pre_model = monai_resnet18(pretrained=True, spatial_dims=3, n_input_channels=1, feed_forward=False, shortcut_type='A', bias_downsample=True)
        pre_state = pre_model.state_dict()
    else:
        raise ValueError(f"Unsupported PRETRAINED_SOURCE: '{pretrained_source}'")

    model_state = model.state_dict()
    
    matched_state = {}
    loaded_param_count = 0
    unexpected_keys = []
    
    for k, v in pre_state.items():
        target_k = f"backbone.{k}" if f"backbone.{k}" in model_state else k
        if target_k in model_state:
            if model_state[target_k].shape == v.shape:
                matched_state[target_k] = v
                loaded_param_count += v.numel()
            else:
                unexpected_keys.append(f"{k} (shape mismatch: {v.shape} vs {model_state[target_k].shape})")
        else:
            unexpected_keys.append(k)
            
    missing_keys = [k for k in model_state.keys() if k not in matched_state]
    
    # Update and load state dict
    model_state.update(matched_state)
    model.load_state_dict(model_state)
    
    total_model_params = sum(p.numel() for p in model.parameters())
    pct_loaded = (loaded_param_count / total_model_params) * 100.0
    
    print("\nLoaded pretrained weights")
    print(f"Loaded parameters : {loaded_param_count:,} ({pct_loaded:.2f}% of total model params)")
    print(f"Missing parameters : {len(missing_keys)} (classification head & unmatched layers)")
    print(f"Unexpected parameters : {len(unexpected_keys)}")
    
    return {
        "loaded_params": loaded_param_count,
        "missing_keys": len(missing_keys),
        "unexpected_keys": len(unexpected_keys),
        "pct_loaded": pct_loaded,
        "source_checkpoint": "resnet_18_23dataset.pth"
    }

# Model Instantiation
if USE_PRETRAINED:
    # MedicalNet weights require shortcut_type='A' and bias_downsample=True for architectural compatibility
    model = ADNI3DResNetClassifier(num_classes=NUM_CLASSES, shortcut_type='A', bias_downsample=True).to(DEVICE)
    weight_report = load_pretrained_medical_weights(model, pretrained_source=PRETRAINED_SOURCE)
else:
    model = ADNI3DResNetClassifier(num_classes=NUM_CLASSES, shortcut_type='B', bias_downsample=False).to(DEVICE)
    weight_report = {
        "loaded_params": 0,
        "missing_keys": sum(1 for _ in model.state_dict()),
        "unexpected_keys": 0,
        "pct_loaded": 0.0,
        "source_checkpoint": "None (Random Initialization - V1 Baseline)"
    }
    print("[MODEL] Initialized MONAI 3D ResNet-18 from scratch (V1 Baseline).")

# Single forward pass test to verify architecture
dummy_tensor = torch.randn(2, 1, 64, 64, 64).to(DEVICE)
with torch.no_grad():
    dummy_out = model(dummy_tensor)

print(f"[MODEL CHECK] Output Logits Shape: {dummy_out.shape}")
del dummy_tensor, dummy_out
if torch.cuda.is_available():
    torch.cuda.empty_cache()

# ==========================================
# 12. FINE-TUNING LAYER STRATEGY & DIAGNOSTICS
# ==========================================
def apply_finetuning_strategy(model: nn.Module, freeze_backbone: bool = True, unfreeze_last_blocks: bool = True) -> Tuple[List[str], List[str], int, int]:
    # Configures layer-wise parameter freezing for transfer learning fine-tuning
    frozen_layers = []
    trainable_layers = []
    
    for name, param in model.named_parameters():
        if freeze_backbone:
            if "classifier" in name:
                param.requires_grad = True
                trainable_layers.append(name)
            elif ("layer3" in name or "layer4" in name) and unfreeze_last_blocks:
                param.requires_grad = True
                trainable_layers.append(name)
            else:
                param.requires_grad = False
                frozen_layers.append(name)
        else:
            param.requires_grad = True
            trainable_layers.append(name)
            
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    
    return frozen_layers, trainable_layers, trainable_params, total_params

if USE_PRETRAINED:
    frozen_layers, trainable_layers, trainable_params, total_params = apply_finetuning_strategy(
        model, freeze_backbone=FREEZE_BACKBONE, unfreeze_last_blocks=UNFREEZE_LAST_BLOCKS
    )
else:
    # Baseline v1 behavior: all parameters trainable
    for param in model.parameters():
        param.requires_grad = True
    frozen_layers = []
    trainable_layers = [name for name, _ in model.named_parameters()]
    trainable_params = sum(p.numel() for p in model.parameters())
    total_params = trainable_params

frozen_params = total_params - trainable_params
pct_trainable = (trainable_params / total_params) * 100.0

# Print Comprehensive Diagnostics Box (Task 5)
print("\n" + "=" * 55)
print("       TRANSFER LEARNING DIAGNOSTICS & SUMMARY")
print("=" * 55)
print(f"Transfer Learning Status : {'Enabled' if USE_PRETRAINED else 'Disabled (V1 Baseline)'}")
print(f"Pretrained Source        : {PRETRAINED_SOURCE if USE_PRETRAINED else 'None'}")
print(f"Loaded Checkpoint        : {weight_report['source_checkpoint']}")
print(f"Backbone Frozen          : {FREEZE_BACKBONE if USE_PRETRAINED else False}")
print(f"Unfreeze Last Blocks     : {UNFREEZE_LAST_BLOCKS if USE_PRETRAINED else False}")
print(f"Frozen Layers            : {', '.join(sorted(list(set(n.split('.')[1] for n in frozen_layers)))) if frozen_layers else 'None'}")
print(f"Trainable Layers         : {', '.join(sorted(list(set(n.split('.')[1] for n in trainable_layers))))}")
print(f"Loaded Parameters        : {weight_report['loaded_params']:,} ({weight_report['pct_loaded']:.2f}% loaded)")
print(f"Trainable Parameters     : {trainable_params:,} ({pct_trainable:.2f}% trainable)")
print(f"Frozen Parameters        : {frozen_params:,} ({100.0 - pct_trainable:.2f}% frozen)")
print(f"Total Parameters         : {total_params:,}")
print("=" * 55 + "\n")
