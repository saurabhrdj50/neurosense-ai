import functools
from typing import Optional, Callable, Any
from flask import session, redirect, url_for, request

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
