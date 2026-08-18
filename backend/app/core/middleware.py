import time
import logging
from functools import wraps
from typing import Callable, Any, Optional
from flask import request, g, jsonify

from app.core.exceptions import (
    NeuroSenseError,
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    AnalysisError,
    FileProcessingError,
    DatabaseError
)


logger = logging.getLogger(__name__)


class ErrorResponse:
    """Standardized error response structure."""
    
    @staticmethod
    def format(
        error: str,
        status_code: int = 500,
        details: Optional[dict] = None,
        request_id: Optional[str] = None
    ) -> tuple:
        """Format error response."""
        response = {
            'success': False,
            'error': error,
            'status_code': status_code,
        }
        
        if request_id and hasattr(g, 'request_id'):
            response['request_id'] = g.request_id
        
        if details:
            response['details'] = details
        
        return jsonify(response), status_code
    
    @staticmethod
    def success(data: dict = None, message: str = None) -> tuple:
        """Format success response."""
        response = {'success': True}
        
        if message:
            response['message'] = message
        
        if data:
            response.update(data)
        
        return jsonify(response), 200


class ErrorHandler:
    """Centralized error handler with proper HTTP status codes."""
    
    error_mapping = {
        ValidationError: (400, 'Validation Error'),
        AuthenticationError: (401, 'Authentication Error'),
        AuthorizationError: (403, 'Authorization Error'),
        NotFoundError: (404, 'Not Found'),
        AnalysisError: (500, 'Analysis Error'),
        FileProcessingError: (400, 'File Processing Error'),
        DatabaseError: (500, 'Database Error'),
        NeuroSenseError: (500, 'Internal Error'),
    }
    
    @classmethod
    def handle(cls, error: Exception) -> tuple:
        """Handle an exception and return appropriate response."""
        error_type = type(error)
        
        if error_type in cls.error_mapping:
            status_code, error_name = cls.error_mapping[error_type]
            return ErrorResponse.format(
                error=str(error),
                status_code=status_code,
                request_id=getattr(g, 'request_id', None)
            )
        
        if isinstance(error, NeuroSenseError):
            return ErrorResponse.format(
                error=str(error),
                status_code=getattr(error, 'status_code', 500),
                request_id=getattr(g, 'request_id', None)
            )
        
        if isinstance(error, ValueError):
            return ErrorResponse.format(
                error=str(error),
                status_code=400,
                request_id=getattr(g, 'request_id', None)
            )
        
        if isinstance(error, TypeError):
            return ErrorResponse.format(
                error="Invalid data type provided",
                status_code=400,
                request_id=getattr(g, 'request_id', None)
            )
        
        logger.exception(
            "Unhandled exception",
            extra={'extra_fields': {'error_type': error_type.__name__}}
        )
        
        return ErrorResponse.format(
            error="An unexpected error occurred",
            status_code=500,
            request_id=getattr(g, 'request_id', None)
        )


def handle_errors(f: Callable) -> Callable:
    """Decorator to handle errors in route handlers."""
    @wraps(f)
    def decorated_function(*args, **kwargs) -> Any:
        try:
            return f(*args, **kwargs)
        except NeuroSenseError as e:
            return ErrorHandler.handle(e)
        except Exception as e:
            logger.exception(
                f"Error in {f.__name__}",
                extra={
                    'extra_fields': {
                        'function': f.__name__,
                        'args': str(args)[:200],
                    }
                }
            )
            return ErrorResponse.format(
                error="An unexpected error occurred",
                status_code=500,
                request_id=getattr(g, 'request_id', None)
            )
    return decorated_function


def require_auth(f: Callable) -> Callable:
    """Decorator to require authentication."""
    @wraps(f)
    @handle_errors
    def decorated_function(*args, **kwargs) -> Any:
        from app.core.security import get_current_user
        
        user = get_current_user()
        if not user:
            raise AuthenticationError("Authentication required")
        
        g.current_user = user
        return f(*args, **kwargs)
    
    return decorated_function


def require_role(*roles: str) -> Callable:
    """Decorator to require specific roles."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        @require_auth
        def decorated_function(*args, **kwargs) -> Any:
            user = g.get('current_user')
            if not user or user.role not in roles:
                raise AuthorizationError(
                    f"This action requires one of these roles: {', '.join(roles)}"
                )
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def log_request(f: Callable) -> Callable:
    """Decorator to log request details."""
    @wraps(f)
    def decorated_function(*args, **kwargs) -> Any:
        start_time = time.time()
        
        logger.info(
            f"Request started: {request.method} {request.path}",
            extra={
                'extra_fields': {
                    'method': request.method,
                    'path': request.path,
                    'ip': request.remote_addr,
                    'user_agent': request.user_agent.string[:100],
                }
            }
        )
        
        try:
            response = f(*args, **kwargs)
            
            duration = time.time() - start_time
            logger.info(
                f"Request completed: {request.method} {request.path}",
                extra={
                    'extra_fields': {
                        'method': request.method,
                        'path': request.path,
                        'status_code': response[1] if isinstance(response, tuple) else 200,
                        'duration_ms': round(duration * 1000, 2),
                    }
                }
            )
            
            return response
        except Exception as e:
            duration = time.time() - start_time
            logger.error(
                f"Request failed: {request.method} {request.path}",
                extra={
                    'extra_fields': {
                        'method': request.method,
                        'path': request.path,
                        'error': str(e),
                        'duration_ms': round(duration * 1000, 2),
                    }
                }
            )
            raise
    
    return decorated_function


def validate_content_type(*allowed_types: str) -> Callable:
    """Decorator to validate content type."""
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated_function(*args, **kwargs) -> Any:
            content_type = request.content_type or ''
            
            is_valid = any(
                content_type.startswith(allowed_type)
                for allowed_type in allowed_types
            )
            
            if not is_valid:
                return ErrorResponse.format(
                    error=f"Content-Type must be one of: {', '.join(allowed_types)}",
                    status_code=415
                )
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator
