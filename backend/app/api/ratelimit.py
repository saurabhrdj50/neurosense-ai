"""Rate limiting (slowapi) — preserves the flask-limiter semantics.

Keying: authenticated user id when a session exists, else client IP. Limits
default to 1000/day, 300/hour, 60/min with stricter per-route limits on the
auth brute-force surface. Disabled wholesale under TESTING, matching the
Flask behavior the test suite relies on.
"""
import os

from slowapi import Limiter
from slowapi.util import get_remote_address


def _rate_limit_key(request):
    """Authenticated user when possible, else remote address (Flask parity)."""
    try:
        user_id = request.session.get('user_id')
        if user_id:
            return f"user_{user_id}"
    except Exception:
        pass
    return get_remote_address(request)


def _default_limits():
    """Global default limits, overridable via RATELIMIT_DEFAULT_LIMITS
    (comma-separated, e.g. '2000/day,600/hour,120/minute') for deployments
    that need headroom — offices behind one NAT share a user-keyed bucket."""
    raw = os.environ.get('RATELIMIT_DEFAULT_LIMITS', '1000/day,300/hour,60/minute')
    return [part.strip() for part in raw.split(',') if part.strip()]


limiter = Limiter(
    key_func=_rate_limit_key,
    default_limits=_default_limits(),
    storage_uri=os.environ.get('RATELIMIT_STORAGE', 'memory://'),
    enabled=os.environ.get('TESTING', '').lower() != 'true',
)
