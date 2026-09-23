# ADNI 3D MRI Alzheimer's Classifier V2 — User & Deployment Guide

Welcome to **Version 2** of the ADNI 3D MRI Alzheimer's Diagnostic Classifier training pipeline. This version introduces **3D Medical Transfer Learning** using **MedicalNet 3D ResNet-18** pretrained weights (`resnet_18_23dataset.pth`), delivering higher diagnostic accuracy, faster training convergence, and reduced memory footprint.

---

## Deliverables & Key Files

| Deliverable File | Type | Description |
|------------------|------|-------------|
| **`Notebooks/ADNI_MRI_Classifier_Training_v2.ipynb`** | Jupyter Notebook | Main Colab-ready training notebook with 3D Transfer Learning |
| **`TRANSFER_LEARNING.md`** | Architecture Doc | Technical specification of 3D pretrained weights, layer freezing, and safe loading mechanics |
| **`BASELINE_VS_V2.md`** | Evaluation Report | Benchmark comparison table comparing Baseline (v1) vs Version 2 metrics |
| **`README_V2.md`** | User Guide | Quickstart instructions, hardware prerequisites, and configuration options (this file) |

---

## What's New in Version 2

- **Pretrained 3D Medical Weights**: Officially supported MONAI / MedicalNet 3D ResNet-18 pretrained on 23 3D medical CT/MRI datasets.
- **Configurable Fine-Tuning**: Freeze low-level feature extractors (`conv1`, `bn1`, `layer1`, `layer2`) via `FREEZE_BACKBONE = True` while fine-tuning deep feature blocks (`layer3`, `layer4`) and classification head.
- **Safe State-Dict Loading**: Automatic tensor shape checking, parameter matching, and detailed reporting (Loaded params, Missing keys, Unexpected keys, % loaded).
- **Transfer Learning Diagnostics Box**: Diagnostic box printed during execution summarizing transfer learning status, weight provenance, frozen layers, and trainable parameters.
- **100% Backward Compatibility**: Setting `USE_PRETRAINED = False` restores exact Version 1 baseline behavior without code duplication.

---

## Configuration Reference (Cell 3 in Notebook)

All hyperparameters are controlled in **Cell 3**:

```python
# ==========================================
# TRANSFER LEARNING CONFIGURATION (V2)
# ==========================================
USE_PRETRAINED: bool = True  # Set False for Version 1 baseline behavior
PRETRAINED_SOURCE: str = "MedicalNet"  # Source of pretrained weights ("MedicalNet" via MONAI)
FREEZE_BACKBONE: bool = True  # Freeze early backbone layers (conv1, bn1, layer1, layer2)
UNFREEZE_LAST_BLOCKS: bool = (
    True  # Unfreeze layer3 & layer4 for fine-tuning when FREEZE_BACKBONE=True
)

EPOCHS: int = 15  # Total training epochs
LEARNING_RATE: float = 1e-4  # AdamW initial learning rate
WEIGHT_DECAY: float = 1e-2  # L2 regularization coefficient
USE_AMP: bool = True  # Mixed Precision (FP16) acceleration
SMOKE_TEST: bool = True  # Rapid pipeline validation mode (Set False for full dataset)
```

---

## Step-by-Step Google Colab Quickstart

1. **Upload Dataset**: Upload `Alzheimer_Project.zip` to your Google Drive root directory (`MyDrive/Alzheimer_Project.zip`).
2. **Open Notebook**: Upload `ADNI_MRI_Classifier_Training_v2.ipynb` to [Google Colab](https://colab.research.google.com/).
3. **Select GPU Runtime**: Go to `Runtime` -> `Change runtime type` -> Select `T4 GPU`.
4. **Execute Notebook**: Click `Runtime` -> `Run all`.
5. **Review Outputs**: All trained weights, metrics CSV/JSON, diagnostic figures, PDF report, and `BASELINE_VS_V2.md` will be exported automatically to `./Training_Outputs/`.

---

## Output Artifact Directory Structure

Upon completion, all outputs are saved to `./Training_Outputs/`:

```
Training_Outputs/
├── best_model.pt                  # Model weights at best validation loss
├── last_model.pt                  # Model weights at final epoch
├── optimizer_state.pt             # AdamW optimizer state for resuming
├── scheduler_state.pt             # LR scheduler state
├── scaler_state.pt                # AMP GradScaler state
├── metrics.csv                    # Per-epoch training & validation log
├── training_history.json          # Metrics history JSON
├── configuration.json             # Exact hyperparameters used in run
├── training_summary.json          # Key metric summary JSON
├── training_summary.pdf           # Printable human-readable PDF report
├── BASELINE_VS_V2.md              # Baseline vs V2 comparison report
└── Figures/
    ├── accuracy_curves.png        # Train vs Val accuracy plot
    ├── loss_curves.png            # Train vs Val loss plot
    ├── learning_rate_curve.png    # Warmup + Cosine annealing LR schedule
    ├── confusion_matrix.png       # Test set confusion matrix
    ├── roc_curves.png             # Multi-class One-vs-Rest ROC curves
    ├── misclassified_samples.png  # Diagnostic plot of error cases
    └── sample_mri_predictions.png # Sample test MRI predictions with confidence scores
```

---

## License & Research Disclaimer

This project is intended strictly for academic research, algorithmic benchmarking, and educational evaluation on the ADNI dataset. It is **NOT** a certified medical device and must **NOT** be used for primary clinical diagnosis or treatment planning.
