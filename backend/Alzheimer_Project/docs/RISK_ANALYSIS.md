# NeuroSense AI — ADNI Alzheimer's Risk Analysis & System Bottlenecks

## Overview
This document identifies technical risks, structural bottlenecks, data integrity challenges, and PyTorch API deprecations inherent in the current ADNI Alzheimer's MRI Classification project, along with actionable mitigation strategies.

---

## Technical Risk Matrix

| Risk ID | Risk Category | Severity | Likelihood | Impact Area | Description & Root Cause | Mitigation Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **R-01** | Data Leakage | **CRITICAL** | Medium | Model Validity | Longitudinal ADNI scans from the same subject split across train/val sets cause falsely inflated accuracy. | Enforce subject-level stratified splitting (`get_adni_datasets`) using unique Subject IDs. |
| **R-02** | Disk I/O Bottleneck | **HIGH** | High | Training Speed | Reading uncompressed 3D NIfTI volumes from Google Drive or HDD creates high I/O latency. | Cache preprocessed 2D slices or MONAI 3D tensors to local SSD/RAM prior to training. |
| **R-03** | CPU Contention | **HIGH** | Medium | Pipeline Throughput | Setting `num_workers > 0` on Windows or Colab environments can cause CPU thread memory thrashing. | Set `num_workers=0` on Windows and `num_workers=2` on Linux/Colab with shared memory allocation. |
| **R-04** | Class Imbalance | **MEDIUM** | High | Bias / Recall | MCI and CN scans outnumber AD scans, risking biased predictions toward majority classes. | Apply reciprocal class weighting via PyTorch `WeightedRandomSampler` and focal loss. |
| **R-05** | AMP Deprecation | **MEDIUM** | High | Future Compatibility | Legacy `torch.cuda.amp.autocast()` syntax throws warnings in PyTorch 2.x versions. | Refactor to `torch.amp.autocast('cuda')` and `torch.amp.GradScaler('cuda')`. |
| **R-06** | Intensity Outliers | **MEDIUM** | Medium | Model Stability | Skull artifacts and ultra-intense voxels skew standard min-max scaling to near zero. | Apply 1st and 99th percentile clipping before min-max scaling (`ScaleIntensityRangePercentilesd`). |

---

## Detailed Analysis of Critical Bottlenecks & Risks

### 1. Data Leakage via Longitudinal Scans (Risk R-01)
- **Problem**: ADNI contains multiple visits per subject over time (e.g. baseline, 6-month, 12-month follow-up). If scans are split randomly at the *file level*, the model memorizes anatomical features of patient X's brain from the training scan and evaluates on a follow-up scan of patient X in the validation set, creating false 99%+ accuracy.
- **Verification**: `ADNI_Project_Audit.ipynb` checks set intersection of subject sets:
  $$\text{Train Subjects} \cap \text{Val Subjects} = \emptyset$$
- **Enforcement**: `get_adni_datasets()` performs permutation on unique `Subject` IDs rather than scan indices.

### 2. Disk I/O Latency in Google Colab (Risk R-02)
- **Problem**: Mounting Google Drive via FUSE file system (`/content/drive/MyDrive`) introduces network/disk latency when accessing hundreds of uncompressed 3D NIfTI files (`.nii` files ranging from 10MB to 50MB each).
- **Impact**: GPU memory utilization drops to 0–10% while waiting for the CPU to read NIfTI headers and extract voxel arrays.
- **Mitigation**: The training notebook extracts `Alzheimer_Project.zip` directly to Colab's ephemeral local NVMe disk `/content/Alzheimer_Project` prior to training.

### 3. CPU Worker Thread Memory Thrashing (Risk R-03)
- **Problem**: On Windows OS, PyTorch `DataLoader` multi-processing relies on `spawn` instead of `fork`. When `num_workers > 0`, each child process re-imports heavy medical libraries (`nibabel`, `monai`, `timm`), resulting in RAM exhaustion and `BrokenPipeError`.
- **Mitigation**: `num_workers=0` is set for local Windows execution. For Linux/Colab, `num_workers` is calculated using `min(4, max(0, cpu_count - 1))`.

### 4. PyTorch AMP API Deprecations (Risk R-05)
- **Problem**: In PyTorch 2.x, `torch.cuda.amp.autocast()` and `torch.cuda.amp.GradScaler()` have been deprecated in favor of device-agnostic module paths.
- **Deprecations**:
  - Legacy: `torch.cuda.amp.autocast()` $\rightarrow$ Recommended: `torch.amp.autocast('cuda')`
  - Legacy: `torch.cuda.amp.GradScaler()` $\rightarrow$ Recommended: `torch.amp.GradScaler('cuda')`
- **Mitigation**: Future maintenance updates should adopt device-agnostic `torch.amp` namespaces.
