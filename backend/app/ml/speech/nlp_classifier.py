"""Speech-transcript dementia classifier (NeuroSense research model).

Wraps the frozen NLP artefact delivered in ``Speech/NeuroSense_Final/NLP/``:
a logistic-regression head over mean-pooled ``distilbert-base-uncased``
embeddings, trained on 362 picture-description transcripts (Pitt corpus).
The artefact itself lives at ``app/models/speech/distilbert_only_model.joblib``
(runtime asset, never versioned) and contains the fitted scaler + LR head.

Reported research performance (participant-level validation, n=51):
accuracy 0.8235, ROC-AUC 0.8670, dementia recall 0.7879. This is a
research-grade screening signal — NOT a validated clinical instrument and
NOT a calibrated probability; see the NLP handoff README limitations.

Inference recipe (from ``NeuroSense_NLP_Research_Pipeline.ipynb``):
tokenize transcript → mean-pool last hidden states (768-dim) →
StandardScaler → LogisticRegression → P(dementia) = predict_proba[:, 1],
decision threshold 0.5. The original embedding helper
(``speech_model.nlp.embeddings``) was not part of the delivered artefacts;
standard attention-masked mean pooling is used here and should be
re-validated against the saved prediction CSVs before clinical claims.
"""
import logging
import threading
from pathlib import Path
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

DECISION_THRESHOLD = 0.5
MODEL_TAG = 'distilbert-base-uncased+logreg'

_lock = threading.Lock()
_classifier: Optional['SpeechNLPClassifier'] = None
_classifier_failed = False


class SpeechNLPClassifier:
    """Lazy singleton around the DistilBERT encoder + joblib classifier head."""

    def __init__(self) -> None:
        from app.config.settings import Config

        self.model_path = Path(Config.MODEL_DIR) / 'speech' / 'distilbert_only_model.joblib'
        if not self.model_path.is_file():
            raise FileNotFoundError(f"Speech NLP artefact missing: {self.model_path}")

        import joblib
        import torch
        from transformers import AutoModel, AutoTokenizer

        artifact = joblib.load(self.model_path)
        self.head = artifact['model']           # LogisticRegression(768)
        self.scaler = artifact['scaler']        # StandardScaler(768), fit on train
        self.label_map = artifact.get('label_map') or {'control': 0, 'dementia': 1}

        self.device = 'cuda' if torch.cuda.is_available() else 'cpu'
        self.tokenizer = AutoTokenizer.from_pretrained('distilbert-base-uncased')
        self.encoder = AutoModel.from_pretrained('distilbert-base-uncased').to(self.device)
        self.encoder.eval()
        logger.info("Speech NLP classifier ready (device=%s, train_rows=%s).",
                    self.device, artifact.get('train_rows'))

    def _embed(self, text: str):
        """Mean-pool the encoder's last hidden states into one 768-dim vector."""
        import torch

        encoded = self.tokenizer(
            text, return_tensors='pt', truncation=True, max_length=512,
        ).to(self.device)
        with torch.inference_mode():
            hidden = self.encoder(**encoded).last_hidden_state
        mask = encoded['attention_mask'].unsqueeze(-1).to(hidden.dtype)
        pooled = (hidden * mask).sum(dim=1) / mask.sum(dim=1).clamp(min=1e-9)
        return pooled.squeeze(0).cpu().numpy().reshape(1, -1)

    def _compute_acoustic_risk(self, acoustic: Dict[str, Any]) -> Optional[float]:
        """Compute normalized acoustic motor speech / prosody risk (0.0 to 1.0)."""
        if not acoustic:
            return None
        flags = []
        jitter = acoustic.get('jitter_percent')
        if jitter is not None:
            flags.append(min(float(jitter) / 1.04, 2.0) - 1.0)
        shimmer = acoustic.get('shimmer_percent')
        if shimmer is not None:
            flags.append(min(float(shimmer) / 3.81, 2.0) - 1.0)
        hnr = acoustic.get('hnr_db')
        if hnr is not None:
            flags.append(1.0 - min(float(hnr) / 20.0, 1.5))
        pause_ratio = acoustic.get('pause_ratio')
        if pause_ratio is not None:
            flags.append(min(float(pause_ratio) / 0.25, 2.0) - 1.0)
        vocal_score = acoustic.get('vocal_risk_score')
        if vocal_score is not None:
            flags.append((float(vocal_score) / 100.0) * 2.0 - 1.0)

        if not flags:
            return None
        import numpy as np
        mean_flag = float(np.mean(flags))
        return float(1.0 / (1.0 + np.exp(-2.0 * mean_flag)))

    def classify(self, text: str, acoustic_features: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """Return dementia-probability fields for a transcript, or None.

        When ``acoustic_features`` are available, performs Tier-1 Cross-Modal
        Feature Fusion between DistilBERT text embeddings and acoustic DSP
        biomarkers (jitter, shimmer, HNR, pause ratio). When absent, runs
        standard text-only NLP inference.
        """
        from app.config.settings import Config

        cleaned = (text or '').strip()
        words = cleaned.split()
        if len(words) < Config.SPEECH_NLP_MIN_WORDS:
            logger.info("Speech NLP skipped: %d words < minimum %d.",
                        len(words), Config.SPEECH_NLP_MIN_WORDS)
            return None
        try:
            import numpy as np

            embedding = self._embed(cleaned)
            raw_prob = float(
                self.head.predict_proba(self.scaler.transform(embedding))[0, 1]
            )

            # Tier 1 Feature Fusion with Acoustic Biomarkers
            acoustic_risk = self._compute_acoustic_risk(acoustic_features or {})
            if acoustic_risk is not None:
                logit_nlp = float(np.log(max(raw_prob, 1e-6) / max(1.0 - raw_prob, 1e-6)))
                logit_ac = float(np.log(max(acoustic_risk, 1e-6) / max(1.0 - acoustic_risk, 1e-6)))
                # Gated cross-modal weighting: text semantics 75%, vocal acoustics 25%
                logit_fused = 0.75 * logit_nlp + 0.25 * logit_ac
                probability = float(1.0 / (1.0 + np.exp(-logit_fused)))
                fusion_mode = 'acoustic_linguistic_feature_fusion'
            else:
                probability = raw_prob
                fusion_mode = 'text_only_nlp'

            prediction = 'dementia' if probability >= DECISION_THRESHOLD else 'control'
            return {
                'dementia_probability': round(float(np.clip(probability, 0.0, 1.0)), 4),
                'dementia_prediction': prediction,
                'nlp_classifier': MODEL_TAG,
                'fusion_mode': fusion_mode,
                'acoustic_modulation': round(float(acoustic_risk), 2) if acoustic_risk is not None else None,
            }
        except Exception as e:
            logger.error("Speech NLP classification failed: %s", e)
            return None


def get_speech_nlp_classifier() -> Optional[SpeechNLPClassifier]:
    """Process-wide lazy accessor; None when disabled or already failed to load."""
    global _classifier, _classifier_failed

    from app.config.settings import Config
    if not Config.SPEECH_NLP_ENABLED:
        return None
    if _classifier is not None or _classifier_failed:
        return _classifier
    with _lock:
        if _classifier is not None or _classifier_failed:
            return _classifier
        try:
            _classifier = SpeechNLPClassifier()
        except Exception as e:
            _classifier_failed = True
            logger.warning("Speech NLP classifier unavailable: %s", e)
            return None
    return _classifier


def classify_transcript(
    text: str,
    acoustic_features: Optional[Dict[str, Any]] = None,
) -> Optional[Dict[str, Any]]:
    """Convenience seam used by the speech analysis step (tests patch this).

    Supports optional acoustic_features for cross-modal speech feature fusion.
    """
    from app.config.settings import Config

    words = (text or '').strip().split()
    if len(words) < Config.SPEECH_NLP_MIN_WORDS:
        logger.info("Speech NLP skipped: %d words < minimum %d.",
                    len(words), Config.SPEECH_NLP_MIN_WORDS)
        return None
    classifier = get_speech_nlp_classifier()
    if classifier is None:
        return None
    return classifier.classify(text, acoustic_features=acoustic_features)


def warmup_speech_nlp() -> None:
    """Eagerly construct the classifier; raises on failure (for orchestrator warmup)."""
    global _classifier, _classifier_failed
    classifier = get_speech_nlp_classifier()
    if classifier is None:
        raise RuntimeError("Speech NLP classifier is disabled or unavailable.")
