import os
import tempfile
import logging
from typing import Dict, Any, Optional
from werkzeug.datastructures import FileStorage

logger = logging.getLogger(__name__)


class AnalysisOrchestrator:
    """Orchestrates all multimodal analysis operations."""
    
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
        self._session_repo = None
    
    def _get_mri(self):
        if self._mri is None:
            from app.modules.mri.inference import MRIClassifier
            self._mri = MRIClassifier(model_path='models/alzheimer_model.pth')
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
    
    def _get_handwriting(self):
        if self._handwriting is None:
            from app.modules.vision.handwriting.analyzer import HandwritingAnalyzer
            self._handwriting = HandwritingAnalyzer()
        return self._handwriting
    
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
    
    def _get_genomics(self):
        if self._genomics is None:
            from app.modules.genomics.sequencer import GenomicSequencer
            self._genomics = GenomicSequencer()
        return self._genomics
    
    def _get_speech(self):
        if self._speech is None:
            from app.modules.speech.transcriber import SpeechTranscriber
            self._speech = SpeechTranscriber()
        return self._speech
    
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
    
    def analyze_handwriting(
        self,
        file: Optional[FileStorage] = None,
        canvas_data: Optional[str] = None
    ) -> Dict[str, Any]:
        hw = self._get_handwriting()
        
        if file:
            temp_path = self._save_temp_file(file)
            try:
                return hw.analyze(image_path=temp_path)
            finally:
                self._cleanup_temp_file(temp_path)
        elif canvas_data:
            return hw.analyze(image_base64=canvas_data)
        
        return {'error': 'No handwriting data provided'}
    
    def analyze_facial(self, frames: list) -> Dict[str, Any]:
        return self._get_facial().analyze_frames(frames)
    
    def analyze_genomics(self, text: str) -> Dict[str, Any]:
        return self._get_genomics().analyze_dna_text(text)
    
    def transcribe_audio(self, file: FileStorage) -> Dict[str, Any]:
        temp_path = self._save_temp_file(file)
        try:
            return self._get_speech().transcribe_file(temp_path)
        finally:
            self._cleanup_temp_file(temp_path)
    
    def fuse_results(
        self,
        mri_result: Optional[Dict] = None,
        sentiment_result: Optional[Dict] = None,
        cognitive_result: Optional[Dict] = None,
        risk_result: Optional[Dict] = None,
        handwriting_result: Optional[Dict] = None,
        audio_result: Optional[Dict] = None,
        visual_result: Optional[Dict] = None,
    ) -> Dict[str, Any]:
        return self._get_fusion().predict(
            mri_result=mri_result,
            sentiment_result=sentiment_result,
            cognitive_result=cognitive_result,
            risk_result=risk_result,
            handwriting_result=handwriting_result,
            audio_result=audio_result,
            visual_result=visual_result,
        )
    
    def get_music_recommendation(self, stage: str, emotion: str) -> Dict[str, Any]:
        from app.modules.recommendation.music import MusicRecommender
        recommender = MusicRecommender()
        return recommender.recommend(stage, emotion)
    
    def save_session(self, patient_id: str, results: Dict, patient_name: str = 'Anonymous') -> int:
        return self._get_session_repo().save(patient_id, results, patient_name)
    
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
