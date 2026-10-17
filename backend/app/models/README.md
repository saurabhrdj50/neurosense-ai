# Model Artefacts — Provenance & Model Cards

This directory contains the machine learning model checkpoints, transformers, and classifiers utilized by NeuroSense AI for multimodal Alzheimer's screening.

> **⚠️ Clinical Scope Disclaimer** — Every model in this system is an experimental screening instrument intended exclusively for research, training, and clinical decision-support evaluation. Model outputs represent statistical signals, not standalone diagnostic conclusions, and must never replace independent clinical evaluations by qualified healthcare professionals.

---

## 📦 Runtime Checkpoints Overview

Model checkpoints are intentionally excluded from git tracking (`*.pth`, `*.pt`, `*.joblib` are gitignored) to maintain repository portability. A fresh clone runs with built-in heuristic/synthetic fallbacks for testing, while production and research deployments provision real checkpoints into this directory:

| File | Modality | Architecture / Pipeline | Output / Classes | Size | Source Lineage |
|---|---|---|---|---|---|
| `alzheimer_model.pth` | **Brain MRI** | ResNet-18 (single backbone) + fine-tuned linear classification head | 3 classes: `CN` (Cognitively Normal), `MCI` (Mild Cognitive Impairment), `AD` (Alzheimer's Disease) | ~43 MB | `Alzheimer_Training/best_mri_resnet18_finetuned.pth` |
| `speech/distilbert_only_model.joblib` | **Speech Language (NLP)** | DistilBERT 768-dim mean-pooled embeddings → StandardScaler → balanced LogisticRegression | 2 classes: `Control` (0), `Dementia` (1) → $P(\text{dementia})$ | ~26 KB | `Speech/NeuroSense_Final/NLP/model/distilbert_only_model.joblib` |
| *Whisper Cache* | **Speech ASR** | Local `faster-whisper` CTranslate2 (`base` / `turbo`) | Automated transcript + timestamped hesitation tokens | Auto-cached | HuggingFace / OpenAI Whisper |
| *In-Process DSP* | **Acoustic Voice** | Librosa / OpenSMILE / SciPy DSP extraction pipeline | Pitch $F_0$, Jitter %, Shimmer %, HNR dB, Formants, Pauses, Vocal Risk Index | Code (0 MB) | `backend/app/ml/speech/acoustic_biomarkers.py` |

---

## 🧠 Brain MRI Model — `alzheimer_model.pth`

### 1. Model Architecture & Checkpoint Shape
- **Backbone**: Standard PyTorch TorchVision ResNet-18 feature extractor.
- **Classifier Head**: Linear layer `(in_features=512, out_features=3)`.
- **Checkpoint Structure**: PyTorch `state_dict` loaded securely via `torch.load(..., weights_only=True)`.
- **Integrity MD5**: `f36aa42f5e864d705bfe3250380cbb5e` (verified byte-identical to `Alzheimer_Training/best_mri_resnet18_finetuned.pth`).

### 2. Class Mapping (ADNI 3-Class)
```python
CLASS_MAPPING = {
    0: "Cognitively Normal (CN)",
    1: "Mild Cognitive Impairment (MCI)",
    2: "Alzheimer's Disease (AD)"
}
```
*Note: In the multimodal fusion engine, predictions are unified onto the 4-stage clinical nomenclature (`CN`, `MCI`, `Mild Dementia`, `Moderate Dementia`).*

### 3. Preprocessing & Input Dimensions
- **Input Tensor**: `[B, 3, 224, 224]` normalized using ImageNet standard parameters (`mean=[0.485, 0.456, 0.406]`, `std=[0.229, 0.224, 0.225]`).
- **NIfTI 3D Handling**: Ingests `.nii` / `.nii.gz` volumes, identifies middle/representative axial slices around the hippocampus, skull-strips or window-levels intensities, and converts slices to normalized RGB tensors.

### 4. Explainability (Grad-CAM)
- Generates saliency heatmaps targeting the final convolutional block (`layer4`) of ResNet-18.
- Produces normalized activation grids indicating localized structural atrophy in temporal and hippocampal regions.

### 5. Performance Metrics (ADNI Validation Cohort, $n=95$)
- **Accuracy**: $58.95\%$
- **Macro F1**: $0.5725$
- **Balanced Accuracy**: $0.5660$
- *Clinical Context*: 3-way multi-class differentiation between CN, MCI, and early AD on raw neuroimaging is notoriously complex; in NeuroSense AI, MRI is treated as a weighted contributor ($W = 0.40$) within the Two-Tier Hybrid Fusion engine rather than an isolated diagnosis.

---

## 🎙️ Speech NLP Model — `speech/distilbert_only_model.joblib`

### 1. Pipeline Architecture
```
Input Audio/Transcript ──► DistilBERT Tokenizer (distilbert-base-uncased)
                       ──► DistilBERT Transformer Encoder (768-dim)
                       ──► Attention-Masked Mean Pooling
                       ──► StandardScaler (fitted on Pitt training cohort)
                       ──► LogisticRegression (class_weight='balanced')
                       ──► P(dementia) in [0.0, 1.0]
```

### 2. Validation & Test Benchmarks (Pitt Corpus)
- **Validation ($n=51$ participants, 92 recordings)**:
  - Accuracy: **82.35%**
  - Balanced Accuracy: **83.84%**
  - Dementia Recall (Sensitivity): **78.79%**
  - Precision: **92.86%**
  - ROC-AUC: **0.8670** | PR-AUC: **0.9408**
- **Frozen Held-Out Test ($n=37$ participants, 69 recordings)**:
  - Participant Accuracy: **78.38%**
  - ROC-AUC: **0.8793** | PR-AUC: **0.9688**

### 3. Missing Checkpoint & Cold-Start Resilience
- Implemented as a thread-safe lazy singleton in [`app/ml/speech/nlp_classifier.py`](../ml/speech/nlp_classifier.py).
- If the `.joblib` model file is not present, or if transcript word count is below threshold ($<15$ words), the classifier gracefully yields `available=False`, allowing the multimodal fusion engine to dynamically redistribute weight to active modalities with **zero crash risk**.

---

## 🗣️ Acoustic Biomarkers & Whisper ASR

### 1. Acoustic Biomarkers DSP Engine
- Fully autonomous Python DSP pipeline (`app/ml/speech/acoustic_biomarkers.py`) using Librosa, SciPy, and OpenSMILE (eGeMAPSv02).
- Extracts acoustic correlates of neuromotor speech degradation:
  - **Fundamental Frequency ($F_0$ Pitch)**: Pitch stability and range.
  - **Local Jitter (%)**: Cycle-to-cycle frequency variation (normal $<1.04\%$).
  - **Local Shimmer (%)**: Cycle-to-cycle amplitude perturbation (normal $<3.81\%$).
  - **Harmonics-to-Noise Ratio (HNR in dB)**: Glottal closure efficiency (normal $>15\text{ dB}$).
  - **Formants ($F_1, F_2$)**: Articulatory centralization and acoustic vowel space.
  - **Speech Rate & Pauses**: Hesitations, pauses $>250\text{ms}$, phonation time ratio.
  - **Vocal Risk Index ($0-100$)**: Multi-metric weighted hazard score.

### 2. Whisper ASR (Speech-to-Text)
- Utilizes `faster-whisper` based on CTranslate2 for ultra-fast, memory-efficient CPU/GPU transcription.
- Automatically caches downloaded Whisper models to `~/.cache/huggingface` (or the `neuro_hf` Docker named volume).

---

## 🛠️ Setup Instructions for Collaborators & Friends

If you or your collaborators want to use the pre-trained checkpoints:

1. **Verify or create destination folders**:
   ```bash
   mkdir -p backend/app/models/speech
   ```

2. **Copy checkpoints**:
   - Copy `best_mri_resnet18_finetuned.pth` from `Alzheimer_Training/` to `backend/app/models/alzheimer_model.pth`.
   - Copy `distilbert_only_model.joblib` from `Speech/NeuroSense_Final/NLP/model/` to `backend/app/models/speech/distilbert_only_model.joblib`.

3. **Verify Checkpoint Placement**:
   ```bash
   ls -lh backend/app/models/
   ls -lh backend/app/models/speech/
   ```

4. **Testing Without Checkpoints**:
   - If checkpoints are omitted, NeuroSense automatically uses built-in heuristic models for MRI and speech, allowing all API endpoints, frontend views, and Docker containers to run cleanly for development and demonstrations!
