import logging
from flask import jsonify
from werkzeug.exceptions import HTTPException

logger = logging.getLogger(__name__)


def _body(message):
    return {'success': False, 'message': message}


def register_error_handlers(app):
    """Register error handlers.

    HTTPException gets its own handler so the generic Exception handler never
    converts client errors (404/405/400/…) into 500s.
    """

    @app.errorhandler(HTTPException)
    def handle_http_exception(e):
        # Preserve the original status code; return JSON for API consumers.
        message = e.description if e.code and e.code < 500 else 'An error occurred processing your request.'
        return jsonify(_body(message)), e.code or 500

    @app.errorhandler(Exception)
    def handle_global_exception(e):
        logger.exception("Unhandled exception caught by global handler")
        # Sentry's Flask integration does not report exceptions consumed by an
        # error handler, so report them explicitly here.
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(e)
        except Exception:
            pass
        return jsonify(_body('An unexpected error occurred processing your request.')), 500

    @app.errorhandler(401)
    def unauthorized_handler(e):
        return jsonify(_body('Authentication required. Please log in.')), 401

    @app.errorhandler(403)
    def forbidden_handler(e):
        return jsonify(_body('Access denied. Insufficient permissions.')), 403

    @app.errorhandler(404)
    def page_not_found(e):
        return jsonify(_body('The requested URL was not found on the server.')), 404

    # NOTE: 429 is handled by the flask-limiter handler in app/__init__.py
    # (richer retry_after payload). Do not register a second 429 handler here.
