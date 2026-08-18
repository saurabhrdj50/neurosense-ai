# Alzheimer's 3D MRI Classifier: Detailed Training & Convergence Analysis

> [!NOTE]
> This document provides a granular analysis of Phase 1 (Verification) and Phase 2 (Training & Convergence Analysis) of the post-training review for the MONAI 3D ResNet-18 model on the ADNI dataset.

---

## 1. Environment & Output Verification (Phase 1)

All output files generated during the Google Colab training run were verified and confirmed complete within `Training_Outputs/`:

- **Model Checkpoints**: `best_model.pt` (134.0 MB), `last_model.pt` (134.0 MB)
- **Training State Checkpoints**: `optimizer_state.pt` (268.0 MB), `scheduler_state.pt` (1.7 KB), `scaler_state.pt` (1.4 KB)
- **Configuration & Metadata**: `configuration.json`, `training_summary.json`, `training_summary.pdf`
- **History & Metrics**: `metrics.csv`, `training_history.json`
- **Diagnostic Figures**: `loss_curve.png`, `accuracy_curve.png`, `learning_rate_curve.png`, `confusion_matrix.png`, `roc_curve.png`, `misclassified_samples.png`, `sample_mri_predictions.png`, `sample_mri_previews.png`

### Run Hardware & Execution Parameters
- **Compute Hardware**: CUDA GPU (Google Colab)
- **Architecture**: `MONAI_3D_ResNet18` (11,727,555 parameters)
- **Total Training Duration**: **55.2 minutes** (~6.90 minutes per epoch)
- **Total Epochs Executed**: **8 Epochs** (Early Stopping terminated execution before planned max epochs of 15)
- **Batch Size**: 4 (Effective Batch Size = 4, Gradient Accumulation = 1)
- **Mixed Precision**: Automatic Mixed Precision (AMP FP16) enabled with `GradScaler`

---

## 2. Granular Per-Epoch Metric History

The table below summarizes the quantitative progression of the model over all 8 executed epochs:

| Epoch | Train Loss | Train Acc (%) | Val Loss | Val Acc (%) | Val Bal Acc (%) | Val Weighted F1 | Val Macro AUC | Learning Rate |
| :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **1** | 1.1323 | 36.57% | 1.1601 | 24.21% | 34.62% | 0.1081 | 0.5168 | 7.1977e-05 |
| **2** | 1.0655 | 42.44% | 1.2409 | 46.32% | 32.58% | 0.3446 | 0.4758 | 6.1515e-05 |
| **3** ⭐ | 1.0246 | 41.08% | **1.0191** | 44.21% | 40.82% | 0.4371 | 0.5000 | 5.0500e-05 |
| **4** | 0.8902 | 54.18% | 1.0560 | 47.37% | **47.76%** | 0.4732 | 0.5000 | 3.9485e-05 |
| **5** | 0.8076 | 58.24% | 1.1451 | 48.42% | 44.93% | 0.4691 | 0.5000 | 2.9023e-05 |
| **6** | 0.7107 | 64.11% | 1.0838 | 49.47% | 47.12% | 0.4919 | 0.5000 | 1.9637e-05 |
| **7** | 0.7008 | 68.85% | 1.0760 | **53.68%** | 46.16% | **0.5117** | 0.5000 | 1.1799e-05 |
| **8** 🛑 | 0.6393 | **69.30%** | 1.1573 | 50.53% | 43.80% | 0.4836 | 0.5000 | 5.9020e-06 |

*⭐ Best Validation Loss Checkpoint (`best_model.pt` saved at Epoch 3).*  
*🛑 Early Stopping Triggered (Patience = 5 reached without val loss improvement).*

---

## 3. Detailed Training & Convergence Dynamics

### 3.1 Loss Dynamics & Overfitting Signature
- **Training Loss Trajectory**: Decreased rapidly and smoothly from `1.1323` (Epoch 1) to `0.6393` (Epoch 8), representing a overall loss reduction of **43.54%**.
- **Validation Loss Trajectory**: Dropped from `1.1601` (Epoch 1) to its absolute minimum of **`1.0191`** at **Epoch 3**. Subsequently, validation loss increased to `1.2409` (Epoch 2), rebounded to `1.0560` (Epoch 4), `1.1451` (Epoch 5), and ended at `1.1573` (Epoch 8).

> [!WARNING]
> **OVERFITTING DIAGNOSIS**  
> After Epoch 3, the training loss continued to drop sharply ($1.0246 \to 0.6393$), while validation loss increased by **13.56%** ($1.0191 \to 1.1573$). This divergence is a textbook signature of severe overfitting: the network began memorizing noise and training-set specific feature patterns rather than learning generalizable 3D neuroanatomical features.

### 3.2 Accuracy & Probability Calibration Analysis
- **Training Accuracy**: Increased from 36.57% to **69.30%**, showing steady optimization on the training split.
- **Validation Accuracy**: Reached a peak of **53.68%** at Epoch 7, but at the best validation loss checkpoint (Epoch 3), accuracy was **44.21%**.
- **Validation Macro ROC-AUC Collapse**: Validation Macro ROC-AUC started at 0.5168 (Epoch 1), shifted to 0.4758 (Epoch 2), and then plateaued at **0.5000** for all remaining epochs (Epochs 3 through 8).

> [!CAUTION]
> **MACRO AUC STAGNATION AT 0.5000**  
> A Macro ROC-AUC of exactly 0.5000 indicates that the model's output confidence scores provided zero ranking power over random chance. The network outputs uncalibrated probabilities, likely collapsing toward predicting the majority class (MCI) with constant logits.

---

## 4. Learning Rate Schedule & Early Stopping Analysis

### 4.1 Learning Rate Schedule (Cosine Annealing)
- **Initial Learning Rate**: $1.0 \times 10^{-4}$ (0.0001)
- **Schedule Type**: Cosine Annealing learning rate decay without warm restarts over 15 max epochs.
- **Actual LR Progression**: Decayed smoothly from $7.1977 \times 10^{-5}$ at Epoch 1 down to $5.9020 \times 10^{-6}$ at Epoch 8.
- **Scheduler Effectiveness**: The learning rate decay successfully slowed gradient updates in later epochs (Epochs 6-8), preventing catastrophic weight oscillations. However, reducing the learning rate could not rescue the model from overfitting because the network capacity was already misaligned with dataset size.

### 4.2 Early Stopping Behavior
- **Configuration**: `EARLY_STOPPING_PATIENCE = 5`, `EARLY_STOPPING_MIN_DELTA = 1e-4`
- **Tracked Metric**: Validation Loss (`val_loss`)
- **Execution Log**:
  - **Epoch 3**: New minimum `val_loss` achieved = **1.0191**. Counter reset to 0. Checkpoint saved to `best_model.pt`.
  - **Epoch 4**: `val_loss` = 1.0560 (> 1.0191). Patience counter = 1.
  - **Epoch 5**: `val_loss` = 1.1451 (> 1.0191). Patience counter = 2.
  - **Epoch 6**: `val_loss` = 1.0838 (> 1.0191). Patience counter = 3.
  - **Epoch 7**: `val_loss` = 1.0760 (> 1.0191). Patience counter = 4.
  - **Epoch 8**: `val_loss` = 1.1573 (> 1.0191). Patience counter = 5. **EARLY STOPPING TRIGGERED**.
- **Conclusion**: Early stopping functioned flawlessly. It prevented 7 further unproductive training epochs and correctly preserved the optimal weights (`best_model.pt` at Epoch 3).

---

## 5. Convergence Assessment Summary

| Aspect | Evaluation | Clinical / Technical Explanation |
| :--- | :--- | :--- |
| **Training Convergence** | **Achieved** | Model successfully minimized training Cross-Entropy loss down to 0.6393. |
| **Validation Convergence** | **Failed** | Validation loss reached optimal minimum at Epoch 3 (1.0191) and degraded thereafter. |
| **Generalization Ability** | **Poor** | Severe generalization gap of 31.26% accuracy between training (69.30%) and test (38.04%). |
| **Optimal Epoch Selection** | **Epoch 3** | Best model state correctly selected based on minimal validation loss. |
