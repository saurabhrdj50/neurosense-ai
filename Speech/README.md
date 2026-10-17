# Speech AI — Production Engines & Research Workspace

This directory houses the research artifacts, model handoffs, validation datasets, and historical experiment archives for the **Speech & Voice Analysis Subsystem** of NeuroSense AI.

---

## 🌟 Executive Overview: Production vs. Research Streams

In NeuroSense AI, speech analysis operates across two synchronized streams: **Acoustic Digital Signal Processing (Voice Motorics)** and **Linguistic Transformer NLP (Language & Semantics)**.

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 Patient Audio Recording                 │
                  │             (WAV / WebM / MP3 / Microphone)             │
                  └────────────────────────────┬────────────────────────────┘
                                               │
                       ┌───────────────────────┴───────────────────────┐
                       │                                               │
                       ▼                                               ▼
         ┌───────────────────────────┐                   ┌───────────────────────────┐
         │   Acoustic DSP Engine     │                   │   Whisper ASR Engine      │
         │ (Librosa / OpenSMILE)     │                   │  (faster-whisper CTrans2) │
         └─────────────┬─────────────┘                   └─────────────┬─────────────┘
                       │                                               │
                       │ Jitter, Shimmer,                              ▼
                       │ HNR, Formants, Pauses           ┌───────────────────────────┐
                       │                                 │   DistilBERT NLP Model    │
                       │                                 │ (768-dim Embedding + LR)  │
                       │                                 └─────────────┬─────────────┘
                       │                                               │
                       │                                               │ P(Dementia)
                       ▼                                               ▼
         ┌───────────────────────────────────────────────────────────────────────────┐
         │             Tier 1: Feature-Level Cross-Modal Speech Fusion               │
         │    (Acoustic vocal micro-tremors contextually modulate language signals)  │
         └─────────────────────────────────────┬─────────────────────────────────────┘
                                               │
                                               ▼
                             To Tier 2 Evidential Multimodal Fusion
```

| Stream / Modality | Technology / Architecture | Role & Primary Metrics | Deployment Status |
|---|---|---|---|
| **Linguistic NLP** | DistilBERT 768-dim mean-pooled embeddings → StandardScaler → balanced Logistic Regression | Semantic impoverishment, vocabulary density (TTR), $P(\text{dementia})$ screening probability.<br>**Validation Acc: 82.35%**, **ROC-AUC: 0.8670** ($n=51$) | ✅ **LIVE IN PRODUCTION** (`backend/app/ml/speech/nlp_classifier.py`) |
| **Acoustic Biomarkers** | Multi-feature Digital Signal Processing (Librosa, SciPy, OpenSMILE eGeMAPSv02) | Vocal motor control, cycle-to-cycle perturbation (Jitter, Shimmer), vocal breathiness (HNR), formant centralization ($F_1, F_2$), pause ratio, and composite **Vocal Risk Index** ($0-100$). | ✅ **LIVE IN PRODUCTION** (`backend/app/ml/speech/acoustic_biomarkers.py`) |
| **Speech-to-Text (ASR)** | Local `faster-whisper` CTranslate2 model (`base` / `turbo`) | Fast, local speech transcription with automatic hesitation markers (`[pause]`, `[um]`, `[ah]`) in English, Hindi, and Marathi. | ✅ **LIVE IN PRODUCTION** (`backend/app/ml/speech/transcriber.py`) |
| **Acoustic Deep Learning** | 2-branch Wav2Vec2 + DistilRoBERTa fusion checkpoint (`NeuroSense_Final/Acoustic/`) | Research experiment epoch-15 checkpoint. Parked because feature-extractor code was absent from source Drive and ablation confirmed acoustic-only branch had 0.0 recall. | 📁 **RESEARCH ARCHIVE** (Documented in `Acoustic/`) |
| **Fixed 70/30 Late Fusion** | Linear probability combination ($0.70 P_{\text{NLP}} + 0.30 P_{\text{acoustic}}$) | Research baseline ($n=37$ participants, 75.68% accuracy). Superseded in production by Two-Tier Hybrid Multimodal Fusion. | 📁 **RESEARCH ARCHIVE** (Documented in `Fusion/`) |

---

## 🎙️ 1. Live Production Acoustic Biomarkers Engine

Implemented in [`backend/app/ml/speech/acoustic_biomarkers.py`](../backend/app/ml/speech/acoustic_biomarkers.py), this engine analyzes vocal micro-tremors and motor dysprosody without needing external cloud APIs:

1. **Fundamental Frequency ($F_0$ Pitch)**:
   - Extracted via Yin / Pyin pitch tracking algorithm.
   - Measures pitch stability, standard deviation, and dynamic pitch range.
2. **Local Jitter (%)**:
   - Quantifies cycle-to-cycle variation in fundamental frequency.
   - Healthy threshold: $<1.04\%$. Elevated values indicate vocal fold micro-tremors and motor control degradation.
3. **Local Shimmer (%)**:
   - Quantifies cycle-to-cycle variation in speech waveform amplitude.
   - Healthy threshold: $<3.81\%$. Elevated values indicate glottal adduction instability.
4. **Harmonics-to-Noise Ratio (HNR in dB)**:
   - Measures the ratio of acoustic harmonic energy to turbulent noise.
   - Healthy threshold: $>15.0\text{ dB}$. Lower values reflect breathiness and glottal leakage.
5. **Formant Frequencies ($F_1, F_2$)**:
   - Extracted using Linear Predictive Coding (LPC).
   - $F_1$ reflects tongue height, while $F_2$ reflects tongue advancement. Centralization of vowel acoustic space correlates with articulatory decline.
6. **Temporal & Pausometry Metrics**:
   - Silence ratio, hesitation count ($>250\text{ms}$ pauses), phonation time ratio, and speaking tempo.
7. **Composite Vocal Risk Index**:
   - Normalizes and aggregates multi-feature deviations into an intuitive $0 - 100$ score for clinical interpretation.

---

## 🧠 2. Live Production Linguistic NLP Classifier

Implemented in [`backend/app/ml/speech/nlp_classifier.py`](../backend/app/ml/speech/nlp_classifier.py):

- **Model Checkpoint**: [`backend/app/models/speech/distilbert_only_model.joblib`](../backend/app/models/README.md).
- **Inference Pipeline**:
  1. Transcript is tokenized with `distilbert-base-uncased`.
  2. Embeddings are extracted from the transformer's last hidden layer (768 dimensions) with attention masking.
  3. Mean pooling yields a fixed 768-dimensional participant semantic representation.
  4. Features are standardized via `StandardScaler` and classified via `LogisticRegression(class_weight='balanced')`.
  5. Outputs calibrated dementia screening probability $P(\text{dementia}) \in [0.0, 1.0]$.
- **Graceful Fallback**: If the `.joblib` model file is not provisioned, the system safely records `available=False`, allowing the fusion engine to re-weight active modalities dynamically.

---

## 📂 Directory Layout of Research Deliverables

```
Speech/
├── README.md                                 ← This documentation file
├── NeuroSense_Final/
│   ├── NLP/                                  ← Linguistic NLP research deliverables
│   │   ├── 00_README_NLP_HANDOFF.md          ← Comprehensive benchmark & error analysis
│   │   ├── model/distilbert_only_model.joblib← Primary trained classifier weights
│   │   ├── predictions/                      ← Participant & recording validation CSVs
│   │   ├── results/                          ← Master JSON metrics & comparison tables
│   │   └── code/                             ← NeuroSense_NLP_Research_Pipeline.ipynb
│   ├── Acoustic/                             ← Acoustic deep learning research deliverables
│   │   ├── 00_README_ACOUSTIC_HANDOFF.md     ← Checkpoint details & ablation findings
│   │   ├── model/best_model.pt               ← Epoch-15 checkpoint weights
│   │   ├── predictions/                      ← Epoch-15 probability CSVs
│   │   ├── results/                          ← Feature ablation comparison tables
│   │   └── code/                             ← NeuroSense_v2_Training.ipynb
│   ├── Fusion/                               ← Research late fusion deliverables
│   │   ├── 00_README_FUSION.md               ← Research 70/30 fusion methodology
│   │   └── predictions/                      ← Final 70/30 participant predictions CSV
│   └── results/                              ← Consolidated cross-stream results
```

---

## 🧪 Testing & Validation

Execute the speech automated test suite from the backend directory:

```bash
cd backend
source venv/bin/activate

# Test Acoustic DSP Biomarkers Engine
pytest tests/test_acoustic_biomarkers.py

# Test DistilBERT Linguistic NLP Classifier
pytest tests/test_speech_nlp.py

# Test Whisper ASR Transcriber & Audio Pipelines
pytest tests/test_speech.py
```

All tests run network-free and validate signal extraction, metric bounds, and edge cases (silent audio, noisy audio, short transcripts).
