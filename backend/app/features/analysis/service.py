import os
import time
import tempfile
import threading
import logging
from typing import Dict, Any, Optional
from werkzeug.datastructures import FileStorage

from app.ml.contracts import (
    AnalysisInput,
    AnalysisResult,
    CognitiveResult,
    FusionResult,
    MRIResult,
    RiskResult,
    TranscriptionResult,
)

logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """Composition root for multimodal analysis.

    Coordinates the modality steps in ``features/analysis/<modality>/``,
    multimodal fusion in ``app/ml/fusion/``, and persistence/reporting.
    Contains no modality implementation itself.
    """
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True

        self._mri = None
        self._sentiment = None
        self._cognitive = None
        self._risk = None
        self._fusion = None
        self._speech = None
        self._session_repo = None
        # Guards lazy model loading: two concurrent first requests would
        # otherwise both construct the model (double memory), one discarded.
        self._lock = threading.Lock()
    
    def warmup(self) -> None:
        """Eagerly load and initialize ML models to eliminate first-request latency."""
        import gc
        try:
            logger.info("Starting AnalysisOrchestrator eager warmup...")
            t0 = time.time()
            loaders = [
                ("mri", self._get_mri),
                ("sentiment", self._get_sentiment),
                ("speech", self._get_speech),
                ("fusion", self._get_fusion),
                ("cognitive", self._get_cognitive),
                ("risk", self._get_risk),
            ]
            for step_name, loader in loaders:
                try:
                    loader()
                except Exception as ex:
                    logger.warning("Warmup step '%s' deferred to request time: %s", step_name, ex)
            gc.collect()
            logger.info("AnalysisOrchestrator warmup completed in %.2fs", time.time() - t0)
        except Exception as e:
            logger.warning("AnalysisOrchestrator warmup encountered non-fatal error: %s", e)

    def warmup_async(self) -> None:
        """Trigger warmup in a daemon thread so app startup remains non-blocking."""
        import threading
        thread = threading.Thread(target=self.warmup, daemon=True, name="ModelWarmupThread")
        thread.start()
    
    def _get_mri(self):
        if self._mri is None:
            with self._lock:
                if self._mri is None:
                    from app.config.settings import Config
                    from app.ml.mri.inference import MRIClassifier
                    self._mri = MRIClassifier(model_path=str(Config.MODEL_PATH))
        return self._mri
    
    def _get_sentiment(self):
        if self._sentiment is None:
            from app.ml.nlp.sentiment import SentimentAnalyzer
            self._sentiment = SentimentAnalyzer()
        return self._sentiment
    
    def _get_cognitive(self):
        if self._cognitive is None:
            from app.ml.cognitive.evaluator import CognitiveEvaluator
            self._cognitive = CognitiveEvaluator()
        return self._cognitive
    
    def _get_risk(self):
        if self._risk is None:
            from app.ml.risk.profiler import RiskProfiler
            self._risk = RiskProfiler()
        return self._risk
    
    def _get_fusion(self):
        if self._fusion is None:
            from app.ml.fusion.engine import MultimodalFusion
            self._fusion = MultimodalFusion()
        return self._fusion
    
    def _get_speech(self):
        if self._speech is None:
            with self._lock:
                if self._speech is None:
                    from app.ml.speech.transcriber import SpeechTranscriber
                    self._speech = SpeechTranscriber()
        return self._speech

    def _get_session_repo(self):
        if self._session_repo is None:
            from app.features.history.repository import SessionRepository
            self._session_repo = SessionRepository()
        return self._session_repo
    
    def analyze_mri(self, file: FileStorage, gradcam: bool = True) -> MRIResult:
        temp_path = self._save_temp_file(file)
        try:
            mri = self._get_mri()
            if gradcam:
                return mri.predict_with_gradcam(temp_path)
            return mri.predict(temp_path)
        finally:
            self._cleanup_temp_file(temp_path)

    def analyze_sentiment(self, text: str) -> Dict[str, Any]:
        return self._get_sentiment().analyze(text)

    def evaluate_cognitive(self, data: Dict[str, Any]) -> CognitiveResult:
        return self._get_cognitive().evaluate(data)

    def assess_risk(self, data: Dict[str, Any]) -> RiskResult:
        return self._get_risk().assess(data)

    def transcribe_audio(self, file: FileStorage) -> TranscriptionResult:
        temp_path = self._save_temp_file(file)
        try:
            return self._get_speech().transcribe_file(temp_path)
        finally:
            self._cleanup_temp_file(temp_path)
    
    def fuse_results(
        self,
        mri_result: Optional[MRIResult] = None,
        sentiment_result: Optional[Dict] = None,
        cognitive_result: Optional[CognitiveResult] = None,
        risk_result: Optional[RiskResult] = None,
        audio_result: Optional[Dict] = None,
    ) -> FusionResult:
        return self._get_fusion().predict(
            mri_result=mri_result,
            sentiment_result=sentiment_result,
            cognitive_result=cognitive_result,
            risk_result=risk_result,
            audio_result=audio_result,
        )
    
    def run_full_analysis(self, inputs: AnalysisInput, doctor_id: Optional[int] = None) -> AnalysisResult:
        """Run every requested assessment and combine the outputs.

        Composition root: each modality step lives in its feature module
        (``features/analysis/<modality>/service.py``); fusion, explanation
        and recommendations are assembled here. Persistence is deliberately
        excluded — see :meth:`persist_analysis`.
        """
        from app.features.analysis.mri.service import run_mri_step
        from app.features.analysis.speech.service import run_notes_step, run_speech_step
        from app.features.analysis.cognitive.service import run_cognitive_step
        from app.features.analysis.risk.service import run_risk_step

        results: AnalysisResult = {}
        patient_info = inputs.get('patient_info') or {}
        results['patient_info'] = patient_info
        pid = patient_info.get('patient_id', '')

        run_mri_step(self, inputs, results, pid, doctor_id)
        run_notes_step(self, inputs, results)
        run_speech_step(self, inputs, results, pid, doctor_id)
        run_cognitive_step(self, inputs, results)
        run_risk_step(self, inputs, results)

        # --- Fusion ---
        if any([
            results.get('mri'), results.get('cognitive'), results.get('risk_profile'),
            results.get('sentiment')
        ]):
            try:
                results['final_stage'] = self.fuse_results(
                    mri_result=results.get('mri'),
                    sentiment_result=results.get('sentiment'),
                    cognitive_result=results.get('cognitive'),
                    risk_result=results.get('risk_profile'),
                    audio_result=None,  # Speech is already handled in sentiment
                )
            except Exception as e:
                results['fusion_error'] = str(e)

        # AI Explanation & Recs
        try:
            from app.ml.explainability.explanation import generate_explanation
            results['ai_explanation'] = generate_explanation(results)
        except Exception as e:
            results['explanation_error'] = str(e)

        try:
            from app.features.analysis.recommendation import generate_recommendations
            results['recommendations'] = generate_recommendations(results)
        except Exception as e:
            results['recommendations_error'] = str(e)

        return results

    def persist_analysis(
        self,
        patient_info: Dict[str, Any],
        results: AnalysisResult,
        doctor_id: Optional[int] = None,
    ) -> AnalysisResult:
        """Persist analysis outputs: patient upsert, session row, report PDF."""
        from app.features.patients.service import PatientService

        pid = (patient_info.get('patient_id') or '').strip()
        if not pid or not (patient_info.get('name') or '').strip():
            return results
        try:
            stage = results.get('final_stage', {}).get('stage') or results.get('mri', {}).get('stage')
            PatientService().upsert_from_analysis(patient_info, stage, doctor_id)
        except PermissionError:
            # Cross-tenant write attempt — abort the whole persist so no
            # session row is written against another doctor's patient.
            raise
        except Exception as e:
            logger.warning("Could not save patient: %s", e)

        try:
            sid = self.save_session(
                pid, results, patient_info.get('name', 'Anonymous'), created_by=doctor_id
            )
            results['session_id'] = sid

            try:
                from app.features.analysis.reporting import ReportOrchestrator
                pdf_bytes = ReportOrchestrator().generate_report(results, patient_info)
                if pdf_bytes:
                    from app.shared.storage import StorageManager
                    from app.features.auth.repository import UserRepository
                    doc_name = None
                    user = UserRepository().get_by_id(doctor_id)
                    if user:
                        doc_name = user.username
                    saved_path = StorageManager.save_patient_pdf(
                        doctor_id=doctor_id,
                        patient_id=pid,
                        pdf_bytes=pdf_bytes,
                        filename=f"report_{sid}.pdf",
                        doctor_name=doc_name,
                        patient_name=patient_info.get('name'),
                        session_id=sid,
                    )
                    logger.info("Auto-saved session report PDF to %s", saved_path)
            except Exception as ex:
                logger.error("Failed to auto-save report PDF for session %s: %s", sid, ex)
        except Exception as e:
            results['history_error'] = str(e)
        return results
    
    def save_session(self, patient_id: str, results: Dict, patient_name: str = 'Anonymous', created_by=None) -> int:
        return self._get_session_repo().save(patient_id, results, patient_name, created_by=created_by)
    
    def _save_temp_file(self, file: FileStorage) -> str:
        from app.config.settings import Config
        upload_dir = str(Config.UPLOAD_FOLDER)
        os.makedirs(upload_dir, exist_ok=True)
        # Keep the original extension so NIfTI/volume detection works on the
        # temp path (a bare NamedTemporaryFile loses it).
        filename = file.filename or ''
        low = filename.lower()
        if low.endswith('.nii.gz'):
            suffix = '.nii.gz'
        else:
            suffix = os.path.splitext(filename)[1] or '.tmp'
        temp = tempfile.NamedTemporaryFile(delete=False, dir=upload_dir, suffix=suffix)
        file.save(temp.name)
        temp.close()
        return temp.name
    
    def _cleanup_temp_file(self, path: str) -> None:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            logger.warning("Failed to cleanup temp file %s: %s", path, e)
