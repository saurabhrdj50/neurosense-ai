# NeuroSense AI — ADNI Alzheimer's Configuration Reference

## Overview
This reference specifies all configuration parameters, environment options, hyperparameter dictionaries, metadata settings, data loader options, and path references used across the ADNI MRI Classification pipeline.

---

## 1. Directory & File Path Configuration

| Parameter Name | Configuration Value / Pattern | Scope / Module | Description |
| :--- | :--- | :--- | :--- |
| `PROJECT_DIR` | `os.path.dirname(os.path.abspath(__file__))` | `train_adni_mri.py` | Root path to `backend/Alzheimer_Project` directory |
| `BACKEND_DIR` | `os.path.dirname(PROJECT_DIR)` | `train_adni_mri.py` | Root path to `backend` directory (added to `sys.path`) |
| `LABELS_CSV` | `Metadata/ADNI_labels.csv` | `adniftidataset.py` | CSV file containing subject IDs, diagnoses, age, sex |
| `INVENTORY_CSV` | `Metadata/ADNI_MRI_inventory.csv` | `adniftidataset.py` | CSV file mapping subject IDs to relative/absolute NIfTI paths |
| `DATASET_DIR` | `Dataset/ADNI/` | All Scripts & Notebooks | Base directory for 3D NIfTI neuroimaging volume scans |
| `OUTPUT_MODEL_DIR` | `Models/` | `train_adni_mri.py` | Directory for serialized model weights (`.pth`) |
| `AUDIT_OUTPUT_DIR` | `ADNI_Audit_Outputs/` | `ADNI_Project_Audit.ipynb` | Output directory for audit reports (JSON, CSV, PDF) |
| `PROFILER_OUTPUT_DIR`| `ADNI_Profiler_Outputs/` | `ADNI_Model_Profiler.ipynb` | Output directory for hardware profiler reports |

---

## 2. Dataset & Preprocessing Configuration

| Parameter Name | Default Value | Options / Type | Description |
| :--- | :--- | :--- | :--- |
| `slice_plane` | `'axial'` | `'axial'`, `'coronal'`, `'sagittal'` | Anatomical slice extraction plane from 3D MRI volume |
| `slice_fraction` | `0.5` | `float` (0.0 to 1.0) | Relative slice index position (0.5 = center slice) |
| `intensity_p_min` | `1.0` | `float` (percentile) | Lower percentile bound for intensity percentile clipping |
| `intensity_p_max` | `99.0` | `float` (percentile) | Upper percentile bound for intensity percentile clipping |
| `target_spatial_size`| `(224, 224)` | `Tuple[int, int]` | Target 2D image height and width for CNN backbones |
| `target_3d_spatial_size`| `(64, 64, 64)` | `Tuple[int, int, int]` | Target 3D volumetric spatial dimensions for MONAI |
| `norm_mean` | `[0.2682, 0.2682, 0.2682]` | `List[float]` | ImageNet/ADNI normalized channel mean values |
| `norm_std` | `[0.3008, 0.3008, 0.3008]` | `List[float]` | ImageNet/ADNI normalized channel standard deviation values |
| `train_ratio` | `0.8` | `float` (0.0 to 1.0) | Subject-level training dataset split ratio (80% train / 20% val) |

---

## 3. Model & Hyperparameter Configuration

| Argument / Parameter | Default | Type / Choices | Description |
| :--- | :--- | :--- | :--- |
| `--epochs` | `5` | `int` ($\ge 1$) | Total training iterations over the training set |
| `--batch_size` | `32` | `int` (16, 32, 64) | Mini-batch size for DataLoader |
| `--architecture` | `'ensemble'` | `'resnet18'`, `'swin'`, `'convnext'`, `'efficientnet'`, `'ensemble'` | Neural network backbone architecture selection |
| `num_classes` | `3` | `int` | Output classification targets (`CN`: 0, `MCI`: 1, `AD`: 2) |
| `learning_rate` | `1e-4` | `float` | Initial learning rate for AdamW optimizer |
| `weight_decay` | `1e-2` | `float` | L2 weight regularization factor for AdamW |
| `dropout_rate` | `0.4` | `float` | Dropout probability in ResNet classification head |
| `random_seed` | `42` | `int` | Global random seed for reproducible subject splitting |

---

## 4. Hardware & DataLoader Environment Configuration

| Parameter Name | Default Value | Colab / Dynamic Override | Description |
| :--- | :--- | :--- | :--- |
| `num_workers` | `0` | `min(4, cpu_count - 1)` | PyTorch DataLoader worker threads (0 recommended for local Windows I/O) |
| `pin_memory` | `False` | `True` if CUDA active | Direct memory pinning to GPU host memory |
| `device` | `'cuda'` | `'cpu'` if CUDA unavailable | Target compute execution device (`cuda` or `cpu`) |
| `amp_enabled` | `False` | `True` for Tesla T4 / A100 | Mixed Precision FP16 training via `torch.cuda.amp.autocast` |

---

## 5. Metadata Label Mapping Dictionary

```python
LABEL_MAP = {
    'CN':  0,  # Cognitively Normal
    'MCI': 1,  # Mild Cognitive Impairment
    'AD':  2   # Alzheimer's Disease
}

INV_LABEL_MAP = {
    0: 'CN',
    1: 'MCI',
    2: 'AD'
}
```
