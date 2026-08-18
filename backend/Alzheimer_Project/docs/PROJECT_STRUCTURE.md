# NeuroSense AI — ADNI Alzheimer's Project Structure

## Folder Tree Overview

```
backend/Alzheimer_Project/
├── ADNI_Audit_Outputs/             # Generated audit report artifacts
│   ├── audit_summary.pdf           # Visual summary PDF of dataset audit
│   ├── dataset_statistics.csv      # Demographics and scan count breakdown per class
│   ├── pipeline_report.json        # MONAI DataLoader verification test report
│   ├── project_audit.json          # File discovery and structural integrity report
│   └── quality_summary.csv         # Per-scan intensity and blank slice audit results
├── ADNI_Profiler_Outputs/          # Generated hardware & model profiling artifacts
│   ├── hardware_report.json        # Environment specs (PyTorch, MONAI, GPU, RAM)
│   ├── model_report.json           # Model latency, throughput, parameter counts
│   ├── profiler_summary.pdf        # Capacity planning summary PDF
│   └── training_readiness.json     # Bottlenecks and recommended hyperparameter settings
├── Dataset/                        # NIfTI MRI dataset directory
│   └── ADNI/                       # Subject-organized raw NIfTI scans
│       └── [Subject_ID]/           # e.g., 002_S_0816, 005_S_0546
│           └── .../*.nii           # 3D sMRI volume files
├── docs/                           # Comprehensive technical documentation suite
│   ├── PROJECT_ARCHITECTURE.md     # Architectural tier diagrams & system specs
│   ├── PROJECT_STRUCTURE.md        # File & folder structure inventory (this document)
│   ├── DATA_FLOW.md                # Data processing lifecycle & transformation specs
│   ├── NOTEBOOK_DOCUMENTATION.md   # Analysis of training, audit, and profiler notebooks
│   ├── MODEL_DOCUMENTATION.md      # Neural network architectures, loss & optimizers
│   ├── CONFIGURATION_REFERENCE.md  # System hyperparameters & environment configuration
│   ├── OUTPUT_REFERENCE.md         # Reference manual for generated reports and models
│   ├── RISK_ANALYSIS.md            # System risks, bottlenecks & mitigation strategies
│   ├── PROJECT_KNOWLEDGE_BASE.md   # Medical domain knowledge & NIfTI specs
│   └── DEVELOPER_GUIDE.md          # Setup, execution & extension instructions
├── Metadata/                       # Cohort & scan metadata CSV files
│   ├── ADNI_labels.csv             # Master clinical diagnoses (CN, MCI, AD), age, sex
│   └── ADNI_MRI_inventory.csv      # Mapping of Subject IDs to NIfTI file paths
├── Models/                         # Trained model checkpoint weights
│   └── adni_alzheimer_model.pth    # Saved state_dict for AlzheimerModel
├── Notebooks/                      # Production Jupyter Notebooks
│   ├── ADNI_MRI_Classifier_Training.ipynb  # End-to-end training & evaluation pipeline
│   ├── ADNI_Model_Profiler.ipynb          # Standalone non-training hardware profiler
│   └── ADNI_Project_Audit.ipynb           # Standalone non-mutating dataset audit
├── Results/                        # Detailed diagnostic inspection outputs
│   └── MRI_Inspection/             # MRI inspection logs and sample PNG renders
│       ├── ADNI_MRI_class_summary.csv
│       ├── ADNI_MRI_complete_inspection.csv
│       ├── ADNI_MRI_inspection_summary.txt
│       ├── ADNI_MRI_quality_flags.csv
│       ├── subjects_with_multiple_MRIs.csv
│       └── Sample_Images/           # Extracted 2D PNG slice previews
├── Training_Outputs/               # Diagnostic visual outputs from model training
│   ├── Figures/
│   │   └── sample_mri_previews.png # Batch preview grid generated during training
│   └── smoketest.log               # Verification log from smoketest execution
├── analyze_adni_details.py         # Statistical script for cohort demographic audit
├── audit_dataset.py                # File discovery and header verification script
├── audit_deep_dataset.py           # Longitudinal diagnosis consistency & age audit script
├── build_audit_notebook.py         # Programmatic builder for ADNI_Project_Audit.ipynb
├── build_full_notebook.py          # Programmatic builder for training notebook
├── build_profiler_notebook.py      # Programmatic builder for ADNI_Model_Profiler.ipynb
├── fix_python_quotes.py            # Maintenance utility for string escaping
├── inspect_cell8.py                # Inspection utility for notebook AST validation
├── repair_notebook.py              # Self-healing script for corrupted notebook JSON
├── run_notebook_smoketest.py       # Automated smoke test for notebook execution
├── test_splitting.py               # Unit test script for subject-level split verification
├── train_adni_mri.py               # Main CLI training entry point
├── validate_audit_profiler.py      # JSON schema & Python syntax validator for notebooks
└── validate_notebook.py            # AST syntax validator for training notebook
```

---

## File Categorization & Inventory

### 1. Source Code Files (`backend/Alzheimer_Project/`)
- **`train_adni_mri.py`**: Command-line entry point to train the model. Uses `get_adni_datasets` to handle subject-level dataset splits and `AlzheimerModel` for training.
- **`app/modules/mri/adni_dataset.py`**: PyTorch `Dataset` wrapper for 3D NIfTI volumes. Handles 2D slice extraction across axial/coronal/sagittal planes, intensity percentile normalization, and torchvision transforms.
- **`app/modules/mri/model.py`**: PyTorch `nn.Module` definition supporting ResNet-18, Swin Transformer, ConvNeXt V2, EfficientNet-B4, and 3-way soft-voting ensemble.

### 2. Notebook Build & Repair Scripts
- **`build_audit_notebook.py`**: Generates `ADNI_Project_Audit.ipynb`.
- **`build_profiler_notebook.py`**: Generates `ADNI_Model_Profiler.ipynb`.
- **`build_full_notebook.py`**: Generates `ADNI_MRI_Classifier_Training.ipynb`.
- **`repair_notebook.py`**: Repairs JSON formatting issues in notebooks.
- **`validate_audit_profiler.py`**: Validates JSON schema and parses python code AST inside notebook cells.
- **`run_notebook_smoketest.py`**: Simulates headless notebook execution to verify runtime integrity.

### 3. Notebooks (`Notebooks/`)
- **`ADNI_MRI_Classifier_Training.ipynb`**: Complete Colab/Local training notebook with automated environment setup, Google Drive zip auto-extraction, MONAI dataloader, ensemble training, metric logging, and figure generation.
- **`ADNI_Project_Audit.ipynb`**: Non-destructive notebook for verifying header integrity, checking zero subject leakage, and profiling scan quality.
- **`ADNI_Model_Profiler.ipynb`**: Non-training hardware benchmark notebook for measuring GPU latency, VRAM footprint, and calculating optimal batch size.

### 4. Input & Metadata Files (`Metadata/`, `Dataset/`)
- **`Metadata/ADNI_labels.csv`**: Contains subject ID, image data ID, clinical group (`CN`, `MCI`, `AD`), age, and sex.
- **`Metadata/ADNI_MRI_inventory.csv`**: Maps subject IDs and image data IDs to file paths on disk.
- **`Dataset/ADNI/*/*/*.nii`**: Uncompressed 3D NIfTI neuroimaging volumes.

### 5. Generated Output Files (`ADNI_Audit_Outputs/`, `ADNI_Profiler_Outputs/`, `Models/`, `Training_Outputs/`)
- **`Models/adni_alzheimer_model.pth`**: State dictionary containing optimal model weights.
- **`ADNI_Audit_Outputs/project_audit.json`**: Structure audit output.
- **`ADNI_Audit_Outputs/pipeline_report.json`**: DataLoader verification result.
- **`ADNI_Audit_Outputs/dataset_statistics.csv`**: Summary table of cohort demographics.
- **`ADNI_Audit_Outputs/quality_summary.csv`**: Intensity percentile and blank slice inspection table.
- **`ADNI_Audit_Outputs/audit_summary.pdf`**: Printable executive summary PDF for dataset audit.
- **`ADNI_Profiler_Outputs/hardware_report.json`**: System hardware specs.
- **`ADNI_Profiler_Outputs/model_report.json`**: Benchmark latency and throughput per model architecture.
- **`ADNI_Profiler_Outputs/training_readiness.json`**: Recommendations for batch size, workers, and AMP.
- **`ADNI_Profiler_Outputs/profiler_summary.pdf`**: Printable hardware profiler summary PDF.
- **`Training_Outputs/Figures/sample_mri_previews.png`**: Grid plot of input MRI slices.
