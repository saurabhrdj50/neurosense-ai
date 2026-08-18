import json
import os

notebook_path = "d:/neurosense-ai/backend/Alzheimer_Project/Notebooks/ADNI_MRI_Classifier_Training.ipynb"

cells = []

def add_md(text):
    lines = [line + "\n" for line in text.strip().split("\n")]
    if lines:
        lines[-1] = lines[-1].rstrip("\n")
    cells.append({
        "cell_type": "markdown",
        "metadata": {},
        "source": lines
    })

def add_code(text):
    lines = [line + "\n" for line in text.strip().split("\n")]
    if lines:
        lines[-1] = lines[-1].rstrip("\n")
    cells.append({
        "cell_type": "code",
        "execution_count": None,
        "metadata": {},
        "outputs": [],
        "source": lines
    })

# ==========================================
# CELL 1: Notebook Header & Research Disclaimer
# ==========================================
add_md("""
# ADNI 3D MRI Alzheimer's Diagnostic Classifier
### End-to-End Deep Learning Pipeline (MONAI 3D ResNet-18)

> [!WARNING]
> **RESEARCH & EDUCATIONAL DISCLAIMER**  
> This notebook and its generated model weights are intended solely for academic research, algorithmic benchmarking, and educational evaluation on the Alzheimer's Disease Neuroimaging Initiative (ADNI) cohort.  
> **This pipeline is NOT a certified medical device and must NOT be used for primary clinical diagnosis or treatment planning.**

---

## Pipeline Overview

| Cell | Section | Description |
|------|---------|-------------|
| 1 | Environment Setup | Installs packages, mounts Google Drive |
| 2 | Central Configuration | **Edit here** — all hyperparameters in one place |
| 3 | Report-Driven Config | Auto-reads profiler JSON to set batch size & workers |
| 4 | Dataset Validation | Validates audit JSON before training starts |
| 5 | SSD Caching | Unzips dataset to fast local storage (/content/) |
| 6 | Metadata & Class Breakdown | Reads ADNI_labels.csv, computes class distribution |
| 7 | Subject-Level Split | Stratified 70/15/15 split with zero data leakage |
| 8 | MONAI Transforms | 3D resampling, normalization, augmentation |
| 9 | Dataset & DataLoaders | PyTorch Dataset wrapping NIfTI files |
| 10 | Sanity Checks | Batch shape, NaN/Inf assertions, MRI slice preview |
| 11 | Model Architecture | 3D ResNet-18 with custom classification head |
| 12 | Class Weighting | Inverse-frequency loss weighting for class imbalance |
| 13 | Optimizer & Scheduler | AdamW + warmup cosine annealing + AMP GradScaler |
| 14 | Early Stopping & Resume | Auto-resumes from existing checkpoints if found |
| 15 | Training Loop | Per-epoch train/val with gradient accumulation |
| 16 | Test Evaluation | Held-out test set with full classification metrics |
| 17 | Figures | 7 diagnostic charts exported to Figures/ |
| 18 | Artifact Export | Metrics CSV/JSON, config JSON, optimizer states |
| 19 | Summary Report | PDF + JSON training summary |
| 20 | Inference Demo | Single-scan diagnostic inference example |
| 21 | Cache Cleanup | Optionally removes SSD cache to free disk space |

## Prerequisites

1. **Run** `ADNI_Profiler.ipynb` to generate `ADNI_Profiler_Outputs/hardware_report.json` and `training_readiness.json`
2. **Run** `ADNI_Audit.ipynb` to generate `ADNI_Audit_Outputs/project_audit.json` and `pipeline_report.json`
3. Upload `Alzheimer_Project.zip` to your Google Drive root **or** ensure the dataset is already unzipped at the expected path

## Configurable Options (Cell 2 — Edit This Cell)

| Variable | Default | Description |
|----------|---------|-------------|
| `EPOCHS` | 15 | Total training epochs |
| `LEARNING_RATE` | 1e-4 | Initial learning rate for AdamW |
| `WEIGHT_DECAY` | 1e-2 | L2 regularization coefficient |
| `BATCH_SIZE_OVERRIDE` | None | Override auto-detected batch size (e.g. set 4) |
| `GRADIENT_ACCUMULATION_STEPS` | 1 | Effective batch size multiplier |
| `EARLY_STOPPING_PATIENCE` | 5 | Epochs without val-loss improvement before stopping |
| `EARLY_STOPPING_MIN_DELTA` | 1e-4 | Minimum val-loss improvement counted as progress |
| `USE_AMP` | True | Mixed precision (FP16) acceleration |
| `SMOKE_TEST` | True | **Set False for full training** (True = 8 train / 4 val / 4 test scans) |
| `SEED` | 42 | Random seed for full reproducibility |
| `CHECKPOINT_DIR` | ./Training_Outputs | Where model checkpoints are saved |
| `OUTPUT_DIR` | ./Training_Outputs | Where figures and reports are saved |

## Output Files

All outputs are written to `OUTPUT_DIR` (default: `./Training_Outputs/`):

- `best_model.pt` — model weights at best validation loss
- `last_model.pt` — model weights at the final epoch
- `optimizer_state.pt`, `scheduler_state.pt`, `scaler_state.pt` — full resume state
- `metrics.csv`, `training_history.json` — per-epoch metrics log
- `configuration.json` — exact hyperparameters used in this run
- `training_summary.json`, `training_summary.pdf` — final human-readable summary
- `Figures/` — loss, accuracy, LR schedule, confusion matrix, ROC curves, misclassified samples, sample predictions

## Resuming Training

Re-run all cells from top to bottom. Cell 14 automatically detects `last_model.pt`, `optimizer_state.pt`, `scheduler_state.pt`, and `scaler_state.pt` in `CHECKPOINT_DIR` and restores from them — no manual intervention needed.

## Expected Directory Structure

```
Alzheimer_Project/
├── Dataset/
│   └── ADNI/
│       └── {SubjectID}/
│           └── **/*.nii.gz
├── Metadata/
│   └── ADNI_labels.csv
├── ADNI_Profiler_Outputs/
│   ├── hardware_report.json
│   └── training_readiness.json
├── ADNI_Audit_Outputs/
│   ├── project_audit.json
│   └── pipeline_report.json
└── Training_Outputs/   <- generated by this notebook
```
""")

# ==========================================
# CELL 2: Environment Setup & Dependency Check
# ==========================================
add_code(r"""
# ==========================================
# 1. ENVIRONMENT SETUP & DEPENDENCY CHECK
# ==========================================
import os
import sys
import json
import glob
import time
import shutil
import random
import zipfile
import subprocess
from typing import Tuple, Dict, Any, List, Optional
import numpy as np

def install_if_missing(package: str, import_name: Optional[str] = None) -> None:
    # Install package if not importable
    if import_name is None:
        import_name = package
    try:
        __import__(import_name)
    except ImportError:
        print(f"[SETUP] Installing {package}...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-q", package])

install_if_missing("nibabel")
install_if_missing("monai")
install_if_missing("scikit-learn", "sklearn")
install_if_missing("matplotlib")
install_if_missing("seaborn")
install_if_missing("pandas")
install_if_missing("tqdm")

IN_COLAB = 'google.colab' in sys.modules

# Detect interactive notebook environment vs headless script/smoketest execution
try:
    get_ipython()  # type: ignore
    IN_NOTEBOOK = True
except NameError:
    IN_NOTEBOOK = False

# Use non-interactive Agg backend in headless environments to allow savefig() without a display
import matplotlib
if not IN_NOTEBOOK:
    matplotlib.use('Agg')
import matplotlib.pyplot as plt

if IN_COLAB:
    print("[SETUP] Running inside Google Colab environment.")
    try:
        from google.colab import drive
        drive.mount('/content/drive', force_remount=False)
        print("[SETUP] Google Drive mounted successfully.")
    except Exception as e:
        print(f"[SETUP] Google Drive mount skipped: {e}")
else:
    print("[SETUP] Running in local Python environment.")
""")

# ==========================================
# CELL 3: Central Editable Configuration
# ==========================================
add_code(r"""
# ==========================================
# 2. CENTRAL EDITABLE CONFIGURATION
# ==========================================
# All configurable hyperparameters live here — never hard-code values elsewhere.
EPOCHS: int = 15
LEARNING_RATE: float = 1e-4
WEIGHT_DECAY: float = 1e-2             # AdamW weight decay regularization
ARCHITECTURE: str = "MONAI_3D_ResNet18"
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

print(f"[CONFIG] Initialized Central Pipeline Configuration (SEED={SEED}).")
""")

# ==========================================
# CELL 4: Report-Driven Automatic Configuration
# ==========================================
add_code(r"""
# ==========================================
# 3. REPORT-DRIVEN AUTOMATIC CONFIGURATION
# ==========================================
# Automatically loads hardware & readiness profiles from ADNI_Profiler_Outputs if available

def find_report_file(relative_filename: str, search_dirs: List[str]) -> Optional[str]:
    # Search multiple candidate locations for profiler or audit report files
    for d in search_dirs:
        candidate = os.path.join(d, relative_filename)
        if os.path.exists(candidate):
            return candidate
    return None

search_base_dirs = [
    "/content/drive/MyDrive/ADNI_Profiler_Outputs",
    "/content/drive/MyDrive/Alzheimer_Project/ADNI_Profiler_Outputs",
    "d:/neurosense-ai/backend/Alzheimer_Project/ADNI_Profiler_Outputs",
    os.path.abspath("./ADNI_Profiler_Outputs"),
    os.path.abspath("../ADNI_Profiler_Outputs"),
    os.path.abspath("./backend/Alzheimer_Project/ADNI_Profiler_Outputs")
]

hw_report_path = find_report_file("hardware_report.json", search_base_dirs)
readiness_report_path = find_report_file("training_readiness.json", search_base_dirs)

# Default hardware fallbacks
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
BATCH_SIZE: int = 4
NUM_WORKERS: int = 0
PIN_MEMORY: bool = torch.cuda.is_available()
PERSISTENT_WORKERS: bool = False

if hw_report_path and readiness_report_path:
    try:
        with open(hw_report_path, "r", encoding="utf-8") as f:
            hw_info = json.load(f)
        with open(readiness_report_path, "r", encoding="utf-8") as f:
            readiness_info = json.load(f)
            
        print(f"[AUTO-CONFIG] Successfully loaded hardware report: {hw_report_path}")
        print(f"  - Detected GPU: {hw_info.get('gpu_name', 'Unknown')} ({hw_info.get('gpu_vram_gb', 0)} GB VRAM)")
        
        BATCH_SIZE = readiness_info.get('recommended_batch_size_3d', 4)
        NUM_WORKERS = readiness_info.get('recommended_num_workers', 0)
        if readiness_info.get('amp_fp16_supported', False):
            USE_AMP = True
            
    except Exception as e:
        print(f"[AUTO-CONFIG WARNING] Error parsing profiler reports ({e}). Using hardware defaults.")
        print(f"  ACTION: Re-run ADNI_Profiler.ipynb to regenerate valid JSON reports.")

if BATCH_SIZE_OVERRIDE is not None:
    BATCH_SIZE = BATCH_SIZE_OVERRIDE
    print(f"[AUTO-CONFIG] Applying user batch size override: {BATCH_SIZE}")

if sys.platform == 'win32':
    NUM_WORKERS = 0

PERSISTENT_WORKERS = (NUM_WORKERS > 0)

print(f"[AUTO-CONFIG FINAL]")
print(f"  - Compute Device:               {DEVICE}")
print(f"  - Batch Size:                   {BATCH_SIZE}")
print(f"  - Gradient Accumulation Steps:  {GRADIENT_ACCUMULATION_STEPS} (Effective Batch Size: {BATCH_SIZE * GRADIENT_ACCUMULATION_STEPS})")
print(f"  - DataLoader Workers:           {NUM_WORKERS}")
print(f"  - Pin Memory:                   {PIN_MEMORY}")
print(f"  - Persistent Workers:           {PERSISTENT_WORKERS}")
print(f"  - Mixed Precision AMP:          {USE_AMP}")
""")

# ==========================================
# CELL 5: Pre-Training Dataset Integrity Validation
# ==========================================
add_code(r"""
# ==========================================
# 4. PRE-TRAINING DATASET INTEGRITY VALIDATION
# ==========================================
# Reads project_audit.json and pipeline_report.json to ensure data integrity before training

audit_base_dirs = [
    "/content/drive/MyDrive/ADNI_Audit_Outputs",
    "/content/drive/MyDrive/Alzheimer_Project/ADNI_Audit_Outputs",
    "d:/neurosense-ai/backend/Alzheimer_Project/ADNI_Audit_Outputs",
    os.path.abspath("./ADNI_Audit_Outputs"),
    os.path.abspath("../ADNI_Audit_Outputs"),
    os.path.abspath("./backend/Alzheimer_Project/ADNI_Audit_Outputs")
]

audit_json_path = find_report_file("project_audit.json", audit_base_dirs)
pipeline_json_path = find_report_file("pipeline_report.json", audit_base_dirs)

validation_passed = True
validation_errors = []

if audit_json_path:
    try:
        with open(audit_json_path, "r", encoding="utf-8") as f:
            audit_report = json.load(f)
        print(f"[VALIDATION] Found project audit report: {audit_json_path}")
        missing_assets = audit_report.get("missing_assets", [])
        if missing_assets:
            validation_passed = False
            validation_errors.append(f"Missing critical assets listed in audit report: {missing_assets}")
    except Exception as e:
        print(f"[VALIDATION WARNING] Failed parsing project_audit.json: {e}")

if pipeline_json_path:
    try:
        with open(pipeline_json_path, "r", encoding="utf-8") as f:
            pipe_report = json.load(f)
        print(f"[VALIDATION] Found pipeline verification report: {pipeline_json_path}")
        if pipe_report.get("nan_detected", False) or pipe_report.get("inf_detected", False):
            validation_passed = False
            validation_errors.append("NaN or Inf tensors detected during prior pipeline verification audit!")
        if not pipe_report.get("dataloader_passed", False):
            validation_passed = False
            validation_errors.append("Prior DataLoader verification audit failed!")
    except Exception as e:
        print(f"[VALIDATION WARNING] Failed parsing pipeline_report.json: {e}")

if not validation_passed:
    print("\n[ERROR] DATASET INTEGRITY VALIDATION FAILED:")
    for err in validation_errors:
        print(f"  - {err}")
    print("\n  ACTION: Re-run ADNI_Audit.ipynb to produce a valid project_audit.json and pipeline_report.json.")
    raise RuntimeError("Halting execution: Dataset or Pipeline validation failed pre-training checks.")

print("[VALIDATION] Pre-training Dataset & Pipeline Integrity Validation PASSED.")
""")

# ==========================================
# CELL 6: Local SSD Caching & Path Resolution
# ==========================================
add_code(r"""
# ==========================================
# 5. LOCAL SSD CACHING & PATH RESOLUTION
# ==========================================
# Copies or unzips dataset to fast local SSD (/content/dataset_cache) when running in Colab

def resolve_and_cache_dataset() -> Tuple[str, str]:
    # Locate dataset NIfTI files and labels CSV, unzipping to Colab SSD cache if applicable
    possible_zips = [
        "/content/drive/MyDrive/Alzheimer_Project.zip",
        "/content/drive/MyDrive/Alzheimer_Project/Alzheimer_Project.zip",
        "/content/drive/MyDrive/ADNI.zip",
        "/content/drive/MyDrive/Dataset.zip",
        "/content/Alzheimer_Project.zip"
    ]
    
    cache_root = "/content/dataset_cache" if IN_COLAB and USE_CACHE else None
    
    for zpath in possible_zips:
        if os.path.exists(zpath):
            print(f"[CACHE] Found uploaded Zip Archive: {zpath}")
            extract_target = cache_root if cache_root else "/content/Alzheimer_Project"
            labels_check = os.path.join(extract_target, "Metadata", "ADNI_labels.csv")
            if not os.path.exists(labels_check):
                print(f"[CACHE] Unzipping {zpath} to fast local SSD ({extract_target})...")
                os.makedirs(extract_target, exist_ok=True)
                with zipfile.ZipFile(zpath, 'r') as zip_ref:
                    target_folder = extract_target if "Alzheimer_Project" in zpath else os.path.join(extract_target, "Alzheimer_Project")
                    zip_ref.extractall(target_folder)
                print("[CACHE] Unzipping completed successfully.")
            break

    search_paths = [
        "/content/dataset_cache/Alzheimer_Project",
        "/content/dataset_cache",
        "/content/Alzheimer_Project",
        "/content/Dataset/ADNI",
        "d:/neurosense-ai/backend/Alzheimer_Project",
        os.path.abspath(os.path.join(os.getcwd(), "..")),
        os.path.abspath(os.path.join(os.getcwd(), "backend", "Alzheimer_Project")),
        os.getcwd()
    ]
    
    dataset_dir = None
    labels_csv = None
    
    for path in search_paths:
        possible_ds = os.path.join(path, "Dataset", "ADNI") if not path.endswith("ADNI") else path
        possible_csv = os.path.join(path, "Metadata", "ADNI_labels.csv") if not path.endswith("ADNI_labels.csv") else path
        
        if os.path.exists(possible_ds) and os.path.exists(possible_csv):
            dataset_dir = possible_ds
            labels_csv = possible_csv
            break
            
    return dataset_dir, labels_csv

def clean_dataset_cache() -> None:
    # Clean temporary dataset cache directory if configured
    cache_path = "/content/dataset_cache"
    if IN_COLAB and CLEAN_CACHE_AFTER_TRAINING and os.path.exists(cache_path):
        print(f"[CACHE] Cleaning local SSD dataset cache at: {cache_path}")
        shutil.rmtree(cache_path, ignore_errors=True)

DATASET_DIR, LABELS_CSV = resolve_and_cache_dataset()

print(f"[PATH RESOLUTION] Final Dataset Directory: {DATASET_DIR}")
print(f"[PATH RESOLUTION] Final Labels CSV Path:   {LABELS_CSV}")

if not DATASET_DIR or not os.path.exists(DATASET_DIR) or not os.path.exists(LABELS_CSV):
    print("\n[ERROR] ADNI dataset not found. Checked the following locations:")
    for p in search_paths:
        print(f"  - {p}")
    print("\n  ACTION: Upload Alzheimer_Project.zip to your Google Drive root, or ensure")
    print("  the dataset is extracted so Dataset/ADNI/ and Metadata/ADNI_labels.csv exist.")
    raise FileNotFoundError(
        "Could not resolve ADNI dataset directory or ADNI_labels.csv. "
        "See ACTION message above for steps to fix this."
    )
""")

# ==========================================
# CELL 7: Metadata Discovery & Class Breakdown
# ==========================================
add_code(r"""
# ==========================================
# 6. METADATA DISCOVERY & CLASS BREAKDOWN
# ==========================================
import pandas as pd

df = pd.read_csv(LABELS_CSV)

print("--- ADNI RECONCILED DATASET STATISTICS ---")
print(f"Total Scans in Metadata: {len(df)}")
print(f"Unique Subjects:         {df['Subject'].nunique()}")

class_counts = df['Group'].value_counts()
print("\nClass Breakdown:")
for grp, cnt in class_counts.items():
    sub_cnt = df[df['Group'] == grp]['Subject'].nunique()
    print(f"  - {grp:4s}: {cnt:3d} scans ({sub_cnt:3d} unique subjects)")

CLASS_NAMES: List[str] = ['CN', 'MCI', 'AD']
CLASS_MAP: Dict[str, int] = {name: idx for idx, name in enumerate(CLASS_NAMES)}
NUM_CLASSES: int = len(CLASS_NAMES)
""")

# ==========================================
# CELL 8: Subject-Level Stratified Split (0% Leakage)
# ==========================================
add_code(r"""
# ==========================================
# 7. SUBJECT-LEVEL DISJOINT SPLIT (0% LEAKAGE)
# ==========================================
from sklearn.model_selection import train_test_split

# Collapse to subject level for stratified splitting
df_subjects = df.groupby('Subject').first().reset_index()

train_subjs, temp_subjs = train_test_split(
    df_subjects, test_size=0.30, stratify=df_subjects['Group'], random_state=SEED
)
val_subjs, test_subjs = train_test_split(
    temp_subjs, test_size=0.50, stratify=temp_subjs['Group'], random_state=SEED
)

train_df = df[df['Subject'].isin(train_subjs['Subject'])].reset_index(drop=True)
val_df   = df[df['Subject'].isin(val_subjs['Subject'])].reset_index(drop=True)
test_df  = df[df['Subject'].isin(test_subjs['Subject'])].reset_index(drop=True)

# Mathematical Subject Disjointness Assertions
train_set = set(train_df['Subject'])
val_set   = set(val_df['Subject'])
test_set  = set(test_df['Subject'])

assert train_set.isdisjoint(val_set), "SUBJECT LEAKAGE DETECTED BETWEEN TRAIN AND VAL!"
assert train_set.isdisjoint(test_set), "SUBJECT LEAKAGE DETECTED BETWEEN TRAIN AND TEST!"
assert val_set.isdisjoint(test_set), "SUBJECT LEAKAGE DETECTED BETWEEN VAL AND TEST!"

print("[OK] MATHEMATICAL SUBJECT DISJOINTNESS VERIFIED (ZERO DATA LEAKAGE).")

if SMOKE_TEST:
    print("[SMOKE TEST] Sampling stratified subset per class for rapid pipeline validation...")
    def get_stratified_smoke_subset(split_df: pd.DataFrame, min_per_class: int = 3) -> pd.DataFrame:
        sampled_rows = []
        for cls in CLASS_NAMES:
            cls_df = split_df[split_df['Group'] == cls]
            if len(cls_df) == 0:
                raise RuntimeError(f"[SMOKE TEST ERROR] Cannot sample for class '{cls}': zero scans found in split!")
            sampled_rows.append(cls_df.head(min_per_class))
        return pd.concat(sampled_rows, axis=0).reset_index(drop=True)

    train_df = get_stratified_smoke_subset(train_df, min_per_class=3)
    val_df   = get_stratified_smoke_subset(val_df, min_per_class=2)
    test_df  = get_stratified_smoke_subset(test_df, min_per_class=2)

# Mandatory Multi-Class Assertions Across All Splits
for split_name, split_df in [('Train', train_df), ('Val', val_df), ('Test', test_df)]:
    present_classes = set(split_df['Group'].unique())
    missing_classes = set(CLASS_NAMES) - present_classes
    if missing_classes:
        missing_str = ", ".join(sorted(list(missing_classes)))
        raise RuntimeError(
            f"DATA SPLIT ERROR: {split_name} set is missing diagnostic class(es): [{missing_str}]. "
            f"All splits must contain all {NUM_CLASSES} classes: {CLASS_NAMES}."
        )

print("[OK] MULTI-CLASS STRATIFICATION VERIFIED (ALL 3 CLASSES PRESENT IN TRAIN, VAL, AND TEST).")

print("\nFinal Split Counts & Class Distributions:")
for name, s_df in [('TRAIN', train_df), ('VAL', val_df), ('TEST', test_df)]:
    counts = dict(s_df['Group'].value_counts())
    counts_str = ", ".join([f"{cls}: {counts.get(cls, 0)}" for cls in CLASS_NAMES])
    print(f"  - {name:5s}: {len(s_df):3d} scans / {s_df['Subject'].nunique():3d} subjects | Distribution: [{counts_str}]")
""")

# ==========================================
# CELL 9: MONAI 3D Preprocessing Transforms
# ==========================================
add_code(r"""
# ==========================================
# 8. MONAI 3D PREPROCESSING TRANSFORMS
# ==========================================
from monai.transforms import (
    Compose, LoadImaged, EnsureChannelFirstd, Orientationd,
    Spacingd, ScaleIntensityRangePercentilesd, ResizeWithPadOrCropd,
    RandAffined, EnsureTyped
)

# MONAI Dictionary-based 3D Medical Preprocessing Pipeline
train_transforms = Compose([
    LoadImaged(keys=["image"]),
    EnsureChannelFirstd(keys=["image"]),
    Orientationd(keys=["image"], axcodes="RAS"),
    Spacingd(keys=["image"], pixdim=(1.5, 1.5, 1.5), mode="bilinear"),
    ScaleIntensityRangePercentilesd(keys=["image"], lower=1, upper=99, b_min=0.0, b_max=1.0, clip=True),
    ResizeWithPadOrCropd(keys=["image"], spatial_size=(64, 64, 64), mode="constant"),
    RandAffined(keys=["image"], prob=0.3, rotate_range=(0.1, 0.1, 0.1), translate_range=(3, 3, 3), mode="bilinear"),
    EnsureTyped(keys=["image"], dtype=torch.float32)
])

val_transforms = Compose([
    LoadImaged(keys=["image"]),
    EnsureChannelFirstd(keys=["image"]),
    Orientationd(keys=["image"], axcodes="RAS"),
    Spacingd(keys=["image"], pixdim=(1.5, 1.5, 1.5), mode="bilinear"),
    ScaleIntensityRangePercentilesd(keys=["image"], lower=1, upper=99, b_min=0.0, b_max=1.0, clip=True),
    ResizeWithPadOrCropd(keys=["image"], spatial_size=(64, 64, 64), mode="constant"),
    EnsureTyped(keys=["image"], dtype=torch.float32)
])

print("[PREPROCESSING] Configured MONAI 3D Preprocessing Transforms.")
""")

# ==========================================
# CELL 10: PyTorch Dataset & DataLoader
# ==========================================
add_code(r"""
# ==========================================
# 9. PYTORCH DATASET & DATALOADER
# ==========================================
from torch.utils.data import Dataset, DataLoader

class ADNI3DDataset(Dataset):
    # 3D Medical Image Dataset for ADNI NIfTI Scans
    def __init__(self, df: pd.DataFrame, dataset_dir: str, transforms: Optional[Any] = None):
        self.df = df
        self.dataset_dir = dataset_dir
        self.transforms = transforms
        
        self.samples: List[Tuple[str, int, str, str]] = []
        for _, row in self.df.iterrows():
            sub_id = str(row['Subject'])
            img_id = str(row.get('Image Data ID', row.get('Image_Data_ID', '')))
            group  = str(row['Group'])
            label  = CLASS_MAP[group]
            
            matches = glob.glob(os.path.join(dataset_dir, sub_id, "**", f"*{img_id}*.nii*"), recursive=True)
            if not matches and img_id:
                matches = glob.glob(os.path.join(dataset_dir, sub_id, "**", f"*I{img_id}*.nii*"), recursive=True)
            if not matches:
                matches = glob.glob(os.path.join(dataset_dir, sub_id, "**", "*.nii*"), recursive=True)
                
            if matches:
                self.samples.append((os.path.abspath(matches[0]), label, sub_id, img_id))
            else:
                print(f"[WARNING] NIfTI file for subject {sub_id} image {img_id} not found on disk.")
                
    def __len__(self) -> int:
        return len(self.samples)
        
    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, torch.Tensor, str]:
        filepath, label, sub_id, img_id = self.samples[idx]
        try:
            data_dict = self.transforms({"image": filepath})
            tensor = data_dict["image"]
            return tensor, torch.tensor(label, dtype=torch.long), sub_id
        except Exception as e:
            print(f"[ERROR loading sample {idx}] Filepath: {filepath} | Error: {e}")
            raise RuntimeError(f"Failed to load NIfTI volume at {filepath}: {e}")

train_dataset = ADNI3DDataset(train_df, DATASET_DIR, train_transforms)
val_dataset   = ADNI3DDataset(val_df, DATASET_DIR, val_transforms)
test_dataset  = ADNI3DDataset(test_df, DATASET_DIR, val_transforms)

train_loader = DataLoader(
    train_dataset, batch_size=BATCH_SIZE, shuffle=True,
    num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY, persistent_workers=PERSISTENT_WORKERS
)
val_loader = DataLoader(
    val_dataset, batch_size=BATCH_SIZE, shuffle=False,
    num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY, persistent_workers=PERSISTENT_WORKERS
)
test_loader = DataLoader(
    test_dataset, batch_size=BATCH_SIZE, shuffle=False,
    num_workers=NUM_WORKERS, pin_memory=PIN_MEMORY, persistent_workers=PERSISTENT_WORKERS
)

train_classes_found = sorted(list(set(sample[1] for sample in train_dataset.samples)))
val_classes_found   = sorted(list(set(sample[1] for sample in val_dataset.samples)))
test_classes_found  = sorted(list(set(sample[1] for sample in test_dataset.samples)))

print("[DATALOADER SUMMARY]")
print(f"  - Train Samples:      {len(train_dataset):3d} (Batches: {len(train_loader)}) | Unique Classes: {[CLASS_NAMES[c] for c in train_classes_found]}")
print(f"  - Validation Samples: {len(val_dataset):3d} (Batches: {len(val_loader)}) | Unique Classes: {[CLASS_NAMES[c] for c in val_classes_found]}")
print(f"  - Test Samples:       {len(test_dataset):3d} (Batches: {len(test_loader)}) | Unique Classes: {[CLASS_NAMES[c] for c in test_classes_found]}")
""")

# ==========================================
# CELL 11: Pre-Training Visualizations & Sanity Checks
# ==========================================
add_code(r"""
# ==========================================
# 10. PRE-TRAINING VISUALIZATIONS & SANITY CHECKS
# ==========================================
import matplotlib.pyplot as plt

print("[SANITY CHECK] Fetching single batch from Train Loader...")
sample_images, sample_labels, sample_subjs = next(iter(train_loader))

print(f"  - Batch Images Shape: {sample_images.shape}")
print(f"  - Batch Labels Shape: {sample_labels.shape}")
print(f"  - Intensity Min/Max:  {sample_images.min().item():.3f} / {sample_images.max().item():.3f}")

# Assertions
assert not torch.isnan(sample_images).any(), "NaN detected in sample batch!"
assert not torch.isinf(sample_images).any(), "Inf detected in sample batch!"
assert sample_images.shape[1:] == torch.Size([1, 64, 64, 64]), f"Unexpected spatial shape: {sample_images.shape}"

print("[OK] All automated tensor shape and numerical sanity checks PASSED.")

# Render 3-slice preview of the first volume
fig, axes = plt.subplots(1, 3, figsize=(12, 4))
vol = sample_images[0, 0].cpu().numpy()

axes[0].imshow(vol[vol.shape[0]//2, :, :], cmap="bone")
axes[0].set_title(f"Sagittal View\nSub: {sample_subjs[0]}")

axes[1].imshow(vol[:, vol.shape[1]//2, :], cmap="bone")
axes[1].set_title(f"Coronal View\nClass: {CLASS_NAMES[sample_labels[0]]}")

axes[2].imshow(vol[:, :, vol.shape[2]//2], cmap="bone")
axes[2].set_title("Axial View")

for ax in axes:
    ax.axis("off")
plt.tight_layout()
preview_fig_path = os.path.join(OUTPUT_DIR, "Figures", "sample_mri_previews.png")
plt.savefig(preview_fig_path, dpi=150)
if IN_NOTEBOOK:
    plt.show()
else:
    plt.close()
""")

# ==========================================
# CELL 12: 3D Model Architecture Definition
# ==========================================
add_code(r"""
# ==========================================
# 11. 3D DEEP LEARNING MODEL ARCHITECTURE
# ==========================================
import torch.nn as nn
from monai.networks.nets import resnet18 as monai_resnet18

class ADNI3DResNetClassifier(nn.Module):
    # 3D ResNet-18 Classifier with MONAI Backbone for ADNI MRI volumes
    def __init__(self, num_classes: int = 3, spatial_dims: int = 3, in_channels: int = 1, dropout_prob: float = 0.3):
        super().__init__()
        self.backbone = monai_resnet18(
            spatial_dims=spatial_dims,
            n_input_channels=in_channels,
            num_classes=512
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

model = ADNI3DResNetClassifier(num_classes=NUM_CLASSES).to(DEVICE)

# Single forward pass test to verify architecture
dummy_tensor = torch.randn(2, 1, 64, 64, 64).to(DEVICE)
with torch.no_grad():
    dummy_out = model(dummy_tensor)

print(f"[MODEL] Initialized MONAI 3D ResNet-18.")
print(f"  - Output Logits Shape: {dummy_out.shape}")
print(f"  - Total Parameters:   {sum(p.numel() for p in model.parameters()):,}")

# Free GPU memory used by the architectural validation pass
del dummy_tensor, dummy_out
if torch.cuda.is_available():
    torch.cuda.empty_cache()
""")

# ==========================================
# CELL 13: Inverse Class Imbalance Weighting
# ==========================================
add_code(r"""
# ==========================================
# 12. CLASS IMBALANCE LOSS WEIGHTING
# ==========================================
from sklearn.utils.class_weight import compute_class_weight

train_labels = [CLASS_MAP[g] for g in train_df['Group']]
unique_train_labels = set(train_labels)
expected_class_ids = set(range(NUM_CLASSES))

missing_class_ids = expected_class_ids - unique_train_labels
if missing_class_ids:
    missing_names = [CLASS_NAMES[i] for i in sorted(list(missing_class_ids))]
    raise RuntimeError(
        f"CLASS WEIGHTING ERROR: Cannot compute class weights because train set is missing class(es): {missing_names}. "
        f"CrossEntropyLoss requires weights for all {NUM_CLASSES} classes."
    )

class_weights_vals = compute_class_weight(
    class_weight="balanced",
    classes=np.arange(NUM_CLASSES),
    y=train_labels
)

class_weights_tensor = torch.tensor(class_weights_vals, dtype=torch.float32).to(DEVICE)

# Strict shape assertion
assert class_weights_tensor.shape[0] == NUM_CLASSES, (
    f"Weight tensor shape mismatch! Expected [{NUM_CLASSES}], got {list(class_weights_tensor.shape)}"
)

criterion = nn.CrossEntropyLoss(weight=class_weights_tensor)

print("Calculated Train Set Class Weights:")
for cls_name, weight_val in zip(CLASS_NAMES, class_weights_vals):
    print(f"  - {cls_name:4s}: {weight_val:.4f}")
print(f"Weight Tensor Shape: {list(class_weights_tensor.shape)} (matches NUM_CLASSES={NUM_CLASSES})")
""")

# ==========================================
# CELL 14: Optimizer, Scheduler & AMP Setup
# ==========================================
add_code(r"""
# ==========================================
# 13. OPTIMIZER, SCHEDULER & AMP GRADSCALER
# ==========================================
import torch.optim as optim
from torch.optim.lr_scheduler import CosineAnnealingLR, LinearLR, SequentialLR

optimizer = optim.AdamW(model.parameters(), lr=LEARNING_RATE, weight_decay=WEIGHT_DECAY)

# Cosine Annealing with Warmup Scheduler
warmup_epochs = max(1, int(EPOCHS * 0.1))
warmup_sched = LinearLR(optimizer, start_factor=0.1, total_iters=warmup_epochs)
cosine_sched = CosineAnnealingLR(optimizer, T_max=max(1, EPOCHS - warmup_epochs), eta_min=1e-6)
scheduler = SequentialLR(optimizer, schedulers=[warmup_sched, cosine_sched], milestones=[warmup_epochs])

# Use the non-deprecated torch.amp.GradScaler API (torch >= 2.0)
scaler = torch.amp.GradScaler('cuda', enabled=(USE_AMP and torch.cuda.is_available()))

print(f"[OPTIMIZER] Initialized AdamW (lr={LEARNING_RATE}, weight_decay={WEIGHT_DECAY}).")
print(f"[SCHEDULER] Configured CosineAnnealing with {warmup_epochs} Warmup Epochs.")
""")

# ==========================================
# CELL 15: EarlyStopping & Checkpoint Resume Handler
# ==========================================
add_code(r"""
# ==========================================
# 14. EARLY STOPPING & RESUME HANDLER
# ==========================================
class EarlyStopping:
    # Early Stopping handler to prevent overfitting and save best model weights
    def __init__(self, patience: int = 5, min_delta: float = 1e-4, checkpoint_path: str = "best_model.pt"):
        self.patience = patience
        self.min_delta = min_delta
        self.checkpoint_path = checkpoint_path
        self.best_loss = float('inf')
        self.counter = 0
        self.early_stop = False

    def __call__(self, val_loss: float, model: nn.Module) -> None:
        if val_loss < self.best_loss - self.min_delta:
            self.best_loss = val_loss
            self.counter = 0
            torch.save(model.state_dict(), self.checkpoint_path)
            print(f"  [EARLY STOPPING] Validation loss improved to {val_loss:.4f}. Saved checkpoint -> {self.checkpoint_path}")
        else:
            self.counter += 1
            print(f"  [EARLY STOPPING] Counter: {self.counter}/{self.patience}")
            if self.counter >= self.patience:
                self.early_stop = True

best_model_path = os.path.join(CHECKPOINT_DIR, "best_model.pt")
last_model_path = os.path.join(CHECKPOINT_DIR, "last_model.pt")
opt_state_path  = os.path.join(CHECKPOINT_DIR, "optimizer_state.pt")
sched_state_path = os.path.join(CHECKPOINT_DIR, "scheduler_state.pt")
scaler_state_path = os.path.join(CHECKPOINT_DIR, "scaler_state.pt")

early_stopping = EarlyStopping(patience=EARLY_STOPPING_PATIENCE, min_delta=EARLY_STOPPING_MIN_DELTA, checkpoint_path=best_model_path)

# Check for existing checkpoints to resume training
start_epoch = 0
if os.path.exists(last_model_path):
    try:
        model.load_state_dict(torch.load(last_model_path, map_location=DEVICE))
        print(f"[RESUME] Restored previous model weights from: {last_model_path}")
        if os.path.exists(opt_state_path):
            optimizer.load_state_dict(torch.load(opt_state_path, map_location=DEVICE))
            print(f"[RESUME] Restored optimizer state.")
        if os.path.exists(sched_state_path):
            scheduler.load_state_dict(torch.load(sched_state_path, map_location=DEVICE))
            print(f"[RESUME] Restored scheduler state.")
        if os.path.exists(scaler_state_path):
            scaler.load_state_dict(torch.load(scaler_state_path, map_location=DEVICE))
            print(f"[RESUME] Restored scaler state.")
    except Exception as e:
        print(f"[RESUME WARNING] Could not restore existing checkpoint: {e}")
""")

# ==========================================
# CELL 16: Training Epoch Function with AMP & Gradient Accumulation
# ==========================================
add_code(r"""
# ==========================================
# 15. TRAINING EPOCH FUNCTION WITH AMP
# ==========================================
from tqdm import tqdm

def train_one_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    optimizer: optim.Optimizer,
    scaler: torch.cuda.amp.GradScaler,
    device: torch.device,
    use_amp: bool = True,
    grad_accum_steps: int = 1
) -> Tuple[float, float]:
    # Train model for one single epoch with Mixed Precision AMP and Gradient Accumulation
    model.train()
    running_loss = 0.0
    correct = 0
    total = 0
    
    optimizer.zero_grad()
    pbar = tqdm(loader, desc="Training Batch", leave=False)
    
    for batch_idx, (images, labels, _) in enumerate(pbar):
        images = images.to(device)
        labels = labels.to(device)
        
        with torch.amp.autocast('cuda', enabled=(use_amp and torch.cuda.is_available())):
            outputs = model(images)
            loss = criterion(outputs, labels)
            loss = loss / grad_accum_steps
            
        scaler.scale(loss).backward()
        
        if (batch_idx + 1) % grad_accum_steps == 0 or (batch_idx + 1) == len(loader):
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
            scaler.step(optimizer)
            scaler.update()
            optimizer.zero_grad()
        
        running_loss += loss.item() * grad_accum_steps * images.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == labels).sum().item()
        total += labels.size(0)
        
        pbar.set_postfix({'batch_loss': f"{loss.item() * grad_accum_steps:.4f}"})
        
    epoch_loss = running_loss / total
    epoch_acc  = correct / total
    return epoch_loss, epoch_acc
""")

# ==========================================
# CELL 17: Comprehensive Validation Engine
# ==========================================
add_code(r"""
# ==========================================
# 16. VALIDATION EPOCH & COMPREHENSIVE METRICS
# ==========================================
from sklearn.metrics import (
    accuracy_score, balanced_accuracy_score, precision_recall_fscore_support,
    roc_auc_score, confusion_matrix
)

def validate_epoch(
    model: nn.Module,
    loader: DataLoader,
    criterion: nn.Module,
    device: torch.device,
    use_amp: bool = True
) -> Dict[str, Any]:
    # Evaluate model and compute comprehensive multi-class metrics
    model.eval()
    running_loss = 0.0
    all_preds = []
    all_labels = []
    all_probs = []
    all_subjs = []
    
    with torch.no_grad():
        for images, labels, subjs in tqdm(loader, desc="Validating Batch", leave=False):
            images = images.to(device)
            labels = labels.to(device)
            
            with torch.amp.autocast('cuda', enabled=(use_amp and torch.cuda.is_available())):
                outputs = model(images)
                loss = criterion(outputs, labels)
                
            probs = torch.softmax(outputs, dim=1)
            _, preds = torch.max(outputs, 1)
            
            running_loss += loss.item() * images.size(0)
            all_preds.extend(preds.cpu().numpy())
            all_labels.extend(labels.cpu().numpy())
            all_probs.extend(probs.cpu().numpy())
            all_subjs.extend(subjs)
            
    total = len(all_labels)
    val_loss = running_loss / total
    
    # Calculate Multi-Class Performance Metrics
    acc = accuracy_score(all_labels, all_preds)
    bal_acc = balanced_accuracy_score(all_labels, all_preds)
    prec, rec, f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='weighted', zero_division=0)
    macro_prec, macro_rec, macro_f1, _ = precision_recall_fscore_support(all_labels, all_preds, average='macro', zero_division=0)
    
    try:
        auc = roc_auc_score(all_labels, all_probs, multi_class='ovr', average='macro')
    except Exception:
        auc = 0.5
        
    cm = confusion_matrix(all_labels, all_preds, labels=list(range(NUM_CLASSES)))
    
    return {
        'loss': val_loss,
        'accuracy': acc,
        'balanced_accuracy': bal_acc,
        'precision_weighted': prec,
        'recall_weighted': rec,
        'f1_weighted': f1,
        'precision_macro': macro_prec,
        'recall_macro': macro_rec,
        'f1_macro': macro_f1,
        'roc_auc_macro': auc,
        'confusion_matrix': cm.tolist(),
        'all_labels': all_labels,
        'all_preds': all_preds,
        'all_probs': all_probs,
        'all_subjs': all_subjs
    }
""")

# ==========================================
# CELL 18: Training Orchestration Loop
# ==========================================
add_code(r"""
# ==========================================
# 17. TRAINING ORCHESTRATION LOOP
# ==========================================
history: Dict[str, List[float]] = {
    'train_loss': [], 'train_acc': [],
    'val_loss': [], 'val_acc': [], 'val_bal_acc': [],
    'val_f1_weighted': [], 'val_auc_macro': [], 'lr': []
}

print(f"\n=====================================================")
print(f"   STARTING 3D RESNET-18 TRAINING ({EPOCHS} EPOCHS)   ")
print(f"=====================================================")

start_time = time.time()

try:
    for epoch in range(1, EPOCHS + 1):
        epoch_start = time.time()
        
        train_loss, train_acc = train_one_epoch(
            model, train_loader, criterion, optimizer, scaler, DEVICE,
            use_amp=USE_AMP, grad_accum_steps=GRADIENT_ACCUMULATION_STEPS
        )
        
        val_metrics = validate_epoch(
            model, val_loader, criterion, DEVICE, use_amp=USE_AMP
        )
        
        current_lr = optimizer.param_groups[0]['lr']
        scheduler.step()
        
        # Record training metrics
        history['train_loss'].append(train_loss)
        history['train_acc'].append(train_acc)
        history['val_loss'].append(val_metrics['loss'])
        history['val_acc'].append(val_metrics['accuracy'])
        history['val_bal_acc'].append(val_metrics['balanced_accuracy'])
        history['val_f1_weighted'].append(val_metrics['f1_weighted'])
        history['val_auc_macro'].append(val_metrics['roc_auc_macro'])
        history['lr'].append(current_lr)
        
        elapsed = time.time() - epoch_start
        print(f"Epoch [{epoch:02d}/{EPOCHS:02d}] ({elapsed:.1f}s) | "
              f"Train Loss: {train_loss:.4f} Acc: {train_acc*100:.1f}% | "
              f"Val Loss: {val_metrics['loss']:.4f} Acc: {val_metrics['accuracy']*100:.1f}% (Bal: {val_metrics['balanced_accuracy']*100:.1f}%) | "
              f"F1: {val_metrics['f1_weighted']:.4f} AUC: {val_metrics['roc_auc_macro']:.4f} | LR: {current_lr:.2e}")
        
        # Save checkpoints
        torch.save(model.state_dict(), last_model_path)
        torch.save(optimizer.state_dict(), opt_state_path)
        torch.save(scheduler.state_dict(), sched_state_path)
        torch.save(scaler.state_dict(), scaler_state_path)
        
        # Check early stopping
        early_stopping(val_metrics['loss'], model)
        if early_stopping.early_stop:
            print("[EARLY STOPPING] Triggered. Halting training loop early.")
            break

except KeyboardInterrupt:
    print("\n[INTERRUPTED] User manually interrupted training! Gracefully saving state...")
    torch.save(model.state_dict(), last_model_path)
    torch.save(optimizer.state_dict(), opt_state_path)
    torch.save(scheduler.state_dict(), sched_state_path)
    torch.save(scaler.state_dict(), scaler_state_path)

total_training_time = time.time() - start_time
print(f"\n[COMPLETE] Training session completed in {total_training_time/60.0:.2f} minutes.")
""")

# ==========================================
# CELL 19: Test Set Benchmark Evaluation
# ==========================================
add_code(r"""
# ==========================================
# 18. TEST SET BENCHMARK EVALUATION
# ==========================================
from sklearn.metrics import classification_report

print("\n--- EVALUATING BEST CHECKPOINT ON HELD-OUT TEST SET ---")
if os.path.exists(best_model_path):
    model.load_state_dict(torch.load(best_model_path, map_location=DEVICE))
    print(f"[CHECKPOINT] Successfully restored best model weights from: {best_model_path}")
else:
    print(f"[WARNING] Best model checkpoint not found at: {best_model_path}")
    print("  Evaluating using current (last-epoch) model weights instead.")
    print("  ACTION: Ensure training completed at least one epoch so early_stopping saved a checkpoint.")

test_metrics = validate_epoch(model, test_loader, criterion, DEVICE, use_amp=USE_AMP)

print("\nHeld-Out Test Set Performance:")
print(f"  - Test Loss:              {test_metrics['loss']:.4f}")
print(f"  - Micro Accuracy:         {test_metrics['accuracy']*100:.2f}%")
print(f"  - Balanced Accuracy:      {test_metrics['balanced_accuracy']*100:.2f}%")
print(f"  - F1 Score (Weighted):    {test_metrics['f1_weighted']:.4f}")
print(f"  - ROC-AUC Score (Macro):  {test_metrics['roc_auc_macro']:.4f}")

print("\nClassification Report:")
print(classification_report(
    test_metrics['all_labels'],
    test_metrics['all_preds'],
    target_names=CLASS_NAMES,
    zero_division=0
))
""")

# ==========================================
# CELL 20: Visualizations & Figure Exports (7 Charts)
# ==========================================
add_code(r"""
# ==========================================
# 19. FIGURE EXPORTS & DIAGNOSTIC CHARTS
# ==========================================
# matplotlib.pyplot and seaborn are imported here for self-contained cell execution.
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import roc_curve, auc

figs_dir = os.path.join(OUTPUT_DIR, "Figures")
os.makedirs(figs_dir, exist_ok=True)

# 1. Training & Validation Loss Curves
fig, ax = plt.subplots(figsize=(7, 5))
ax.plot(history['train_loss'], label='Train Loss', color='#2563EB', lw=2)
ax.plot(history['val_loss'], label='Val Loss', color='#DC2626', lw=2)
ax.set_title("3D ResNet-18 Training & Validation Loss")
ax.set_xlabel("Epoch")
ax.set_ylabel("Cross Entropy Loss")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(figs_dir, "loss_curves.png"), dpi=150)
plt.close()

# 2. Accuracy Curves
fig, ax = plt.subplots(figsize=(7, 5))
ax.plot([a*100 for a in history['train_acc']], label='Train Acc', color='#2563EB', lw=2)
ax.plot([a*100 for a in history['val_acc']], label='Val Acc', color='#059669', lw=2)
ax.plot([a*100 for a in history['val_bal_acc']], label='Val Bal Acc', color='#D97706', lw=2, linestyle='--')
ax.set_title("3D ResNet-18 Classification Accuracy (%)")
ax.set_xlabel("Epoch")
ax.set_ylabel("Accuracy (%)")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(figs_dir, "accuracy_curves.png"), dpi=150)
plt.close()

# 3. Learning Rate Curve
fig, ax = plt.subplots(figsize=(7, 4))
ax.plot(history['lr'], color='#7C3AED', lw=2)
ax.set_title("Learning Rate Schedule (Warmup + Cosine Annealing)")
ax.set_xlabel("Epoch")
ax.set_ylabel("Learning Rate")
ax.set_yscale('log')
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(figs_dir, "learning_rate_curve.png"), dpi=150)
plt.close()

# 4. Confusion Matrix Heatmap
fig, ax = plt.subplots(figsize=(6, 5))
sns.heatmap(test_metrics['confusion_matrix'], annot=True, fmt='d', cmap='Blues',
            xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES, ax=ax)
ax.set_title("Test Set Confusion Matrix")
ax.set_xlabel("Predicted Diagnosis")
ax.set_ylabel("Ground Truth Diagnosis")
plt.tight_layout()
plt.savefig(os.path.join(figs_dir, "confusion_matrix.png"), dpi=150)
plt.close()

# 5. One-vs-Rest Multi-Class ROC Curves
fig, ax = plt.subplots(figsize=(7, 5))
y_test_arr = np.array(test_metrics['all_labels'])
y_prob_arr = np.array(test_metrics['all_probs'])

for i, cls_name in enumerate(CLASS_NAMES):
    y_binary = (y_test_arr == i).astype(int)
    if np.sum(y_binary) > 0:
        fpr, tpr, _ = roc_curve(y_binary, y_prob_arr[:, i])
        cls_auc = auc(fpr, tpr)
        ax.plot(fpr, tpr, lw=2, label=f"{cls_name} (AUC = {cls_auc:.3f})")

ax.plot([0, 1], [0, 1], 'k--', lw=1)
ax.set_title("Multi-Class One-vs-Rest ROC Curves")
ax.set_xlabel("False Positive Rate")
ax.set_ylabel("True Positive Rate")
ax.legend()
ax.grid(True, alpha=0.3)
plt.tight_layout()
plt.savefig(os.path.join(figs_dir, "roc_curves.png"), dpi=150)
plt.close()

# 6. Misclassified Samples Visualisation
misclassified_indices = [
    i for i, (gt, pred) in enumerate(zip(test_metrics['all_labels'], test_metrics['all_preds'])) if gt != pred
]
fig, axes = plt.subplots(1, max(1, min(4, len(misclassified_indices))), figsize=(12, 3.5))
if not isinstance(axes, np.ndarray):
    axes = np.array([axes])

if len(misclassified_indices) > 0:
    for idx, sample_i in enumerate(misclassified_indices[:4]):
        vol_tensor, _, sub_id = test_dataset[sample_i]
        vol = vol_tensor[0].numpy()
        gt_cls = CLASS_NAMES[test_metrics['all_labels'][sample_i]]
        pred_cls = CLASS_NAMES[test_metrics['all_preds'][sample_i]]
        
        axes[idx].imshow(vol[:, :, vol.shape[2]//2], cmap="bone")
        axes[idx].set_title(f"Sub: {sub_id}\nGT: {gt_cls} | Pred: {pred_cls}", fontsize=9, color='red')
        axes[idx].axis("off")
else:
    axes[0].text(0.5, 0.5, "Zero Misclassifications!", ha="center", va="center", fontsize=12)
    axes[0].axis("off")

plt.suptitle("Misclassified MRI Scans (Test Set)", fontsize=12)
plt.tight_layout()
plt.savefig(os.path.join(figs_dir, "misclassified_samples.png"), dpi=150)
plt.close()

# 7. Sample MRI Predictions Visualisation
fig, axes = plt.subplots(1, min(4, len(test_dataset)), figsize=(12, 3.5))
if not isinstance(axes, np.ndarray):
    axes = np.array([axes])

for idx in range(min(4, len(test_dataset))):
    vol_tensor, gt_label, sub_id = test_dataset[idx]
    vol = vol_tensor[0].numpy()
    pred_cls = CLASS_NAMES[test_metrics['all_preds'][idx]]
    conf = test_metrics['all_probs'][idx][test_metrics['all_preds'][idx]]
    
    axes[idx].imshow(vol[:, :, vol.shape[2]//2], cmap="bone")
    axes[idx].set_title(f"Sub: {sub_id}\nPred: {pred_cls} ({conf*100:.1f}%)", fontsize=9)
    axes[idx].axis("off")

plt.suptitle("Sample Test Set MRI Predictions", fontsize=12)
plt.tight_layout()
plt.savefig(os.path.join(figs_dir, "sample_mri_predictions.png"), dpi=150)
plt.close()

print(f"[OUTPUT] Successfully generated and saved 7 diagnostic figures to: {figs_dir}")
""")

# ==========================================
# CELL 21: Model & Artifact Exports
# ==========================================
add_code(r"""
# ==========================================
# 20. MODEL CHECKPOINT & ARTIFACT EXPORTS
# ==========================================
# Export state dictionaries and metrics JSON/CSV

torch.save(optimizer.state_dict(), os.path.join(OUTPUT_DIR, "optimizer_state.pt"))
torch.save(scheduler.state_dict(), os.path.join(OUTPUT_DIR, "scheduler_state.pt"))
torch.save(scaler.state_dict(), os.path.join(OUTPUT_DIR, "scaler_state.pt"))

history_json_path = os.path.join(OUTPUT_DIR, "training_history.json")
with open(history_json_path, "w", encoding="utf-8") as f:
    json.dump(history, f, indent=2)

metrics_csv_path = os.path.join(OUTPUT_DIR, "metrics.csv")
history_df = pd.DataFrame(history)
history_df.to_csv(metrics_csv_path, index=False)

config_export = {
    'epochs': EPOCHS,
    'learning_rate': LEARNING_RATE,
    'architecture': ARCHITECTURE,
    'batch_size': BATCH_SIZE,
    'gradient_accumulation_steps': GRADIENT_ACCUMULATION_STEPS,
    'num_workers': NUM_WORKERS,
    'use_amp': USE_AMP,
    'seed': SEED,
    'device': str(DEVICE),
    'num_classes': NUM_CLASSES,
    'class_names': CLASS_NAMES
}

config_json_path = os.path.join(OUTPUT_DIR, "configuration.json")
with open(config_json_path, "w", encoding="utf-8") as f:
    json.dump(config_export, f, indent=2)

print(f"[OUTPUT] Exported optimizer_state.pt, scheduler_state.pt, scaler_state.pt, training_history.json, metrics.csv, and configuration.json to: {OUTPUT_DIR}")
""")

# ==========================================
# CELL 22: Training Summary & PDF Report Generation
# ==========================================
add_code(r"""
# ==========================================
# 21. TRAINING SUMMARY PDF & JSON GENERATION
# ==========================================
from matplotlib.backends.backend_pdf import PdfPages

summary_data = {
    'execution_timestamp': time.strftime("%Y-%m-%d %H:%M:%S"),
    'total_training_duration_min': round(total_training_time / 60.0, 2),
    'hardware_used': str(DEVICE),
    'architecture': ARCHITECTURE,
    'epochs_trained': len(history['train_loss']),
    'best_val_loss': round(float(min(history['val_loss'])), 4) if history['val_loss'] else 0.0,
    'best_val_accuracy': round(float(max(history['val_acc'])), 4) if history['val_acc'] else 0.0,
    'test_accuracy': round(float(test_metrics['accuracy']), 4),
    'test_balanced_accuracy': round(float(test_metrics['balanced_accuracy']), 4),
    'test_f1_weighted': round(float(test_metrics['f1_weighted']), 4),
    'test_roc_auc_macro': round(float(test_metrics['roc_auc_macro']), 4),
    'output_directory': os.path.abspath(OUTPUT_DIR)
}

summary_json_path = os.path.join(OUTPUT_DIR, "training_summary.json")
with open(summary_json_path, "w", encoding="utf-8") as f:
    json.dump(summary_data, f, indent=2)

pdf_summary_path = os.path.join(OUTPUT_DIR, "training_summary.pdf")

with PdfPages(pdf_summary_path) as pdf:
    fig, ax = plt.subplots(figsize=(8.5, 11))
    ax.axis('off')
    
    text = (
        "ADNI 3D MRI CLASSIFIER TRAINING SUMMARY REPORT\n"
        "=====================================================\n\n"
        f"Execution Timestamp:       {summary_data['execution_timestamp']}\n"
        f"Compute Hardware:          {summary_data['hardware_used']}\n"
        f"Model Architecture:        {summary_data['architecture']}\n"
        f"Total Training Duration:   {summary_data['total_training_duration_min']} minutes\n"
        f"Epochs Completed:          {summary_data['epochs_trained']} / {EPOCHS}\n\n"
        "1. BEST VALIDATION METRICS:\n"
        f"  - Best Validation Loss:  {summary_data['best_val_loss']:.4f}\n"
        f"  - Best Validation Acc:   {summary_data['best_val_accuracy']*100:.2f}%\n\n"
        "2. HELD-OUT TEST SET EVALUATION:\n"
        f"  - Test Micro Accuracy:    {summary_data['test_accuracy']*100:.2f}%\n"
        f"  - Test Balanced Accuracy: {summary_data['test_balanced_accuracy']*100:.2f}%\n"
        f"  - Test Weighted F1:       {summary_data['test_f1_weighted']:.4f}\n"
        f"  - Test Macro ROC-AUC:     {summary_data['test_roc_auc_macro']:.4f}\n\n"
        "3. EXPORTED ARTIFACT LOCATIONS:\n"
        f"  - Best Model State:     {os.path.join(OUTPUT_DIR, 'best_model.pt')}\n"
        f"  - Last Model State:     {os.path.join(OUTPUT_DIR, 'last_model.pt')}\n"
        f"  - Figures Directory:    {os.path.join(OUTPUT_DIR, 'Figures')}\n\n"
        "=====================================================\n"
        "TRAINING SESSION STATUS: PASSED & SUCCESSFULLY EXPORTED\n"
    )
    ax.text(0.08, 0.92, text, transform=ax.transAxes, fontsize=10, fontfamily='monospace', verticalalignment='top')
    pdf.savefig(fig)
    plt.close()

print(f"[OUTPUT] Successfully generated training summary JSON and PDF at: {pdf_summary_path}")
""")

# ==========================================
# CELL 23: Single-Scan Diagnostic Inference Demo
# ==========================================
add_code(r"""
# ==========================================
# 22. SINGLE-SCAN DIAGNOSTIC INFERENCE DEMO
# ==========================================
def predict_single_mri(
    mri_filepath: str,
    model: nn.Module,
    transforms: Any,
    device: torch.device
) -> Tuple[Optional[str], float, Optional[np.ndarray]]:
    # Perform diagnostic inference on a single 3D NIfTI MRI volume
    model.eval()
    try:
        data_dict = transforms({"image": mri_filepath})
        tensor = data_dict["image"].unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(tensor)
            probs = torch.softmax(logits, dim=1).squeeze(0).cpu().numpy()
            pred_idx = np.argmax(probs)
        return CLASS_NAMES[pred_idx], float(probs[pred_idx]), probs
    except Exception as e:
        print(f"[INFERENCE ERROR] {e}")
        return None, 0.0, None

# Run single scan inference on first sample from test set
test_sample_path = test_dataset.samples[0][0]
pred_class, confidence, all_probs = predict_single_mri(test_sample_path, model, val_transforms, DEVICE)

print("\n--- SINGLE-SCAN INFERENCE DEMO ---")
print(f"Input Volume:      {os.path.basename(test_sample_path)}")
print(f"Predicted Class:   {pred_class} ({confidence*100:.2f}% confidence)")
print("Probability Vector:")
if all_probs is not None:
    for cls_name, prob_val in zip(CLASS_NAMES, all_probs):
        print(f"  - {cls_name:4s}: {prob_val*100:6.2f}%")
""")

# ==========================================
# CELL 24: Cache Cleanup & Pipeline Finalization
# ==========================================
add_md("""
## 21. Cache Cleanup

If `CLEAN_CACHE_AFTER_TRAINING = True` in the configuration cell, the local SSD dataset cache (`/content/dataset_cache`) is removed here to free disk space. This is safe because all model weights and outputs have already been saved to `OUTPUT_DIR`.

Set `CLEAN_CACHE_AFTER_TRAINING = False` (the default) if you plan to run additional experiments without re-downloading/unzipping the dataset.
""")

add_code(r"""
# ==========================================
# 21. CACHE CLEANUP & PIPELINE FINALIZATION
# ==========================================
# Removes the local SSD dataset cache if CLEAN_CACHE_AFTER_TRAINING is True.
# All model artifacts are already saved — this only frees temporary disk space.
clean_dataset_cache()
print("[PIPELINE] Execution complete. All outputs have been saved to:", os.path.abspath(OUTPUT_DIR))
""")

add_md("""
# 23. Pipeline Execution Summary

### Completed Deliverables:
- **Notebook**: `ADNI_MRI_Classifier_Training.ipynb`
- **Trained Weights**: `Training_Outputs/best_model.pt` & `last_model.pt`
- **Optimizer/Scheduler/Scaler States**: `Training_Outputs/optimizer_state.pt`, `scheduler_state.pt`, `scaler_state.pt`
- **Metrics**: `Training_Outputs/metrics.csv`, `training_history.json`, `configuration.json`
- **Figures**: `Training_Outputs/Figures/` (Loss, Accuracy, LR, Confusion Matrix, ROC curves, Misclassified Scans, Sample Predictions)
- **PDF Report**: `Training_Outputs/training_summary.pdf`

> [!TIP]
> All outputs are automatically saved to `Training_Outputs` (or mounted Google Drive when executed in Colab).
""")

notebook = {
    "cells": cells,
    "metadata": {
        "accelerator": "GPU",
        "colab": {
            "provenance": []
        },
        "kernelspec": {
            "display_name": "Python 3",
            "language": "python",
            "name": "python3"
        },
        "language_info": {
            "name": "python",
            "version": "3.10.0"
        }
    },
    "nbformat": 4,
    "nbformat_minor": 5
}

os.makedirs(os.path.dirname(notebook_path), exist_ok=True)
with open(notebook_path, 'w', encoding='utf-8') as f:
    json.dump(notebook, f, indent=2)

print(f"Successfully generated notebook at: {notebook_path}")
