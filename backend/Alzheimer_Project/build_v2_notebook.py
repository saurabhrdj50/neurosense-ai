import json
import os
import copy

v1_notebook_path = "d:/neurosense-ai/backend/Alzheimer_Project/Notebooks/ADNI_MRI_Classifier_Training.ipynb"
v2_notebook_path = "d:/neurosense-ai/backend/Alzheimer_Project/Notebooks/ADNI_MRI_Classifier_Training_v2.ipynb"

with open(v1_notebook_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

cells = nb["cells"]
print(f"Loaded baseline notebook with {len(cells)} cells.")

# ==========================================
# 1. CELL 1 (Header Markdown)
# ==========================================
v2_header_md = """# ADNI 3D MRI Alzheimer's Diagnostic Classifier (Version 2)
### End-to-End Deep Learning Pipeline with 3D Medical Transfer Learning (MedicalNet ResNet-18)

> [!WARNING]
> **RESEARCH & EDUCATIONAL DISCLAIMER**  
> This notebook and its generated model weights are intended solely for academic research, algorithmic benchmarking, and educational evaluation on the Alzheimer's Disease Neuroimaging Initiative (ADNI) cohort.  
> **This pipeline is NOT a certified medical device and must NOT be used for primary clinical diagnosis or treatment planning.**

---

## What's New in Version 2 (Transfer Learning)

Version 2 introduces **3D Medical Transfer Learning** using pretrained weights from **MedicalNet** (trained on 23 3D medical imaging datasets).

- **Task 1: Pretrained Weights**: Officially supported MONAI / MedicalNet 3D ResNet-18 pretrained weights (`resnet_18_23dataset.pth`).
- **Task 2: Optional Configuration**: Controlled via `USE_PRETRAINED = True` (set `False` to restore Version 1 baseline behavior).
- **Task 3: Safe Weight Loading**: Automatic state-dict mapping with reports for loaded parameters, missing keys, unexpected keys, and percentage loaded.
- **Task 4: Fine-Tuning Strategy**: Configurable freezing via `FREEZE_BACKBONE` (freezes `conv1`, `bn1`, `layer1`, `layer2`) and `UNFREEZE_LAST_BLOCKS` (trains `layer3`, `layer4`, classifier head).
- **Task 5: Diagnostics Box**: Comprehensive notebook diagnostics reporting pretrained source, loaded parameters, frozen layers, and trainable parameters.
- **Task 6: Baseline Compatibility**: 100% identical to Version 1 when `USE_PRETRAINED = False`.
- **Task 7: Comparison Report**: Exports metric comparisons for `BASELINE_VS_V2.md`.

---

## Pipeline Overview

| Cell | Section | Description |
|------|---------|-------------|
| 1 | Environment Setup | Installs packages, mounts Google Drive |
| 2 | Central Configuration | **Edit here** — Hyperparameters & Transfer Learning toggles |
| 3 | Report-Driven Config | Auto-reads profiler JSON to set batch size & workers |
| 4 | Dataset Validation | Validates audit JSON before training starts |
| 5 | SSD Caching | Unzips dataset to fast local storage (/content/) |
| 6 | Metadata & Class Breakdown | Reads ADNI_labels.csv, computes class distribution |
| 7 | Subject-Level Split | Stratified 70/15/15 split with zero data leakage |
| 8 | MONAI Transforms | 3D resampling, normalization, augmentation |
| 9 | Dataset & DataLoaders | PyTorch Dataset wrapping NIfTI files |
| 10 | Sanity Checks | Batch shape, NaN/Inf assertions, MRI slice preview |
| 11 | Model Architecture | 3D ResNet-18 with custom classification head & MedicalNet Transfer Learning |
| 12 | Fine-Tuning & Diagnostics | Layer freezing logic & Transfer Learning diagnostic summary |
| 13 | Class Weighting | Inverse-frequency loss weighting for class imbalance |
| 14 | Optimizer & Scheduler | AdamW + warmup cosine annealing + AMP GradScaler |
| 15 | Early Stopping & Resume | Auto-resumes from existing checkpoints if found |
| 16 | Training Loop | Per-epoch train/val with gradient accumulation |
| 17 | Test Evaluation | Held-out test set with full classification metrics |
| 18 | Figures | 7 diagnostic charts exported to Figures/ |
| 19 | Artifact Export | Metrics CSV/JSON, config JSON, optimizer states |
| 20 | Summary Report | PDF + JSON training summary + BASELINE_VS_V2.md generator |
| 21 | Inference Demo | Single-scan diagnostic inference example |
| 22 | Cache Cleanup | Optionally removes SSD cache to free disk space |
"""

cells[0]["source"] = [line + "\n" for line in v2_header_md.strip().split("\n")]
cells[0]["source"][-1] = cells[0]["source"][-1].rstrip("\n")

# ==========================================
# 2. CELL 3 (Central Configuration Code)
# ==========================================
v2_config_code = r"""# ==========================================
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
"""

cells[2]["source"] = [line + "\n" for line in v2_config_code.strip().split("\n")]
cells[2]["source"][-1] = cells[2]["source"][-1].rstrip("\n")

# Save script progress check
print("Successfully updated Cell 1 and Cell 3.")
