"""FastAPI dependencies: database sessions, session-cookie auth, role guards.

Auth mirrors the Flask-Login semantics the frontend relies on: a signed
session cookie carrying ``user_id`` (set by the login route), JSON 401s that
drive the frontend's global logout handler, and admin bypasses on ownership
checks.
"""
from typing import Any, Optional

from fastapi import Depends, Request

from app.api.errors import ApiError
from app.features.auth.repository import UserRepository


def get_db():
    """Yield a SQLAlchemy session per request."""
    from app.shared.db_orm import get_db_session
    yield from get_db_session()


def get_current_user(request: Request) -> Optional[Any]:
    """Resolve the logged-in user from the signed session cookie (or None).

    Result is cached on ``request.state`` so multiple dependencies and the
    route body share one repository lookup per request.
    """
    cached = getattr(request.state, '_current_user', None)
    if cached is not None:
        return cached

    user_id = request.session.get('user_id')
    if not user_id:
        return None

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return None

    user = UserRepository().get_by_id(user_id)
    request.state._current_user = user
    return user


def require_user(request: Request) -> Any:
    """Dependency: any authenticated user, else the exact Flask 401 body."""
    user = get_current_user(request)
    if user is None:
        raise ApiError(401, 'Authentication required. Please log in.')
    return user


def require_admin(request: Request) -> Any:
    """Dependency: admin users only (same 401/403 bodies as role_required)."""
    user = require_user(request)
    if getattr(user, 'role', None) != 'admin':
        raise ApiError(403, 'Access denied. Insufficient permissions.')
    return user


def is_admin(user: Any) -> bool:
    return getattr(user, 'role', None) == 'admin'
