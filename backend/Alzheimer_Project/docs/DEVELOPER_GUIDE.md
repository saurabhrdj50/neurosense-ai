# NeuroSense AI — ADNI Alzheimer's Developer Guide

## Overview
This developer guide provides step-by-step instructions for environment setup, executing diagnostic audits and hardware profilers, running model training, executing verification test scripts, and extending the codebase safely.

---

## 1. Environment Requirements & Installation

### Prerequisites:
- **Python**: `3.10` to `3.12`
- **PyTorch**: `2.0+` with CUDA acceleration recommended
- **OS**: Windows 11, Linux, or Google Colab

### Installation Steps:
```bash
# Navigate to backend directory
cd d:\neurosense-ai\backend

# Install required dependencies
pip install torch torchvision --extra-index-url https://download.pytorch.org/whl/cu121
pip install nibabel monai timm pandas numpy scikit-learn matplotlib psutil tqdm
```

---

## 2. Command-Line Workflows

### Command 1: Run Dataset Demographic & Statistical Audit
```bash
cd d:\neurosense-ai\backend\Alzheimer_Project
python analyze_adni_details.py
```
*Output*: Displays class counts, age stats, sex distributions, and recommended PyTorch loss weights.

### Command 2: Run Master File Discovery & NIfTI Header Audit
```bash
python audit_dataset.py
```
*Output*: Audits spatial shape distributions, voxel spacings, and header corruption across all discovered NIfTI volumes.

### Command 3: Train ADNI Diagnostic Model (CLI)
```bash
python train_adni_mri.py --epochs 5 --batch_size 32 --architecture ensemble
```
*Arguments*:
- `--epochs`: Number of training iterations (default: `5`).
- `--batch_size`: DataLoader batch size (default: `32`).
- `--architecture`: Model architecture choices: `resnet18`, `swin`, `convnext`, `efficientnet`, `ensemble`.

### Command 4: Run Notebook JSON & Syntax Validation
```bash
python validate_audit_profiler.py
```
*Output*: Validates JSON schema integrity and parses cell AST syntax for `ADNI_Project_Audit.ipynb` and `ADNI_Model_Profiler.ipynb`.

### Command 5: Run Automated Notebook Smoke Test
```bash
python run_notebook_smoketest.py
```
*Output*: Simulates headless execution of the training notebook in a isolated test process to ensure zero runtime errors.

---

## 3. Jupyter Notebook Workflows (Google Colab & Local)

### Running `ADNI_Project_Audit.ipynb`:
1. Open `backend/Alzheimer_Project/Notebooks/ADNI_Project_Audit.ipynb` in VS Code or upload to Google Colab.
2. Select GPU or CPU kernel and click **Run All**.
3. Output artifacts (`project_audit.json`, `dataset_statistics.csv`, `quality_summary.csv`, `audit_summary.pdf`) will be generated in `ADNI_Audit_Outputs/`.

### Running `ADNI_Model_Profiler.ipynb`:
1. Open `backend/Alzheimer_Project/Notebooks/ADNI_Model_Profiler.ipynb`.
2. Click **Run All** (GPU execution required for latency benchmarking).
3. Output artifacts (`hardware_report.json`, `model_report.json`, `training_readiness.json`, `profiler_summary.pdf`) will be generated in `ADNI_Profiler_Outputs/`.

### Running `ADNI_MRI_Classifier_Training.ipynb`:
1. Open `backend/Alzheimer_Project/Notebooks/ADNI_MRI_Classifier_Training.ipynb`.
2. Click **Run All**.
3. If running in Colab, the notebook automatically mounts Google Drive and extracts `Alzheimer_Project.zip` if present.
4. Model weights will be saved to `Models/adni_alzheimer_model.pth`.

---

## 4. Code Base Extension Guidelines

### How to Add a New Neural Architecture to `AlzheimerModel`:
1. Open `backend/app/modules/mri/model.py`.
2. Update `__init__()` to accept the new architecture identifier:
```python
elif architecture == 'my_new_model':
    self.backbone = timm.create_model('my_new_model_name', pretrained=False, num_classes=0, in_chans=3)
    self._in_features = getattr(self.backbone, 'num_features', 1024)
    self.fc = nn.Linear(self._in_features, num_classes)
```
3. Update `train_adni_mri.py` CLI `ArgumentParser` `--architecture` choices array.

### How to Add Custom Data Augmentation Transforms:
1. Open `backend/app/modules/mri/adni_dataset.py` or `train_adni_mri.py`.
2. Extend `train_transforms = transforms.Compose([...])` with custom torchvision or MONAI transform functions (e.g., `ColorJitter`, `RandomAffine`).
