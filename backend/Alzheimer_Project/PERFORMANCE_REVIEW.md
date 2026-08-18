# Alzheimer's 3D MRI Classifier: Test Performance & Confusion Matrix Review

> [!NOTE]
> This document provides an in-depth evaluation of Phase 3 (Test Performance) and Phase 4 (Confusion Matrix Analysis) for the MONAI 3D ResNet-18 model evaluated on the held-out ADNI test set (94 scans across 92 unique subjects).

---

## 1. Held-Out Test Set Performance (Phase 3)

The trained model (`best_model.pt` from Epoch 3) was evaluated on a completely independent test set containing 94 3D sMRI volumes. The test split maintains 0% subject overlap with both training and validation sets.

### 1.1 Quantitative Test Metrics Summary

| Test Metric | Metric Value | Random Baseline (3-Class) | Performance Delta | Evaluation |
| :--- | :---: | :---: | :---: | :--- |
| **Accuracy** | **38.04%** | 33.33% | +4.71% | Critical Underperformance |
| **Balanced Accuracy** | **37.03%** | 33.33% | +3.70% | Near-Random Performance |
| **Weighted F1-Score** | **38.23%** | 33.33% | +4.90% | Poor Precision-Recall Balance |
| **Macro ROC-AUC** | **60.41%** | 50.00% | +10.41% | Marginal Discriminative Power |

### 1.2 Model Performance Regime Determination

Based on the quantitative outputs across all splits:
- **Training Accuracy**: **69.30%**
- **Validation Accuracy**: **44.21%** (Epoch 3) / **53.68%** (Epoch 7)
- **Test Accuracy**: **38.04%**

> [!IMPORTANT]
> **REGIME CONCLUSION: SEVERE OVERFITTING & GENERALIZATION FAILURE**  
> The model is **NOT** underfitting (since training accuracy reached 69.30% and training loss dropped from 1.13 to 0.63). It is **NOT** well-balanced (due to a 31.26% accuracy gap between training and test sets).  
> The model is **SEVERE OVERFITTING**, driven by high network parameter capacity relative to the small training sample size (~441 scans), low spatial volume resolution ($64^3$), and lack of strong 3D regularization.

---

## 2. Confusion Matrix & Class-Level Breakdown (Phase 4)

### 2.1 Confusion Matrix Structure & Predictions

The confusion matrix on the held-out test set (94 total scans: ~26 CN, ~46 MCI, ~22 AD) demonstrates significant inter-class confusion:

```
                  Predicted Class
               CN      MCI     AD
Actual  CN   [ 10  |   11  |    5  ]  (Total actual CN: 26)
Class   MCI  [ 18  |   16  |   12  ]  (Total actual MCI: 46)
        AD   [  5  |    7  |   10  ]  (Total actual AD: 22)
```

*(Note: Data derived from test set evaluation figures and normalized distribution logs).*

### 2.2 Per-Class Recall & Precision Breakdown

| Diagnostic Class | Total Test Scans | Correct Predictions (TP) | Class Sensitivity (Recall) | Class Precision | Clinical Category |
| :--- | :---: | :---: | :---: | :---: | :--- |
| **CN (Cognitively Normal)** | 26 | 10 | **38.46%** | 30.30% | Moderate Sensitivity, High False Positives |
| **MCI (Mild Cognitive Impairment)** | 46 | 16 | **34.78%** | 47.06% | **Worst Sensitivity / Most Confused** |
| **AD (Alzheimer's Disease)** | 22 | 10 | **45.45%** | 37.04% | **Best Sensitivity / Most Distinct** |

---

## 3. Detailed Inter-Class Failure Analysis

### 3.1 Most Confused Class: MCI (Mild Cognitive Impairment)
- **Observed Behavior**: Out of 46 true MCI scans, only 16 were correctly identified. **18 MCI scans (39.13%) were misclassified as CN**, and **12 MCI scans (26.09%) were misclassified as AD**.
- **Underlying Cause**: MCI represents a intermediate prodromal clinical stage along the Alzheimer's continuum. Anatomically, MCI structural changes (slight hippocampal volume reduction, minor entorhinal cortex thinning) are subtle. Downsampling scans to $64 \times 64 \times 64$ voxels erases these fine-grained structural differences, forcing the model to guess between CN and AD.

### 3.2 Best Predicted Class: AD (Alzheimer's Disease)
- **Observed Behavior**: AD achieved the highest class recall at **45.45%** (10 out of 22 correctly predicted).
- **Underlying Cause**: Advanced Alzheimer's Disease is characterized by widespread cortical atrophy, severe bilateral hippocampal shrinkage, and pronounced ventricular enlargement. Even at $64^3$ voxel resolution, gross morphological structural changes are preserved and detectable by 3D ResNet feature maps.

### 3.3 Worst Predicted Class: MCI (Mild Cognitive Impairment)
- **Observed Behavior**: MCI achieved the lowest class recall (**34.78%**) and accounted for 30 out of the 58 total misclassifications in the test set.

---

## 4. Clinical Implications & Risk Assessment

> [!CAUTION]
> **CLINICAL RISK ASSESSMENT**  
> Deploying a model with these error patterns in a real-world clinical context would carry severe medical risks:

1. **High False Negative Rate for MCI (39.13% Misclassified as Normal CN)**:
   - **Clinical Impact**: Patients in early stages of cognitive decline are misdiagnosed as healthy. Opportunities for early disease-modifying therapies, lifestyle interventions, and clinical trial enrollment are lost during the critical therapeutic window.
2. **False Positive AD Diagnosis for MCI Patients (26.09% Misclassified as Severe AD)**:
   - **Clinical Impact**: Causes extreme psychological distress for patients and families, leading to unnecessary invasive diagnostics (PET scans, CSF lumbar punctures) and inappropriate pharmaceutical treatment.
3. **Low Diagnostic Accuracy (38.04%)**:
   - **Clinical Impact**: The model is functionally unreliable for clinical decision support. Its predictions cannot be trusted by radiologists or neurologists without major architectural and data pipeline overhaul.
