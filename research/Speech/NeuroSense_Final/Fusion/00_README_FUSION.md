# NeuroSense Fusion — Research Handoff & Architecture

This directory preserves the final research fusion deliverables for NeuroSense AI: participant-level late probability fusion of the linguistic (NLP) and acoustic streams, along with historical benchmarking artifacts.

> **Production Note**: In the active NeuroSense AI web application, fusion has evolved into the **Two-Tier Hybrid Multimodal Fusion Engine** (`backend/app/ml/fusion/engine.py`), which expands beyond binary speech fusion to integrate 3D Brain MRI, Voice Acoustics DSP, Speech NLP, Cognitive battery testing, and Clinical Risk profiling with dynamic uncertainty variance and missing modality re-weighting.

---

## 📂 Folder Contents

```
Fusion/
├── 00_README_FUSION.md                              ← This documentation file
├── predictions/
│   └── final_70_30_fusion_participant_predictions.csv
└── results/
    └── nlp_vs_acoustic_participant_comparison.csv
```

All files in this folder are verbatim research copies of Google Drive deliverables.

---

## 🔬 Research Fusion Methodology

**Participant-Level Late Probability Fusion** with fixed weights:

$$P_{\text{fusion}} = 0.70 \times P_{\text{NLP}} + 0.30 \times P_{\text{acoustic}}$$

- $P_{\text{NLP}}$: Participant-level dementia probability from the DistilBERT NLP stream (`dementia_probability`).
- $P_{\text{acoustic}}$: Participant-level dementia probability from the acoustic V2 stream (`acoustic_probability`).
- **Classification Threshold**: Hard decision boundary at $0.5$ ($P_{\text{fusion}} \ge 0.5 \implies \text{Dementia}$).

*Integrity Check*: The formula holds exactly across all 37 test participants in `final_70_30_fusion_participant_predictions.csv`.

---

## 📊 Research Benchmarks (Participant Level, $n = 37$)

| Metric | Research Value | Note |
|---|---|---|
| **Accuracy** | **75.68%** (28/37) | Combined cross-modal test set |
| **Sensitivity (Dementia Recall)** | **68.97%** (20/29) | Primary clinical target |
| **Specificity (Control Recall)** | **100.0%** (8/8) | Zero false positives on controls |
| **Confusion Matrix (TN / FP / FN / TP)** | **8 / 0 / 9 / 20** | Conservative thresholding |

### Data Columns in `predictions/final_70_30_fusion_participant_predictions.csv`
`participant_id, actual_label, acoustic_probability, n_recordings_acoustic, acoustic_prediction, numeric_label, dementia_probability, n_recordings_nlp, prediction, fusion_probability, fusion_prediction, fusion_correct`

---

## 🧬 Evolution into Production Two-Tier Hybrid Fusion

In the production software (`backend/app/ml/fusion/engine.py`):

1. **Tier 1 (Cross-Modal Speech Gating)**:
   - Voice acoustic instability (Jitter, Shimmer, HNR, pauses) modulates the linguistic DistilBERT semantic confidence.
2. **Tier 2 (Attentive Evidential Decision Fusion)**:
   - Fuses all 5 diagnostic streams: **MRI** ($W_0 = 0.40$), **Speech NLP** ($W_1 = 0.20$), **Acoustics** ($W_2 = 0.15$), **Cognitive MMSE** ($W_3 = 0.15$), and **Clinical Risk** ($W_4 = 0.10$).
   - Dynamically re-normalizes weights to $100\%$ when any modality is missing.
   - Calculates **Epistemic Uncertainty** ($\sigma^2$) and **Modality Agreement** (Full, High, Moderate, Low).

---

## ⚠️ Research Caveats & Limitations

- **Small Evaluation Sample**: $n = 37$ participants; metrics represent experimental research figures with wide confidence intervals.
- **Fixed Linear Combination**: The 70/30 split was a fixed heuristic from research experiments, superseded in production by dynamic confidence-weighted evidential fusion.
- **Non-Diagnostic**: For academic research, translational medicine evaluation, and educational demonstration only.
