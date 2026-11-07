"""NeuroSense AI — FastAPI application (post-migration entrypoint).

Replaces the Flask factory in app/__init__.py. Every endpoint keeps its
Flask-era path, request shape, response shape, and error contract, so the
React frontend needs no changes.

Middleware stack (outermost → innermost):
  CORS → GZip → BodySizeLimit → Session → RequestMetrics → routes
"""
import logging
import os
import time
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.sessions import SessionMiddleware
from starlette.types import ASGIApp, Receive, Scope, Send

from app.config.settings import Config
from app.shared.logging_config import setup_logging
from app.shared.metrics import metrics

setup_logging(
    level=os.environ.get('LOG_LEVEL', 'INFO'),
    json_format=os.environ.get('LOG_FORMAT', 'text').lower() == 'json'
)
logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Sentry (ASGI integration) — optional, like the Flask factory
# ─────────────────────────────────────────────────────────────────────────────
def init_sentry() -> None:
    dsn = os.environ.get('SENTRY_DSN')
    if not dsn:
        logger.info("Sentry DSN not configured - error tracking disabled")
        return
    try:
        import sentry_sdk
        from sentry_sdk.integrations.fastapi import FastApiIntegration
        sentry_sdk.init(
            dsn=dsn,
            integrations=[FastApiIntegration()],
            traces_sample_rate=float(os.environ.get('SENTRY_TRACES_SAMPLE_RATE', '0.1')),
            environment=os.environ.get('APP_ENV', 'production'),
            release=os.environ.get('APP_VERSION', '1.0.0'),
        )
        logger.info("Sentry error tracking initialized")
    except ImportError:
        logger.warning("sentry-sdk not installed; error tracking disabled")


# ─────────────────────────────────────────────────────────────────────────────
# Request-ID + metrics middleware (pure ASGI: safe with streaming responses)
# ─────────────────────────────────────────────────────────────────────────────
class RequestMetricsMiddleware:
    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return

        request_id = uuid.uuid4().hex[:8]
        state = scope.setdefault('state', {})
        state['request_id'] = request_id
        state['start_time'] = time.time()
        metrics.increment_active_requests()

        status_holder = {'status': None}

        async def send_wrapper(message):
            if message['type'] == 'http.response.start':
                status_holder['status'] = message['status']
                headers = message.setdefault('headers', [])
                headers.append((b'x-request-id', request_id.encode()))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            metrics.decrement_active_requests()
            status = status_holder['status'] or 500
            start = state.get('start_time')
            duration_ms = (time.time() - start) * 1000 if start else 0
            # Use the matched route template so IDs don't grow the metrics
            # dict without bound (Flask used url_rule for the same reason).
            route = scope.get('route')
            metric_path = getattr(route, 'path', '<unmatched>')
            metrics.record_request(
                path=metric_path,
                method=scope.get('method', ''),
                status_code=status,
                duration_ms=duration_ms,
            )
            if duration_ms >= float(os.environ.get('SLOW_REQUEST_MS', '750')):
                logger.warning(
                    "Slow request: %s %s took %.0fms (status %s)",
                    scope.get('method'), scope.get('path'), duration_ms, status,
                )
            logger.info(
                "[%s] %s %s completed - %s in %.2fms",
                request_id, scope.get('method'), scope.get('path'), status, duration_ms,
                extra={'extra_fields': {'status_code': status, 'duration_ms': round(duration_ms, 2)}},
            )


# ─────────────────────────────────────────────────────────────────────────────
# ETag / conditional-GET for JSON APIs (innermost: sees the raw, uncompressed
# response body; GZip sits outside and keeps compressing full responses).
# ─────────────────────────────────────────────────────────────────────────────
class ETagMiddleware:
    MAX_ETAG_BODY_BYTES = 2 * 1024 * 1024  # skip huge/streaming payloads

    def __init__(self, app: ASGIApp):
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] != 'http' or scope.get('method') not in ('GET', 'HEAD'):
            await self.app(scope, receive, send)
            return

        # Buffer the whole response first (routed JSON responses are
        # in-memory payloads anyway), then decide: 304 or replay with ETag.
        collected: list = []

        async def collect(message):
            collected.append(message)

        await self.app(scope, receive, collect)

        start_msg = next((m for m in collected if m['type'] == 'http.response.start'), None)
        body_msgs = [m for m in collected if m['type'] == 'http.response.body']
        if start_msg is None or start_msg.get('status') != 200:
            for m in collected:
                await send(m)
            return

        headers = {k.decode().lower(): v.decode(errors='replace')
                   for k, v in start_msg.get('headers', [])}
        ctype = headers.get('content-type', '')
        body = b''.join(m.get('body', b'') for m in body_msgs)
        more = any(m.get('more_body') for m in body_msgs)

        etaggable = (
            ctype.startswith('application/json')
            and not more
            and len(body) <= self.MAX_ETAG_BODY_BYTES
        )

        if etaggable:
            import hashlib
            etag = f'W/"{hashlib.sha1(body).hexdigest()[:16]}"'
            req_headers = {k.decode().lower(): v.decode(errors='replace')
                           for k, v in scope.get('headers', [])}
            if req_headers.get('if-none-match') == etag:
                # 304: identical body the client already holds.
                await send({
                    'type': 'http.response.start',
                    'status': 304,
                    'headers': [(b'etag', etag.encode()),
                                (b'cache-control', b'private, no-cache')],
                })
                await send({'type': 'http.response.body', 'body': b''})
                return
            # Re-emit with the ETag + revalidation directive attached.
            out_headers = [(k, v) for k, v in start_msg['headers']
                           if k.lower() not in (b'etag', b'cache-control')]
            out_headers.append((b'etag', etag.encode()))
            out_headers.append((b'cache-control', b'private, no-cache'))
            start_msg = dict(start_msg, headers=out_headers)

        await send(start_msg)
        for m in body_msgs:
            await send(m)


# ─────────────────────────────────────────────────────────────────────────────
# Body-size limit (Starlette does not enforce one; Flask capped at 100 MB)
# ─────────────────────────────────────────────────────────────────────────────
class BodySizeLimitMiddleware:
    def __init__(self, app: ASGIApp, max_bytes: int):
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] == 'http':
            headers = {k.decode().lower(): v.decode() for k, v in scope.get('headers', [])}
            length = headers.get('content-length')
            if length and length.isdigit() and int(length) > self.max_bytes:
                response = JSONResponse(
                    {'success': False, 'error': 'File too large. Maximum size is 100 MB.'},
                    status_code=413,
                )
                await response(scope, receive, send)
                return
        await self.app(scope, receive, send)


def _allowed_origins() -> list:
    """Strict allowlist: CORS_ORIGINS env plus localhost dev defaults."""
    raw = os.environ.get('CORS_ORIGINS', '').split(',')
    origins = [o.strip() for o in raw if o.strip()]
    if not Config.IS_PRODUCTION:
        defaults = [
            'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002',
            'http://localhost:4000', 'http://localhost:5173', 'http://127.0.0.1:3000',
            'http://127.0.0.1:5173', 'http://127.0.0.1:4000',
        ]
        for d in defaults:
            if d not in origins:
                origins.append(d)
    return origins


def create_app() -> FastAPI:
    from app.api.errors import register_error_handlers
    from app.api.ratelimit import limiter
    from slowapi.errors import RateLimitExceeded

    def _body(message: str) -> dict:
        return {'success': False, 'message': message}

    app = FastAPI(
        title='NeuroSense AI API',
        version='2.0.0',
        docs_url='/docs' if not Config.IS_PRODUCTION else None,
        redoc_url=None,
    )

    # add_middleware: last added = outermost.
    app.add_middleware(RequestMetricsMiddleware)
    app.add_middleware(ETagMiddleware)  # innermost: raw (uncompressed) bodies
    app.add_middleware(SessionMiddleware, secret_key=Config.SECRET_KEY,
                       session_cookie='session',
                       max_age=Config.REMEMBER_COOKIE_DURATION,
                       same_site=Config.SESSION_COOKIE_SAMESITE,
                       https_only=Config.SESSION_COOKIE_SECURE)
    app.add_middleware(BodySizeLimitMiddleware, max_bytes=Config.MAX_CONTENT_LENGTH)
    app.add_middleware(GZipMiddleware, minimum_size=1000)

    # Host allowlist: reject requests whose Host header is not expected.
    # Off by default ('*'); set TRUSTED_HOSTS="api.example.com" in production
    # to kill host-header injection and cache-poisoning classes of attack.
    trusted_hosts = [h.strip() for h in os.environ.get('TRUSTED_HOSTS', '*').split(',') if h.strip()]
    if trusted_hosts != ['*']:
        from starlette.middleware.trustedhost import TrustedHostMiddleware
        app.add_middleware(TrustedHostMiddleware, allowed_hosts=trusted_hosts)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_allowed_origins(),
        allow_credentials=True,
        allow_methods=['*'],
        allow_headers=['*'],
        expose_headers=['Content-Length', 'Content-Type', 'X-Request-ID'],
    )

    # Security headers on every response — added last so this middleware is
    # outermost and even CORS-rejected responses carry them. HSTS only when
    # the deployment is HTTPS-first (SESSION_COOKIE_SECURE=true).
    class SecurityHeadersMiddleware:
        def __init__(self, asgi_app: ASGIApp):
            self.asgi_app = asgi_app
            self.hsts = (
                'max-age=63072000; includeSubDomains'
                if Config.SESSION_COOKIE_SECURE else None
            )

        async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
            if scope['type'] != 'http':
                await self.asgi_app(scope, receive, send)
                return

            async def send_with_headers(message):
                if message['type'] == 'http.response.start':
                    headers = message.setdefault('headers', [])
                    security = [
                        (b'x-content-type-options', b'nosniff'),
                        (b'x-frame-options', b'DENY'),
                        (b'referrer-policy', b'strict-origin-when-cross-origin'),
                    ]
                    if self.hsts:
                        security.append((b'strict-transport-security', self.hsts.encode()))
                    existing = {k.lower() for k, _ in headers}
                    headers.extend([(k, v) for k, v in security if k not in existing])
                await send(message)

            await self.asgi_app(scope, receive, send_with_headers)

    app.add_middleware(SecurityHeadersMiddleware)

    # Rate limiting (slowapi): the 429 handler keeps the flask-limiter body
    # shape ({success, error, retry_after}) the frontend may read.
    app.state.limiter = limiter

    @app.exception_handler(RateLimitExceeded)
    async def ratelimit_handler(request: Request, exc: RateLimitExceeded):
        logger.warning("Rate limit exceeded: %s %s", request.method, request.url.path)
        return JSONResponse({
            'success': False,
            'error': 'Rate limit exceeded. Please try again later.',
            'retry_after': getattr(exc, 'detail', 'Please try again later'),
        }, status_code=429)

    register_error_handlers(app)

    # ── Routes ────────────────────────────────────────────────────────────
    from app.api.routes.auth import router as auth_router
    from app.api.routes.github_auth import router as github_auth_router
    from app.api.routes.patients import router as patients_router
    from app.api.routes.history import router as analyses_router
    from app.api.routes.admin import router as admin_router
    from app.api.routes.analysis import router as analysis_router
    from app.api.routes.meta import router as meta_router

    app.include_router(auth_router)
    app.include_router(github_auth_router)
    app.include_router(patients_router)
    app.include_router(analyses_router)
    app.include_router(admin_router)
    app.include_router(analysis_router)
    app.include_router(meta_router)

    @app.get('/')
    async def index():
        return {
            'message': 'NeuroSense AI API Server',
            'version': '2.0.0',
            'endpoints': {
                'auth': '/api/auth',
                'patients': '/api/patients',
                'analysis': '/api/analysis',
                'health': '/api/health',
            },
        }

    @app.get('/api/health')
    async def health_check():
        model_path = Config.MODEL_PATH
        model_loaded = model_path.exists()
        database_status = 'connected'
        try:
            from sqlalchemy import text
            from app.shared.db_orm import get_engine
            with get_engine().connect() as conn:
                conn.execute(text('SELECT 1'))
        except Exception:
            database_status = 'error'

        healthy = model_loaded and database_status == 'connected'

        return JSONResponse({
            'status': 'healthy' if healthy else 'degraded',
            'version': '1.0.0',
            'services': {
                'database': database_status,
                'models': 'loaded' if model_loaded else 'missing',
                'api': 'operational',
            },
            'models': {
                'MRI Classification Model': {
                    'loaded': model_loaded,
                    'status': 'Loaded' if model_loaded else 'Missing trained model file',
                }
            },
        }, status_code=200 if healthy else 503)

    # ── Startup: schema + demo seed (once per process, never per request) ─
    from app.shared import bootstrap
    bootstrap.bootstrap_database()

    # Eager warmup: default ON so first-request cold-start latency is eliminated.
    # Set ENABLE_EAGER_WARMUP=false to revert to lazy loading (saves RAM on
    # constrained hosts at the cost of a slow first analysis request).
    if os.environ.get('ENABLE_EAGER_WARMUP', 'true').lower() != 'false':
        from app.features.analysis.service import AnalysisOrchestrator
        AnalysisOrchestrator().warmup_async()
    else:
        logger.info("Eager ML warmup disabled (lazy model loading active to conserve RAM)")

    logger.info("NeuroSense FastAPI app created successfully")
    return app


app = create_app()
