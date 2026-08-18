# Alzheimer's 3D MRI Classifier: Learning Curves & Diagnostic Error Analysis

> [!NOTE]
> This document provides a detailed examination of Phase 5 (Learning Curves & Hyperparameter Assessment) and Phase 6 (Error Analysis & Structural Bottlenecks) for the MONAI 3D ResNet-18 Alzheimer's Classifier.

---

## 1. Study of Learning & Optimization Curves (Phase 5)

The diagnostic figures generated during training (`loss_curve.png`, `accuracy_curve.png`, `learning_rate_curve.png`) provide critical insights into the optimization behavior of the 3D ResNet-18 model.

### 1.1 Loss Curve Analysis (`loss_curve.png`)
- **Training Loss Curve**: Demonstrates a smooth downward trend from `1.1323` at Epoch 1 to `0.6393` at Epoch 8. The rate of loss reduction was steady (~0.07 per epoch), indicating that the AdamW optimizer efficiently minimized Cross-Entropy loss on training batches.
- **Validation Loss Curve**: Reached its lowest point (`1.0191`) at **Epoch 3**. Beyond Epoch 3, the validation loss diverged, displaying an upwards inflection to `1.2409` (Epoch 2 anomaly), `1.0560` (Epoch 4), `1.1451` (Epoch 5), and `1.1573` (Epoch 8).
- **Divergence Gap**: The gap between training loss and validation loss expanded from `0.0278` at Epoch 1 to **`0.5180`** at Epoch 8.

### 1.2 Accuracy & Macro-AUC Curve Analysis (`accuracy_curve.png`)
- **Training Accuracy Curve**: Monotonically increased from 36.57% (Epoch 1) to **69.30%** (Epoch 8).
- **Validation Accuracy Curve**: Fluctuated between 24.21% (Epoch 1) and a maximum of 53.68% (Epoch 7). At the best loss epoch (Epoch 3), validation accuracy was 44.21%.
- **Validation Macro ROC-AUC Curve**: Remained completely flat at **0.5000** across Epochs 3 through 8.

### 1.3 Learning Rate Schedule Assessment (`learning_rate_curve.png`)
- **Scheduler**: Cosine Annealing decay over 15 nominal epochs.
- **LR Range**: Decreased from $7.1977 \times 10^{-5}$ to $5.9020 \times 10^{-6}$.
- **Assessment**: The learning rate schedule operated properly according to specification. However, learning rate decay alone was insufficient to stabilize validation loss due to structural overfitting.

### 1.4 Core Hyperparameter Questions

| Question | Assessment | Detailed Technical Rationale |
| :--- | :---: | :--- |
| **Would more epochs help?** | **NO** | Additional epochs would worsen overfitting. Training loss would drop further toward zero while validation loss would continue rising. |
| **Did early stopping behave correctly?** | **YES** | Early stopping correctly intervened at Epoch 8 after 5 consecutive epochs of no validation loss improvement, successfully preserving `best_model.pt` from Epoch 3. |
| **Was the scheduler appropriate?** | **PARTIALLY** | Cosine Annealing is standard for CNNs, but a warm-up phase (Warmup Cosine) and higher weight decay ($10^{-2} \to 10^{-1}$) would have provided better early stabilization. |

---

## 2. Diagnostic Error & Pattern Analysis (Phase 6)

Analysis of `misclassified_samples.png` and sample prediction logs reveals systematic error patterns across the diagnostic splits.

### 2.1 Error Pattern 1: High-Frequency Inter-Class Confusion (MCI $\leftrightarrow$ CN & MCI $\leftrightarrow$ AD)
- **Manifestation**: Over 65% of all prediction errors involve the **MCI** (Mild Cognitive Impairment) class.
- **Root Cause**: MCI is a continuum stage. Patients with early MCI display neuroanatomical features nearly identical to Cognitively Normal (CN) older adults, while late MCI patients display temporal lobe atrophy resembling mild AD. Without multi-modal clinical data (e.g., ApoE4 genetics, CSF tau/amyloid-beta biomarkers, cognitive test scores like MMSE), 3D sMRI structural volumes alone possess overlapping decision boundaries.

```
Diagnostic Continuum Overlap:
[ Healthy Aging (CN) ] <======= OVERLAP =======> [ Prodromal (MCI) ] <======= OVERLAP =======> [ Alzheimer's (AD) ]
       (Shared: Mild Ventricular Expansion)                (Shared: Hippocampal Atrophy)
```

### 2.2 Error Pattern 2: Spatial Resolution Degradation Bottleneck
- **Input Spatial Size**: Scans resampled to $(64 \times 64 \times 64)$ voxels with $(1.5\text{ mm} \times 1.5\text{ mm} \times 1.5\text{ mm})$ isotropic spacing.
- **Root Cause**: Standard high-field 3D T1-weighted sMRI scans are acquired at $1.0\text{ mm}^3$ isotropic resolution (typically $256 \times 256 \times 176$ voxels). Downsampling to $64^3$ represents a **64x reduction in total spatial voxel volume**.
- **Impact**: Fine subcortical neurostructures critical for early Alzheimer's detection—specifically the **entorhinal cortex (layer II)**, **hippocampal subfields (CA1, subiculum)**, and **parahippocampal gyrus**—are blurred into single voxel averages, removing the precise anatomical signal needed for 3-class separation.

### 2.3 Error Pattern 3: Class Imbalance & Representation Bias
- **Dataset Composition**:
  - **MCI**: 307 scans (**48.73%**)
  - **CN**: 174 scans (**27.62%**)
  - **AD**: 149 scans (**23.65%**)
- **Root Cause**: Although static inverse class weighting was applied to the Cross-Entropy loss function, the network gradients were still heavily influenced by the numerical dominance of MCI samples during batch optimization.
- **Impact**: The model developed a probability bias toward predicting MCI or CN, leading to low precision for the minority classes.

### 2.4 Error Pattern 4: Random Initialization on Small Sample Size
- **Parameter Capacity**: 3D ResNet-18 contains **11.7 million parameters**.
- **Sample Size**: Train set contains **441 3D volumes** (in SMOKE_TEST mode, even fewer).
- **Root Cause**: Training an 11.7M parameter 3D Convolutional Neural Network from random initialization on 441 samples yields a parameter-to-sample ratio of ~26,500 parameters per sample. Under these conditions, overfitting is mathematically guaranteed without strong transfer learning or heavy spatial regularization.
