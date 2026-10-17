# NeuroSense Acoustic — Final Handoff

This folder is the consolidated, final deliverable of the NeuroSense acoustic (V2 extended-training) workstream: the final epoch-15 checkpoints, validation and frozen-test probability outputs, feature-ablation results, figures, and the training notebook.

## Folder contents

```
Acoustic/
├── 00_README_ACOUSTIC_HANDOFF.md            ← this file
├── model/
│   ├── best_model.pt                        ← final V2 extended-training best checkpoint
│   └── latest_checkpoint.pt                 ← final V2 extended-training latest checkpoint
├── predictions/
│   ├── epoch15_validation_probabilities.csv
│   └── epoch15_frozen_test_probabilities.csv
├── results/
│   ├── epoch15_validation_report.txt
│   └── epoch15_feature_ablation_results.csv
├── ablation/
│   └── epoch15_feature_ablation_predictions.csv
├── figures/
│   ├── epoch15_validation_confusion_matrix.png
│   └── epoch15_validation_threshold_analysis.png
└── code/
    └── NeuroSense_v2_Training.ipynb
```

All files are copies. The originals in Drive were not modified, renamed, or deleted.
Note: no `acoustic_participant_metrics.json` exists in the source material — it was deliberately omitted rather than fabricated.

## Final model configuration

- **Checkpoints:** PyTorch (`.pt`) files from the final V2 extended-training run: `best_model.pt` (best) and `latest_checkpoint.pt` (latest).
- **Training code:** `code/NeuroSense_v2_Training.ipynb` (copied as-is from Drive).
- **Reported epoch:** 15.

## Final results

### Epoch-15 validation (recording level, n = 92; 40 control, 52 dementia)

| Metric | Value |
|---|---:|
| Accuracy | 0.6630 |
| Balanced accuracy | 0.6933 |
| Control recall | 0.9250 |
| Dementia recall | 0.4615 |
| Control precision / F1 | 0.5692 / 0.7048 |
| Dementia precision / F1 | 0.8889 / 0.6076 |
| Macro avg F1 | 0.6562 |
| Weighted avg F1 | 0.6498 |

Confusion matrix: `[[37, 3], [28, 24]]` (rows: actual control/dementia; cols: predicted control/dementia).

Source: `results/epoch15_validation_report.txt`. Per-recording probabilities in `predictions/epoch15_validation_probabilities.csv`.

### Feature ablation (recording level, n = 92)

| Condition | Accuracy | Balanced acc. | Control recall | Dementia recall | FP | FN |
|---|---:|---:|---:|---:|---:|---:|
| fusion | 0.6630 | 0.6933 | 0.925 | 0.4615 | 3 | 28 |
| acoustic_only | 0.4348 | 0.5000 | 1.000 | 0.0000 | 0 | 52 |
| affective_only | 0.6522 | 0.6808 | 0.900 | 0.4615 | 4 | 28 |

Source: `results/epoch15_feature_ablation_results.csv`; per-recording condition predictions in `ablation/epoch15_feature_ablation_predictions.csv` (columns include `participant_id`, `actual_label`, and per-condition predictions/probabilities for fusion, acoustic_only, and affective_only).

Takeaways from the ablation (as recorded in the source files):
- The acoustic-only condition detects no dementia cases at all (dementia recall 0.0, 52 false negatives) — it predicts control for every recording.
- The affective-only condition reaches nearly the fusion accuracy (0.6522 vs 0.6630) with the same dementia recall (0.4615).
- The fusion condition has the highest accuracy and balanced accuracy of the three.

### Frozen test

Per-recording frozen-test probabilities are in `predictions/epoch15_frozen_test_probabilities.csv`. No frozen-test metrics summary file exists in the source material, so none is reported here.

## Limitations

- **Recording-level metrics only:** the saved report and CSVs are at the recording level (n = 92); no participant-aggregated metrics file exists for the acoustic stream.
- **Weak dementia detection:** dementia recall is 0.4615 on validation (28 of 52 dementia recordings missed); the model is strongly biased toward predicting control (control recall 0.925).
- **Small sample:** 92 recordings; treat all metrics as estimates with wide confidence intervals.
- **Not a diagnostic instrument:** research-grade results, not a validated clinical or medical-device tool.
- **Ablation is descriptive:** the ablation compares three fixed conditions on the same validation recordings; it is not a new experiment.

## Notes for integration

- For downstream fusion/integration work, use the saved probability CSVs (`predictions/`) rather than refitting or re-running the checkpoints.
- The participant-level fusion comparison (`nlp_vs_acoustic_participant_comparison.csv`) lives in the sibling `Fusion/` folder.

---

*Assembled 2026-10-05 from the final NeuroSense V2 acoustic artefacts in Google Drive (`NeuroSense_Checkpoints_v2/extended_training/`, `feature_ablation/`). All figures in this file are copied verbatim from the source report and CSV files listed above.*
