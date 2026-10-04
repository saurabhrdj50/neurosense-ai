"""Speech step of the analysis workflow (mirrors analysis/speech/ in frontend).

Covers both audio transcription (``audio_file``) and the supplementary
clinical-notes NLP (``patient_text``). Speech is display-only: the produced
``sentiment`` object intentionally carries no severity score, so fusion
ignores it (see ``app/ml/fusion/engine.py``).
"""
import logging
from typing import Any, Dict, Optional

from app.ml.contracts import AnalysisInput, AnalysisResult, TranscriptionResult

logger = logging.getLogger(__name__)


def build_sentiment_summary(transcription: Dict[str, Any], has_audio_file: bool) -> Dict[str, Any]:
    """Build the display-only ``sentiment`` object from a transcription.

    Pure function and the seam's test surface: every branch of the summary
    mapping is pinned by table tests. Carries no severity score, so fusion
    ignores it (see ``app/ml/fusion/engine.py``).
    """
    ac = transcription.get('acoustic_features', {})
    ling = transcription.get('linguistic_biomarkers', {})
    lexical_density = ling.get('lexical_density')
    method = transcription.get('method')
    has_audio_analysis = bool(
        has_audio_file
        and method not in (None, 'unavailable', 'error')
        and not transcription.get('error')
    )
    return {
        'dominant_emotion': None,
        'lexical_density': (
            f"{int(lexical_density * 100)}%"
            if lexical_density is not None
            else None
        ),
        'filler_word_count': ling.get('filler_word_count'),
        'pause_frequency': ac.get('pause_frequency'),
        'pitch_variation': ac.get('pitch_variation'),
        'clinical_summary': (
            'Audio transcript available; acoustic summaries are shown only when extraction succeeds.'
            if has_audio_analysis
            else 'Manual text transcript; no acoustic measurements are available.'
            if not has_audio_file
            else 'Audio analysis did not produce a usable transcript.'
        ),
    }


def run_notes_step(orch, inputs: AnalysisInput, results: AnalysisResult) -> None:
    """Run clinical-notes NLP (supplementary, NOT replacing speech)."""
    patient_text = inputs.get('patient_notes', '')
    if patient_text:
        try:
            results['clinical_notes_nlp'] = orch.analyze_sentiment(patient_text)
        except Exception as e:
            results['clinical_notes_error'] = str(e)


def run_speech_step(orch, inputs: AnalysisInput, results: AnalysisResult,
                    pid: str, doctor_id: Optional[int]) -> None:
    """Transcribe audio (or accept manual text) and build the display-only
    ``sentiment`` summary. Mutates ``results``."""
    from app.shared.storage import StorageManager

    audio_file = inputs.get('audio_file')
    audio_text = (inputs.get('audio_text') or '').strip()
    transcription: Optional[TranscriptionResult] = None
    if audio_file is not None:
        if pid:
            try:
                audio_file.stream.seek(0)
                StorageManager.persist_raw_file(
                    doctor_id, pid, audio_file, 'audio', audio_file.filename
                )
                audio_file.stream.seek(0)
            except Exception as e:
                logger.error("Failed to persist raw audio file: %s", e)
        try:
            transcription = orch.transcribe_audio(audio_file)
            results['audio_transcription'] = transcription
        except Exception as e:
            results['audio_error'] = str(e)
    elif audio_text:
        # No file, just text: no real acoustic features can be extracted.
        transcription = {
            'text': audio_text,
            'acoustic_features': {},
            'linguistic_biomarkers': {},
        }
        results['audio_transcription'] = transcription

    if transcription:
        # Map speech pipeline directly to frontend's expected 'sentiment'
        # object without double-counting it through NLP SentimentAnalyzer.
        results['sentiment'] = build_sentiment_summary(transcription, audio_file is not None)
