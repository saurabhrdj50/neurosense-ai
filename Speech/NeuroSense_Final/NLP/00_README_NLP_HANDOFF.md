# NeuroSense NLP — Final Handoff

This folder is the consolidated, final deliverable of the NeuroSense NLP (speech-based linguistic analysis) workstream. It contains the final selected model, all prediction outputs, results, linguistic analyses, figures, and the research pipeline notebook.

## Folder contents

```
NeuroSense_NLP_Final/
├── 00_README_NLP_HANDOFF.md              ← this file
├── model/
│   ├── distilbert_only_model.joblib      ← PRIMARY final model (DistilBERT-only)
│   └── validation_variants/
│       ├── distilbert_plus_linguistic_model.joblib
│       └── distilbert_plus_linguistic_textblob_model.joblib
├── predictions/
│   ├── validation_participant_predictions.csv
│   ├── validation_recording_predictions.csv
│   ├── frozen_test_participant_predictions.csv
│   └── frozen_test_recording_predictions.csv
├── results/
│   ├── NEUROSENSE_NLP_MASTER_RESULTS.json
│   ├── frozen_test_metrics.json
│   ├── final_comparison_table.csv
│   └── final_70_30_fusion_participant_predictions.csv
├── linguistic_analysis/
│   ├── validation_linguistic_statistical_analysis.csv
│   ├── validation_linguistic_control_vs_dementia.csv
│   ├── validation_sentiment_comparison.csv
│   ├── paper_ready_avg_word_length_result.csv
│   ├── paper_ready_nlp_misclassified_participants.csv
│   └── paper_ready_nlp_error_feature_analysis.csv
├── figures/
│   └── figure_avg_word_length_control_vs_dementia.png
└── code/
    └── NeuroSense_NLP_Research_Pipeline.ipynb
```

All files are copies. The originals in Drive were not modified, renamed, or deleted.

## Final model configuration

- **Primary model:** `model/distilbert_only_model.joblib` — DistilBERT-only configuration (final selected).
- **Architecture:** `distilbert-base-uncased` embeddings fed into a logistic regression classifier.
- **Decision threshold:** 0.5.
- **Validation variants** (kept in `model/validation_variants/` for reference only):
  - `distilbert_plus_linguistic_model.joblib` (adds hand-crafted linguistic features)
  - `distilbert_plus_linguistic_textblob_model.joblib` (adds linguistic + TextBlob sentiment features)

## Final results

### Validation (participant level, n = 51; 18 control, 33 dementia; 92 recordings)

Train: 362 recordings / 201 participants. Zero participant overlap between train and validation.

| Configuration | Accuracy | Balanced acc. | F1 | Precision | Dementia recall | Control recall | ROC-AUC | PR-AUC |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| distilbert_only (primary) | 0.8235 | 0.8384 | 0.8525 | 0.9286 | 0.7879 | 0.8889 | 0.8670 | 0.9408 |
| distilbert_plus_linguistic | 0.8235 | 0.8384 | 0.8525 | 0.9286 | 0.7879 | 0.8889 | 0.8586 | 0.9376 |
| distilbert_plus_linguistic_textblob | 0.8235 | 0.8384 | 0.8525 | 0.9286 | 0.7879 | 0.8889 | 0.8620 | 0.9382 |

Confusion matrix (validation, DistilBERT-only): TN=16, FP=2, FN=7, TP=26.

Source: `results/NEUROSENSE_NLP_MASTER_RESULTS.json`, `code` report `FROZEN_DISTILBERT_VALIDATION_REPORT.md`.

### Frozen held-out test (n = 37 participants; 20 control, 49 dementia recordings → 69 recordings)

No retraining on test data; no threshold tuning on test data.

| Level | Accuracy | Balanced acc. | F1 | Precision | Dementia recall | ROC-AUC | PR-AUC | Confusion |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Participant | 0.7838 | 0.8621 | 0.84 | 1.0 | 0.7241 | 0.8793 | 0.9688 | [[8, 0], [8, 21]] |
| Recording | 0.6522 | 0.7255 | 0.6923 | 0.9310 | 0.5510 | 0.7847 | 0.9101 | [[18, 2], [22, 27]] |

Source: `results/frozen_test_metrics.json`, `predictions/frozen_test_*_predictions.csv`.

### Linguistic analysis highlights

- 25 linguistic features tested; after FDR correction, **only `avg_word_length`** was statistically significant (control mean 3.9735 vs dementia mean 3.7484; raw p = 0.00017, FDR p = 0.00434, SMD = −1.178).
- Linguistic features tested include type-token ratios (TTR, RTTR, CTTR, MATTR), Brunet's W, Honoré's H, hapax ratio, repetition ratios (consecutive, bigram, trigram), filler counts/ratios, pronoun counts/ratios, stopword ratio, question count, pause markers, and sentence/word counts.
- Sentiment features: TextBlob polarity and subjectivity.
- Adding linguistic and/or sentiment features to DistilBERT did **not** change the validation confusion matrix or thresholded metrics; ROC-AUC differences across variants were marginal (≤ 0.0084).

### Error analysis (validation)

- 7 false negatives, 2 false positives; 9 misclassified participants total.
- 6 of the errors were high-confidence errors.
- Per-participant and per-feature error breakdowns are in `linguistic_analysis/paper_ready_nlp_misclassified_participants.csv` and `linguistic_analysis/paper_ready_nlp_error_feature_analysis.csv`.

## Limitations

- **Small sample sizes:** validation on 51 participants (92 recordings); frozen test on 37 participants (69 recordings). Treat all metrics as estimates with wide confidence intervals.
- **Recording-level performance drops on held-out test:** frozen-test recording-level accuracy (0.6522) and dementia recall (0.5510) are substantially lower than participant-level metrics; 8 dementia participants were missed entirely at the participant level.
- **Single corpus, single task:** results come from one speech corpus and one picture-description task; they do not generalize to other populations, languages, or speaking tasks.
- **Not a diagnostic instrument:** this is research-grade NLP analysis, not a validated clinical or medical-device tool.
- **Linguistic signal is weak:** only one of 25 linguistic features survived FDR correction; linguistic/sentiment feature additions provided no measurable gain over DistilBERT embeddings alone on validation.
- `results/final_comparison_table.csv` is an export of a working comparison sheet, not a peer-reviewed summary.

## Notes for integration

- For downstream fusion/integration work, use **`model/distilbert_only_model.joblib`** together with the saved prediction CSVs in `predictions/` — do not refit on the validation or test predictions.
- Participant-level probabilities (mean aggregation of recording probabilities) were used for the reported thresholded metrics; see `predictions/` for per-recording outputs.
- The frozen test protocol (no retraining, threshold fixed at 0.5) is documented in `results/frozen_test_metrics.json`.

---

*Assembled 2026-10-05 from the final NeuroSense NLP artefacts in Google Drive. All figures in this file are copied verbatim from the source JSON/CSV/report files listed above.*
