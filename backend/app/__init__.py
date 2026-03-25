import logging
import time
import os
from flask import Flask, jsonify, session, request, g

from app.core.config import Config
from app.core.database import Database
from app.core.logging_config import setup_logging, audit_logger
from app.core.metrics import metrics

_sentry_initialized = False
try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    from sentry_sdk.integrations.celery import CeleryIntegration
    
    def init_sentry():
        global _sentry_initialized
        if _sentry_initialized:
            return
        
        dsn = os.environ.get('SENTRY_DSN')
        if dsn:
            sentry_sdk.init(
                dsn=dsn,
                integrations=[
                    FlaskIntegration(),
                    CeleryIntegration(),
                ],
                traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
                environment=os.environ.get('FLASK_ENV', 'production'),
                release=os.environ.get('APP_VERSION', '1.0.0'),
            )
            _sentry_initialized = True
            logger.info("Sentry error tracking initialized")
        else:
            logger.info("Sentry DSN not configured - error tracking disabled")
except ImportError:
    sentry_sdk = None
    def init_sentry():
        pass

setup_logging(
    level=os.environ.get('LOG_LEVEL', 'INFO'),
    json_format=os.environ.get('LOG_FORMAT', 'text').lower() == 'json'
)

logger = logging.getLogger(__name__)

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


def _init_database(db_path):
    """Initialize the database, schema, and seed default data."""
    db = Database.get_instance(str(db_path))
    db.init_schema()
    
    # Ensure default users exist via UserRepository (triggers seed if empty)
    from app.repositories.user_repository import UserRepository
    UserRepository()
    
    logger.info("Database initialized at %s", db_path)
    return db


# Global limiter instance (initialized in create_app)
_limiter = None

def get_limiter():
    return _limiter

def _get_rate_limit_key():
    """Get rate limit key including authenticated user if available."""
    from app.core.security import get_current_user_id
    user_id = get_current_user_id()
    if user_id:
        return f"user_{user_id}"
    return request.remote_addr

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    
    # Configure CORS with credentials support for frontend integration
    if HAS_CORS and CORS is not None:
        allowed_origins = os.environ.get('CORS_ORIGINS', 'http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:4000,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,http://127.0.0.1:4000,http://localhost:5173').split(',')
        CORS(app, supports_credentials=True, origins=allowed_origins, expose_headers=['Content-Length', 'Content-Type', 'X-Request-ID'])
        logger.info("CORS enabled for origins: %s", allowed_origins)
    
    # Configure rate limiting
    global _limiter
    try:
        from flask_limiter import Limiter
        
        _limiter = Limiter(
            key_func=_get_rate_limit_key,
            app=app,
            default_limits=[
                "200 per day",
                "50 per hour",
                "10 per minute"
            ],
            storage_uri=os.environ.get('RATELIMIT_STORAGE', 'memory://'),
        )
        
        @app.errorhandler(429)
        def ratelimit_handler(e):
            logger.warning("Rate limit exceeded for IP: %s", request.remote_addr)
            return jsonify({
                'success': False,
                'error': 'Rate limit exceeded. Please try again later.',
                'retry_after': getattr(e, 'description', 'Please try again later')
            }), 429
        
        logger.info("Rate limiting enabled with storage: %s", os.environ.get('RATELIMIT_STORAGE', 'memory://'))
    except ImportError:
        logger.warning("flask-limiter not installed. Rate limiting disabled.")
        _limiter = None
    
    if HAS_FLASK_LOGIN and login_manager is not None:
        login_manager.init_app(app)
        
        @login_manager.user_loader
        def load_user(user_id):
            from app.repositories.user_repository import UserRepository
            repo = UserRepository()
            return repo.get_by_id(int(user_id))
    
    # Initialize database with schema and seed data
    db_path = Config.DB_PATH if hasattr(Config, 'DB_PATH') else None
    if db_path:
        _init_database(db_path)
    
    # Request logging and metrics middleware
    @app.before_request
    def before_request():
        import uuid
        g.request_id = str(uuid.uuid4())[:8]
        g.start_time = time.time()
        metrics.increment_active_requests()
        logger.info(
            "[%s] %s %s started",
            g.request_id, request.method, request.path,
            extra={
                'extra_fields': {
                    'method': request.method,
                    'path': request.path,
                    'remote_addr': request.remote_addr,
                    'user_agent': request.user_agent.string[:100] if request.user_agent else 'unknown'
                }
            }
        )
    
    @app.after_request
    def after_request(response):
        from app.core.metrics import metrics
        
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id
        
        if hasattr(g, 'start_time'):
            duration_ms = (time.time() - g.start_time) * 1000
            metrics.record_request(
                path=request.path,
                method=request.method,
                status_code=response.status_code,
                duration_ms=duration_ms
            )
            metrics.decrement_active_requests()
            
            logger.info(
                "[%s] %s %s completed - %d in %.2fms",
                g.request_id, request.method, request.path,
                response.status_code, duration_ms,
                extra={
                    'extra_fields': {
                        'status_code': response.status_code,
                        'duration_ms': round(duration_ms, 2)
                    }
                }
            )
        
        return response
    
    # Global error handlers
    from app.core.middleware import ErrorHandler, NeuroSenseError
    
    @app.errorhandler(NeuroSenseError)
    def handle_neurosense_error(e):
        return ErrorHandler.handle(e)
    
    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'success': False, 'error': 'File too large. Maximum size is 16 MB.'}), 413
    
    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'success': False, 'error': 'Endpoint not found.'}), 404
    
    @app.errorhandler(500)
    def server_error(e):
        logger.exception("Unhandled server error")
        if sentry_sdk and _sentry_initialized:
            sentry_sdk.capture_exception(e)
        return jsonify({'success': False, 'error': 'Internal server error.'}), 500
    
    init_sentry()
    
    # Register blueprints
    from app.api.routes import auth, analysis, patients, utilities
    from app.api.routes.enhanced_analysis import enhanced_bp
    from app.api.routes.admin import admin_bp
    
    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(analysis.analysis_bp)
    app.register_blueprint(patients.patient_bp)
    app.register_blueprint(utilities.utility_bp)
    app.register_blueprint(enhanced_bp)
    app.register_blueprint(admin_bp)
    
    @app.route('/')
    def index():
        return jsonify({
            'message': 'NeuroSense AI API Server',
            'version': '2.0.0',
            'new_features': {
                'biomarkers': '/api/analysis/biomarkers',
                'neuropsychological': '/api/analysis/neuropsychological',
                'clinical_decision_support': '/api/analysis/clinical-decision-support',
                'prognosis': '/api/analysis/prognosis',
                'clinical_trials': '/api/analysis/clinical-trials',
                'report': '/api/analysis/report',
                'quality': '/api/analysis/quality-report',
            },
            'endpoints': {
                'auth': '/api/auth',
                'patients': '/api/patients',
                'analysis': '/api/analysis',
                'enhanced_analysis': '/api/analysis/biomarkers, /api/analysis/neuropsychological, etc.',
                'utils': '/api/utils',
                'health': '/api/health',
                'metrics': '/api/metrics'
            }
        })
    
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'version': '1.0.0',
            'services': {
                'database': 'connected',
                'models': 'loaded',
                'api': 'operational'
            }
        })
    
    @app.route('/api/metrics')
    def get_metrics():
        from flask import make_response
        format_type = request.args.get('format', 'json')
        
        if format_type == 'prometheus':
            response = make_response(metrics.get_prometheus_metrics())
            response.content_type = 'text/plain; charset=utf-8'
            return response
        else:
            return jsonify(metrics.get_all_metrics())
    
    logger.info("NeuroSense app created successfully")
    return app