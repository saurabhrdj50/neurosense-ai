import logging
import time
import os

# Suppress TensorFlow C++ log messages and oneDNN warnings before TF import
os.environ.setdefault('TF_ENABLE_ONEDNN_OPTS', '0')
os.environ.setdefault('TF_CPP_MIN_LOG_LEVEL', '2')

from flask import Flask, jsonify, session, request, g, redirect, url_for

from app.config.settings import Config
from app.shared.database import Database
from app.shared.logging_config import setup_logging, audit_logger
from app.shared.metrics import metrics

_sentry_initialized = False
try:
    import sentry_sdk
    from sentry_sdk.integrations.flask import FlaskIntegration
    
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




def _init_database(db_path):
    """Initialize the database, schema, and seed default data."""
    db = Database.get_instance(str(db_path))
    db.init_schema()
    
    # Ensure default users exist via UserRepository (triggers seed if empty)
    from app.features.auth.repository import UserRepository
    UserRepository()
    
    logger.info("Database initialized at %s", db_path)
    return db


# Global limiter instance (initialized in create_app)
_limiter = None

def get_limiter():
    return _limiter

def _get_rate_limit_key():
    """Get rate limit key including authenticated user if available."""
    from app.shared.security import get_current_user_id
    user_id = get_current_user_id()
    if user_id:
        return f"user_{user_id}"
    return request.remote_addr

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Trust X-Forwarded-For/X-Forwarded-Proto only when explicitly deployed
    # behind a reverse proxy; otherwise clients could spoof their IP and
    # bypass per-IP rate limits.
    if Config.TRUST_PROXY:
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
        logger.info("ProxyFix enabled (TRUST_PROXY=1)")

    # Configure CORS with credentials support for frontend integration.
    # Strict allowlist: CORS_ORIGINS env plus localhost dev defaults only —
    # never a wildcard subdomain pattern.
    if HAS_CORS and CORS is not None:
        raw_origins = os.environ.get('CORS_ORIGINS', '').split(',')
        allowed_origins = [o.strip() for o in raw_origins if o.strip()]

        if not Config.IS_PRODUCTION:
            defaults = [
                'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
                'http://localhost:4000', 'http://localhost:5173', 'http://127.0.0.1:3000',
                'http://127.0.0.1:5173', 'http://127.0.0.1:4000'
            ]
            for d in defaults:
                if d not in allowed_origins:
                    allowed_origins.append(d)

        CORS(app, supports_credentials=True, origins=allowed_origins, expose_headers=['Content-Length', 'Content-Type', 'X-Request-ID'])
        logger.info("CORS enabled for origins: %s", allowed_origins)
    
    # Configure rate limiting
    global _limiter
    try:
        from flask_limiter import Limiter
        
        app.config['RATELIMIT_ENABLED'] = os.environ.get('TESTING', '').lower() != 'true'

        _limiter = Limiter(
            key_func=_get_rate_limit_key,
            app=app,
            default_limits=[
                "1000 per day",
                "300 per hour",
                "60 per minute"
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
        
        @login_manager.unauthorized_handler
        def handle_unauthorized():
            return jsonify({'success': False, 'message': 'Authentication required. Please log in.'}), 401
        
        @login_manager.user_loader
        def load_user(user_id):
            from app.features.auth.repository import UserRepository
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
        g._counted_active = True
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
        from app.shared.metrics import metrics
        
        if hasattr(g, 'request_id'):
            response.headers['X-Request-ID'] = g.request_id

        # before_request does not run for unmatched routes (404), so only
        # decrement when this request actually incremented the gauge.
        if getattr(g, '_counted_active', False):
            metrics.decrement_active_requests()

        if hasattr(g, 'start_time'):
            duration_ms = (time.time() - g.start_time) * 1000
            # Use the routing rule (not the raw path) so IDs don't grow the
            # per-endpoint metric dict without bound.
            metric_path = request.url_rule.rule if request.url_rule else '<unmatched>'
            metrics.record_request(
                path=metric_path,
                method=request.method,
                status_code=response.status_code,
                duration_ms=duration_ms
            )
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
    from app.shared.middleware import ErrorHandler, NeuroSenseError

    @app.errorhandler(NeuroSenseError)
    def handle_neurosense_error(e):
        return ErrorHandler.handle(e)

    @app.errorhandler(413)
    def too_large(e):
        return jsonify({'success': False, 'error': 'File too large. Maximum size is 100 MB.'}), 413

    from app.shared.errors import register_error_handlers
    register_error_handlers(app)
    
    init_sentry()
    
    # Register blueprints
    from app.features.auth import routes as auth
    from app.features.analysis import routes as analysis
    from app.features.patients import routes as patients
    from app.features.history import routes as analyses
    from app.features.admin.routes import admin_bp

    app.register_blueprint(auth.auth_bp)
    app.register_blueprint(analysis.analysis_bp)
    app.register_blueprint(analyses.analyses_bp)
    app.register_blueprint(patients.patient_bp)
    app.register_blueprint(admin_bp)

    # Route-specific security limits (brute-force / enumeration protection)
    if _limiter is not None:
        route_limits = {
            'auth.login': ["10 per minute"],
            'auth.forgot_password': ["5 per hour"],
            'auth.reset_password': ["10 per hour"],
            'auth.register': ["10 per hour"],
        }
        for endpoint, limits in route_limits.items():
            view = app.view_functions.get(endpoint)
            # A missing endpoint here means a route was renamed and the
            # protection silently vanished — fail loudly instead.
            if view is None:
                raise RuntimeError(
                    f"route_limits references unknown endpoint '{endpoint}'. "
                    "Update the keys to match the registered blueprint endpoints."
                )
            for limit in limits:
                view = _limiter.limit(limit)(view)
            app.view_functions[endpoint] = view
    
    @app.route('/')
    def index():
        return jsonify({
            'message': 'NeuroSense AI API Server',
            'version': '2.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'patients': '/api/patients',
                'analysis': '/api/analysis',
                'health': '/api/health'
            }
        })

    @app.route('/api/health')
    def health_check():
        from app.config.settings import Config
        model_path = Config.MODEL_PATH
        model_loaded = model_path.exists()
        database_status = 'connected'
        try:
            Database.get_instance().fetch_one('SELECT 1 AS ok')
        except Exception:
            database_status = 'error'

        healthy = model_loaded and database_status == 'connected'

        return jsonify({
            'status': 'healthy' if healthy else 'degraded',
            'version': '1.0.0',
            'services': {
                'database': database_status,
                'models': 'loaded' if model_loaded else 'missing',
                'api': 'operational'
            },
            'models': {
                'MRI Classification Model': {
                    'loaded': model_loaded,
                    'status': 'Loaded' if model_loaded else 'Missing trained model file',
                }
            },
        }), (200 if healthy else 503)
    
    

    if os.environ.get('ENABLE_EAGER_WARMUP', 'false').lower() == 'true':
        from app.features.analysis.service import AnalysisOrchestrator
        AnalysisOrchestrator().warmup_async()
    else:
        logger.info("Eager ML warmup disabled (lazy model loading active to conserve RAM)")
    
    logger.info("NeuroSense app created successfully")
    return app
