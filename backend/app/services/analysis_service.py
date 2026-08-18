import os
import time
import tempfile
import logging
from typing import Dict, Any, Optional
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """Orchestrates all multimodal analysis operations across all modules in backend/app/modules."""
    
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
        self._handwriting = None
        self._facial = None
        self._fusion = None
        self._genomics = None
        self._speech = None
        self._blood = None
        self._neuropsych = None
        self._cds = None
        self._session_repo = None
    
    def warmup(self) -> None:
        """Eagerly load and initialize ML models to eliminate first-request latency."""
        import gc
        try:
            logger.info("Starting AnalysisOrchestrator eager warmup...")
            t0 = time.time()
            loaders = [
                ("mri", self._get_mri),
                ("sentiment", self._get_sentiment),
                ("facial", self._get_facial),
                ("fusion", self._get_fusion),
                ("cognitive", self._get_cognitive),
                ("risk", self._get_risk),
                ("neuropsych", self._get_neuropsych),
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
            from app.core.config import Config
            from app.modules.mri.inference import MRIClassifier
            self._mri = MRIClassifier(model_path=str(Config.MODEL_PATH))
        return self._mri
    
    def _get_sentiment(self):
        if self._sentiment is None:
            from app.modules.nlp.sentiment import SentimentAnalyzer
            self._sentiment = SentimentAnalyzer()
        return self._sentiment
    
    def _get_cognitive(self):
        if self._cognitive is None:
            from app.modules.cognitive.evaluator import CognitiveEvaluator
            self._cognitive = CognitiveEvaluator()
        return self._cognitive
    
    def _get_risk(self):
        if self._risk is None:
            from app.modules.risk.profiler import RiskProfiler
            self._risk = RiskProfiler()
        return self._risk
    
    def _get_facial(self):
        if self._facial is None:
            from app.modules.vision.facial.analyzer import FacialEmotionAnalyzer
            self._facial = FacialEmotionAnalyzer()
        return self._facial
    
    def _get_fusion(self):
        if self._fusion is None:
            from app.modules.fusion.engine import MultimodalFusion
            self._fusion = MultimodalFusion()
        return self._fusion
    
    def _get_speech(self):
        if self._speech is None:
            from app.modules.speech.transcriber import SpeechTranscriber
            self._speech = SpeechTranscriber()
        return self._speech

    def _get_neuropsych(self):
        if self._neuropsych is None:
            from app.modules.analysis.neuropsychological import NeuropsychologicalBattery
            self._neuropsych = NeuropsychologicalBattery()
        return self._neuropsych

    def _get_cds(self):
        if self._cds is None:
            from app.modules.clinical.cds_system import get_clinical_decision_support
            self._cds = get_clinical_decision_support
        return self._cds
    
    def _get_session_repo(self):
        if self._session_repo is None:
            from app.repositories.session_repository import SessionRepository
            self._session_repo = SessionRepository()
        return self._session_repo
    
    def analyze_mri(self, file: FileStorage, gradcam: bool = True) -> Dict[str, Any]:
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
    
    def evaluate_cognitive(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._get_cognitive().evaluate(data)
    
    def assess_risk(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._get_risk().assess(data)

    def assess_neuropsychological(self, data: Dict[str, Any]) -> Dict[str, Any]:
        return self._get_neuropsych().assess_battery(data)
    
    def analyze_facial(self, frames: list) -> Dict[str, Any]:
        return self._get_facial().analyze_frames(frames)
    
    def transcribe_audio(self, file: FileStorage) -> Dict[str, Any]:
        temp_path = self._save_temp_file(file)
        try:
            return self._get_speech().transcribe_file(temp_path)
        finally:
            self._cleanup_temp_file(temp_path)
    
    def get_cds_recommendations(self, stage: Any, patient_info: Dict = None, risk_factors: Dict = None) -> Dict[str, Any]:
        patient_info = patient_info or {}
        risk_factors = risk_factors or {}

        stage_int = 1
        if isinstance(stage, int):
            stage_int = stage
        elif isinstance(stage, str):
            if stage.isdigit():
                stage_int = int(stage)
            else:
                stage_map = {
                    'non-demented': 0, 'normal': 0, 'normal cognition': 0,
                    'very mild demented': 1, 'very mild dementia': 1, 'mci': 1,
                    'mild demented': 2, 'mild dementia': 2, 'mild ad': 2,
                    'moderate demented': 3, 'moderate dementia': 3, 'moderate ad': 3,
                    'moderately severe': 4,
                    'severe dementia': 5, 'severe': 5,
                }
                stage_int = stage_map.get(stage.strip().lower(), 1)
        elif isinstance(stage, dict):
            stage_val = stage.get('stage_index', stage.get('stage'))
            return self.get_cds_recommendations(stage_val, patient_info=patient_info, risk_factors=risk_factors)

        patient_data = {
            'stage': stage_int,
            'age': patient_info.get('age', 70),
            'mmse_score': patient_info.get('mmse_score', 24),
            'comorbidities': risk_factors.get('comorbidities', []),
            'biomarkers': risk_factors.get('biomarkers'),
            'current_medications': patient_info.get('current_medications', []),
            'contraindications': patient_info.get('contraindications', []),
        }
        return self._get_cds()(patient_data)

    def fuse_results(
        self,
        mri_result: Optional[Dict] = None,
        sentiment_result: Optional[Dict] = None,
        cognitive_result: Optional[Dict] = None,
        risk_result: Optional[Dict] = None,
        audio_result: Optional[Dict] = None,
        visual_result: Optional[Dict] = None,
        neuropsych_result: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        return self._get_fusion().predict(
            mri_result=mri_result,
            sentiment_result=sentiment_result,
            cognitive_result=cognitive_result,
            risk_result=risk_result,
            audio_result=audio_result,
            visual_result=visual_result,
        )
    
    def get_music_recommendation(self, stage: str, emotion: str) -> Dict[str, Any]:
        from app.modules.recommendation.music import MusicRecommender
        recommender = MusicRecommender()
        return recommender.recommend(stage, emotion)
    
    def save_session(self, patient_id: str, results: Dict, patient_name: str = 'Anonymous', created_by=None) -> int:
        return self._get_session_repo().save(patient_id, results, patient_name, created_by=created_by)
    
    def _save_temp_file(self, file: FileStorage) -> str:
        os.makedirs('uploads', exist_ok=True)
        temp = tempfile.NamedTemporaryFile(delete=False, dir='uploads')
        file.save(temp.name)
        temp.close()
        return temp.name
    
    def _cleanup_temp_file(self, path: str) -> None:
        try:
            if os.path.exists(path):
                os.remove(path)
        except Exception as e:
            logger.warning("Failed to cleanup temp file %s: %s", path, e)
