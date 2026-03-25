from flask import Flask, jsonify, session

from app.core.config import Config
from app.core.database import Database

try:
    from flask_cors import CORS
    HAS_CORS = True
except ImportError:
    HAS_CORS = False
    CORS = None

try:
    from flask_login import LoginManager, current_user
    HAS_FLASK_LOGIN = True
    login_manager = LoginManager()
except ImportError:
    HAS_FLASK_LOGIN = False
    login_manager = None
    current_user = None


_modules_cache = {}


def get_modules():
    """Returns a dictionary of ML/service modules for backward compatibility."""
    if _modules_cache:
        return _modules_cache
    
    from app.modules.mri.inference import MRIClassifier
    from app.modules.nlp.sentiment import SentimentAnalyzer
    from app.modules.cognitive.evaluator import CognitiveEvaluator
    from app.modules.risk.profiler import RiskProfiler
    from app.modules.vision.handwriting.analyzer import HandwritingAnalyzer
    from app.modules.vision.facial.analyzer import FacialEmotionAnalyzer
    from app.modules.fusion.engine import MultimodalFusion
    from app.modules.genomics.sequencer import GenomicSequencer
    from app.modules.speech.transcriber import SpeechTranscriber
    from app.modules.recommendation.music import MusicRecommender
    from app.modules.recommendation.chatbot import MedicalChatbot
    from app.services.report_service import ReportOrchestrator
    
    from app.repositories.session_repository import SessionRepository
    
    _modules_cache['mri'] = MRIClassifier()
    _modules_cache['sentiment'] = SentimentAnalyzer()
    _modules_cache['cognitive'] = CognitiveEvaluator()
    _modules_cache['risk'] = RiskProfiler()
    _modules_cache['handwriting'] = HandwritingAnalyzer()
    _modules_cache['facial'] = FacialEmotionAnalyzer()
    _modules_cache['fusion'] = MultimodalFusion()
    _modules_cache['genomics'] = GenomicSequencer()
    _modules_cache['speech'] = SpeechTranscriber()
    _modules_cache['music'] = MusicRecommender()
    _modules_cache['chatbot'] = MedicalChatbot()
    _modules_cache['report'] = ReportOrchestrator()
    _modules_cache['history'] = SessionRepository()
    
    return _modules_cache


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    if HAS_CORS and CORS is not None:
        CORS(app)
    
    if HAS_FLASK_LOGIN and login_manager is not None:
        login_manager.init_app(app)
        login_manager.login_view = 'auth.login'
        
        @login_manager.user_loader
        def load_user(user_id):
            from app.repositories.user_repository import UserRepository
            repo = UserRepository()
            return repo.get_by_id(int(user_id))
    
    db_path = Config.DB_PATH if hasattr(Config, 'DB_PATH') else None
    if db_path:
        Database.get_instance(db_path)
    
    from app.api.routes import auth, analysis, patients, utilities
    
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(analysis.analysis_bp)
    app.register_blueprint(patients.patient_bp)
    app.register_blueprint(utilities.utility_bp)
    
    @app.route('/')
    def index():
        return jsonify({
            'message': 'NeuroSense AI API Server',
            'version': '1.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'patients': '/api/patients',
                'analysis': '/api/analysis',
                'utils': '/api/utils'
            }
        })
    
    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'error': 'File too large. Maximum size is 16 MB.'}), 413
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Endpoint not found.'}), 404
    
    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Internal server error.'}), 500
    
    return app