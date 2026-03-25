import functools
from typing import Optional, Callable, Any, List
from flask import session, redirect, url_for, request, jsonify

from werkzeug.security import generate_password_hash, check_password_hash

try:
    from flask_login import current_user as flask_current_user, login_required as flask_login_required
    HAS_FLASK_LOGIN = True
except ImportError:
    HAS_FLASK_LOGIN = False
    flask_current_user = None
    flask_login_required = None


def hash_password(password: str) -> str:
    return generate_password_hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return check_password_hash(password_hash, password)


def login_required(f: Callable[..., Any]) -> Callable[..., Any]:
    decorator = flask_login_required if HAS_FLASK_LOGIN else None
    
    if decorator is not None:
        return decorator(f)
    
    @functools.wraps(f)
    def decorated_function(*args: Any, **kwargs: Any) -> Any:
        if 'user_id' not in session:
            return redirect(url_for('auth.login'))
        return f(*args, **kwargs)
    return decorated_function


def role_required(*allowed_roles: str):
    """
    Decorator to restrict access based on user roles.
    
    Usage:
        @role_required("admin")
        @role_required("admin", "doctor")
    """
    def decorator(f: Callable[..., Any]) -> Callable[..., Any]:
        @functools.wraps(f)
        def decorated_function(*args: Any, **kwargs: Any) -> Any:
            user = get_current_user()
            
            if not user:
                if request.is_json:
                    return jsonify({'success': False, 'message': 'Authentication required'}), 401
                return redirect(url_for('auth.login'))
            
            if user.role not in allowed_roles:
                if request.is_json:
                    return jsonify({'success': False, 'message': 'Access denied. Insufficient permissions.'}), 403
                return redirect(url_for('auth.login'))
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def admin_required(f: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to restrict access to admin only."""
    return role_required("admin")(f)


def doctor_required(f: Callable[..., Any]) -> Callable[..., Any]:
    """Decorator to restrict access to doctors and admins."""
    return role_required("admin", "doctor")(f)


def get_current_user() -> Optional[Any]:
    if HAS_FLASK_LOGIN and flask_current_user is not None:
        if hasattr(flask_current_user, 'is_authenticated') and flask_current_user.is_authenticated:
            return flask_current_user
    
    if 'user_id' in session:
        from app.repositories.user_repository import UserRepository
        repo = UserRepository()
        return repo.get_by_id(session['user_id'])
    
    return None


def get_current_user_id() -> Optional[int]:
    if HAS_FLASK_LOGIN and flask_current_user is not None:
        if hasattr(flask_current_user, 'is_authenticated') and flask_current_user.is_authenticated:
            return flask_current_user.id
    
    return session.get('user_id')


def login_user(user: Any, remember: bool = True) -> bool:
    if HAS_FLASK_LOGIN:
        from flask_login import login_user as flask_login_user
        return flask_login_user(user, remember=remember)
    else:
        session['user_id'] = user.id
        return True


def logout_user() -> None:
    if HAS_FLASK_LOGIN:
        from flask_login import logout_user as flask_logout_user
        flask_logout_user()
    else:
        session.pop('user_id', None)
