"""Per-modality retry for persisted analysis sessions.

A failed Whisper run or MRI inference must not discard the rest of a
completed assessment. Raw uploads are persisted under the patient directory
(see StorageManager.persist_raw_file), so a single modality can be re-run
from disk and the session's fusion, explanation and report regenerated.
"""
import logging
from pathlib import Path
from typing import Any, Dict, Optional

from app.config.settings import Config
from app.features.history.repository import SessionRepository

logger = logging.getLogger(__name__)

RETRYABLE_MODALITIES = ('mri', 'audio')


class _StoredUpload:
    """Minimal werkzeug-FileStorage-shaped adapter over a file on disk so
    AnalysisOrchestrator._save_temp_file / persist paths work unchanged."""

    def __init__(self, path: Path):
        self.path = path
        self.filename = path.name
        self._stream = None

    def save(self, dst) -> None:
        import shutil
        with open(self.path, 'rb') as src, open(dst, 'wb') as out:
            shutil.copyfileobj(src, out)

    @property
    def stream(self):
        if self._stream is None or self._stream.closed:
            self._stream = open(self.path, 'rb')
        return self._stream

    def read(self, n: int = -1) -> bytes:
        return self.stream.read(n)

    def seek(self, pos: int) -> int:
        return self.stream.seek(pos)

    def close(self) -> None:
        if self._stream is not None and not self._stream.closed:
            self._stream.close()

    def __del__(self) -> None:
        self.close()


def _find_raw_file(patient_id: str, modality: str) -> Optional[Path]:
    """Locate the most recent stored upload for a modality.

    The patient directory name embeds a sanitized patient_id
    ('{patient_id}_{name}'), so globbing on the id prefix survives patient
    renames; the doctor segment is matched loosely for the same reason.
    """
    clean = ''.join(c for c in (patient_id or '') if c.isalnum() or c in ('-', '_')).strip()
    if not clean:
        return None
    subfolder = 'mri' if modality == 'mri' else 'audio'
    base = Path(Config.UPLOAD_FOLDER) / 'doctors'
    candidates = [
        p for p in base.glob(f'*/patients/{clean}_*/{subfolder}/*') if p.is_file()
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda p: p.stat().st_mtime)


def _regenerate_report(results: Dict[str, Any], session: Dict[str, Any], doctor_id) -> None:
    try:
        from app.features.analysis.reporting import ReportOrchestrator
        from app.shared.storage import StorageManager
        from app.features.auth.repository import UserRepository

        doc_name = None
        user = UserRepository().get_by_id(doctor_id)
        if user:
            doc_name = user.username
        patient_dir = StorageManager.get_patient_directory(
            doctor_id=doctor_id,
            patient_id=session.get('patient_id'),
            doctor_name=doc_name,
            patient_name=session.get('patient_name'),
        )
        pdf_bytes = ReportOrchestrator().generate_report(
            results, results.get('patient_info') or {}
        )
        if pdf_bytes:
            session_dir = patient_dir / 'sessions' / f"sess_{session['id']}"
            reports_dir = session_dir / 'reports'
            reports_dir.mkdir(parents=True, exist_ok=True)
            (reports_dir / f"report_{session['id']}.pdf").write_bytes(pdf_bytes)
    except Exception:
        # The DB update already succeeded; a report regeneration failure is
        # logged, not fatal.
        logger.exception("Failed to regenerate report PDF for session retry")


def retry_modality(session_id: int, modality: str, user) -> Dict[str, Any]:
    """Re-run one failed modality for a stored session and refresh the fusion.

    Returns the updated full results payload (same shape as /api/analysis).
    Raises ApiError for every client-fixable failure path.
    """
    from app.api.errors import ApiError
    from app.api.deps import is_admin
    from app.features.analysis.service import AnalysisOrchestrator
    from app.features.analysis.speech.service import (
        build_sentiment_summary,
        _apply_speech_nlp,
    )

    if modality not in RETRYABLE_MODALITIES:
        raise ApiError(400, f"Modality must be one of: {', '.join(RETRYABLE_MODALITIES)}")

    repo = SessionRepository()
    session = repo.get_session_detail(session_id)
    if not session:
        raise ApiError(404, 'Session not found')

    if not is_admin(user) and session.get('created_by') != user.id:
        raise ApiError(403, 'Access denied')

    # get_session_detail exposes the parsed results JSON under 'results'
    # (formatted via SessionRepository._format_session).
    results = dict(session.get('results') or session.get('full_results') or {})
    if not results:
        raise ApiError(409, 'Session has no stored results to retry against')

    path = _find_raw_file(session.get('patient_id'), modality)
    if not path:
        raise ApiError(409, f"No stored {modality} upload found for this patient — re-run the assessment instead")

    orch = AnalysisOrchestrator()
    stored = _StoredUpload(path)
    logger.info("Retrying %s for session %d from %s", modality, session_id, path)

    try:
        if modality == 'mri':
            results['mri'] = orch.analyze_mri(stored, gradcam=True)
            results.pop('mri_error', None)
        else:
            transcription = orch.transcribe_audio(stored)
            if transcription.get('text'):
                _apply_speech_nlp(transcription)
            results['audio_transcription'] = transcription
            results['sentiment'] = build_sentiment_summary(transcription, True)
            results.pop('audio_error', None)
    except Exception as e:
        logger.exception("Retry failed for %s on session %d", modality, session_id)
        # Mirror the pipeline behaviour: record the error on the result
        # instead of discarding the session's other modalities.
        key = 'mri_error' if modality == 'mri' else 'audio_error'
        results[key] = str(e)
        repo.update_results(session_id, results)
        clean_msg = "An internal processing issue occurred. Please check scan/recording format." if len(str(e)) > 120 or "Traceback" in str(e) or "TorchScript" in str(e) or "RuntimeError" in str(e) else str(e)
        raise ApiError(502, f"{modality.upper()} retry failed: {clean_msg}")

    # Re-fuse and regenerate derived outputs with the refreshed modality.
    speech_nlp = results.get('audio_transcription') or {}
    speech_has_vote = speech_nlp.get('dementia_probability') is not None
    if any([
        results.get('mri'), results.get('cognitive'), results.get('risk_profile'),
        results.get('sentiment'),
    ]) or speech_has_vote:
        try:
            results['final_stage'] = orch.fuse_results(
                mri_result=results.get('mri'),
                sentiment_result=results.get('sentiment'),
                cognitive_result=results.get('cognitive'),
                risk_result=results.get('risk_profile'),
                speech_nlp_result=speech_nlp if speech_has_vote else None,
            )
            results.pop('fusion_error', None)
        except Exception as e:
            results['fusion_error'] = str(e)

    try:
        from app.ml.explainability.explanation import generate_explanation
        results['ai_explanation'] = generate_explanation(results)
        results.pop('explanation_error', None)
    except Exception as e:
        results['explanation_error'] = str(e)

    try:
        from app.features.analysis.recommendation import generate_recommendations
        results['recommendations'] = generate_recommendations(results)
        results.pop('recommendations_error', None)
    except Exception as e:
        results['recommendations_error'] = str(e)

    repo.update_results(session_id, results)
    _regenerate_report(results, session, session.get('created_by'))

    results['session_id'] = session_id
    return results
