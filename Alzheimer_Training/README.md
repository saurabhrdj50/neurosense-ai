# Alzheimer_Training — Brain MRI Deep Learning & ADNI Training Workspace

This directory contains the training pipelines, experiment checkpoints, cross-validation splits, and preprocessing workflows for the **Brain MRI Classification Subsystem** of NeuroSense AI.

> **⚠️ Research Disclaimer**: All models and checkpoints developed here are research-grade screening instruments trained on the ADNI research cohort. They are not approved as standalone medical diagnostic devices.

---

## 🌟 Executive Summary: Production Checkpoint & Provenance

The production MRI model checkpoint running in the backend (`backend/app/models/alzheimer_model.pth`) is **byte-for-byte identical** (MD5 checksum `f36aa42f5e864d705bfe3250380cbb5e`) to the fine-tuned checkpoint generated in this workspace:

```
Alzheimer_Training/best_mri_resnet18_finetuned.pth 
                     │
                     ▼ (Identical Copy)
backend/app/models/alzheimer_model.pth
```

### Checkpoint Technical Profile
- **Architecture**: PyTorch TorchVision ResNet-18 (single backbone) with modified linear classifier head `(in_features=512, out_features=3)`.
- **Target Vocabulary (ADNI 3-Class)**:
  - `0`: Cognitively Normal (**CN**)
  - `1`: Mild Cognitive Impairment (**MCI**)
  - `2`: Alzheimer's Disease (**AD**)
- **Validation Cohort Performance ($n=95$)**:
  - Accuracy: **58.95%**
  - Macro F1: **0.5725**
  - Balanced Accuracy: **0.5660**
  - Confusion Matrix: `[[14, 11, 1], [10, 31, 6], [3, 8, 11]]`
- **Clinical Rationale**: Differentiating CN vs. MCI vs. AD solely from raw structural MRI slices is intrinsically difficult due to subtle morphological boundaries. Within NeuroSense AI, the MRI classification operates as one weighted vote ($W=0.40$) in the Two-Tier Hybrid Multimodal Fusion engine alongside voice, cognitive, and clinical risk profiles.

---

## 🔬 End-to-End Data Preprocessing & Training Pipeline

The pipeline is implemented across `Model_Training_02.ipynb` and `finetuning_restart.ipynb`:

```
┌────────────────────────────────┐
│   ADNI 3D NIfTI Volumes (.nii) │
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│    SynthStrip Skull-Stripping  │ FreeSurfer deep learning skull-stripping
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   Isotropic Resampling & Norm  │ Intensity normalization & z-score scaling
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│  32 Informative Axial Slices   │ Centered on hippocampal & temporal structures
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   Subject-Stratified Split     │ 70% Train / 15% Val / 15% Test
│      (Zero Patient Leak)       │ Verified no subject overlap across splits
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│    ResNet-18 Training & Heads  │ Transfer learning from ImageNet + Fine-Tuning
└───────────────┬────────────────┘
                │
                ▼
┌────────────────────────────────┐
│   Grad-CAM Saliency Engine     │ Heatmap generation targeting layer4 conv activations
└────────────────────────────────┘
```

1. **Skull Stripping (`SynthStrip`)**:
   - Strips non-brain tissues (skull, meninges, scalp, fat) using FreeSurfer's `mri_synthstrip` model, eliminating background noise and scanner artifacts.
2. **Volumetric Slicing & NPZ Serialization**:
   - Selects 32 key axial slices spanning the hippocampus and ventricles.
   - Resizes slices to $224 \times 224$ pixels, replicating channels to 3-channel RGB format `(32, 224, 224, 3)`.
3. **Data Partitioning & Leakage Prevention**:
   - Partitions are strictly **subject-grouped and stratified**. All scans from a given participant reside exclusively in either Train, Validation, or Test to prevent optimistic data leakage.
   - 5-fold cross-validation fold assignments are cataloged in `5fold_subject_grouped_metadata.csv`.

---

## 📂 Workspace File Catalog

| Path / File | Purpose & Description |
|---|---|
| `Model_Training_02.ipynb` | Comprehensive training notebook: dataset ingestion, SynthStrip, NPZ generation, ResNet baseline training, and augmentation pipelines. |
| `finetuning_restart.ipynb` | Classifier head fine-tuning, focal loss balancing, and checkpoint export (produces production weights). |
| `best_mri_resnet18_finetuned.pth` | Production lineage checkpoint (single backbone ResNet-18, 43 MB). |
| `best_mri_resnet18*.pth` | Experimental checkpoints (spatial attention, mean-max pooling, partial layer freezing). |
| `best_brain_mri_ssl_resnet50*.pth` | Experimental Self-Supervised Learning (SSL) ResNet-50 models. |
| `5fold_subject_grouped_metadata.csv` | Subject-level fold split metadata for 5-fold cross-validation. |
| `Alzheimer_Dataset/` | Local directory for raw ADNI NPZ volumes (~20 GB). Excluded from git. |

---

## 🧭 Instructions for Collaborators & Researchers

### 1. Handling Large Weights & Datasets
- Checkpoint weights (`*.pth`, `*.pt`) and the `Alzheimer_Dataset/` directory are excluded by `.gitignore` to prevent bloating the git repository.
- If transferring to a new machine or sharing with a colleague:
  - Copy `best_mri_resnet18_finetuned.pth` directly into `backend/app/models/alzheimer_model.pth`.
  - Alternatively, the backend runs seamlessly with automatic synthetic fallback for development if weights are omitted.

### 2. Running the Training Notebooks Locally
- The notebooks contain Google Colab paths by default (`/content/drive/...`).
- To run locally:
  1. Open `Model_Training_02.ipynb` in VS Code or JupyterLab.
  2. Update the `DATA_DIR` constant to point to your local dataset path:
     ```python
     DATA_DIR = Path("./Alzheimer_Dataset")
     ```
  3. Ensure PyTorch, TorchVision, NiBabel, and Albumentations are installed in your environment.

### 3. Saliency Heatmaps & NiiVue Integration
- During inference, `backend/app/ml/mri/gradcam.py` attaches forward and backward hooks to the final convolutional block (`layer4`) of ResNet-18.
- The computed gradient-weighted activation map is bilinearly upsampled to $224 \times 224$, normalized, and overlaid in the frontend's **NiiVue 3D WebGL Multi-Planar Viewer** with dynamic opacity blending ($0\% - 100\%$).
