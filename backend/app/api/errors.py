"""FastAPI request/response error plumbing.

The frontend depends on Flask-era error bodies: ``{success, message}`` for
almost everything, ``{success, error, retry_after}`` for rate limits, and a
very specific 401 body that triggers its global logout handler. Every handler
here exists to keep that contract byte-identical after the FastAPI cutover.
"""
import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)


class ApiError(Exception):
    """Raise inside a route to return a structured JSON error."""

    def __init__(self, status_code: int, message: str):
        self.status_code = status_code
        self.message = message
        super().__init__(message)


def _body(message: str) -> dict:
    return {'success': False, 'message': message}


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(ApiError)
    async def handle_api_error(request: Request, exc: ApiError):
        return JSONResponse(_body(exc.message), status_code=exc.status_code)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_exception(request: Request, exc: StarletteHTTPException):
        code = exc.status_code or 500
        # Preserve the original status code; generic message for 5xx like the
        # Flask handler did.
        message = exc.detail if code < 500 else 'An error occurred processing your request.'
        if code == 401:
            message = 'Authentication required. Please log in.'
        elif code == 403:
            message = 'Access denied. Insufficient permissions.'
        elif code == 404:
            message = 'The requested URL was not found on the server.'
        return JSONResponse(_body(str(message)), status_code=code)

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(request: Request, exc: RequestValidationError):
        # Flask answered non-int path converters with 404; keep parity so
        # clients branching on 404 keep working. Other payload issues → 400.
        path_errors = [e for e in exc.errors() if e.get('loc', ('',))[0] == 'path']
        if path_errors:
            return JSONResponse(
                _body('The requested URL was not found on the server.'), status_code=404
            )
        return JSONResponse(
            _body('Invalid request payload. Please check your input.'), status_code=400
        )

    @app.exception_handler(Exception)
    async def handle_global_exception(request: Request, exc: Exception):
        logger.exception("Unhandled exception caught by global handler")
        try:
            import sentry_sdk
            sentry_sdk.capture_exception(exc)
        except Exception:
            pass
        return JSONResponse(
            _body('An unexpected error occurred processing your request.'), status_code=500
        )
