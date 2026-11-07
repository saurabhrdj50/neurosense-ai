"""GitHub OAuth helpers — token exchange and profile fetch.

Kept separate from the route layer so the HTTP flow (state, session,
redirects) can be tested without touching GitHub, and so the exchange logic
can be unit-tested with a stubbed httpx client.

No secrets are logged. The access token lives only in memory for the
duration of the callback request.
"""
import logging
import secrets

import httpx

from app.config.settings import Config

logger = logging.getLogger(__name__)

GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
GITHUB_USER_URL = 'https://api.github.com/user'
GITHUB_EMAILS_URL = 'https://api.github.com/user/emails'


def is_github_configured() -> bool:
    """True only when every value the OAuth flow needs is present."""
    return bool(
        Config.GITHUB_CLIENT_ID
        and Config.GITHUB_CLIENT_SECRET
        and Config.GITHUB_REDIRECT_URI
    )


def generate_state() -> str:
    """Unpredictable CSRF token stored in the session for one login attempt."""
    return secrets.token_urlsafe(32)


def build_authorize_url(state: str) -> str:
    """GitHub authorization URL the browser is redirected to."""
    from urllib.parse import urlencode

    params = {
        'client_id': Config.GITHUB_CLIENT_ID,
        'redirect_uri': Config.GITHUB_REDIRECT_URI,
        'scope': 'read:user user:email',
        'state': state,
    }
    return f"{GITHUB_AUTHORIZE_URL}?{urlencode(params)}"


def exchange_code_for_token(code: str) -> str:
    """Exchange the one-time ``code`` for a GitHub access token.

    Raises ValueError on any failure (bad code, revoked app, GitHub error)
    so the route can redirect back to login with a generic message.
    """
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(
                GITHUB_TOKEN_URL,
                data={
                    'client_id': Config.GITHUB_CLIENT_ID,
                    'client_secret': Config.GITHUB_CLIENT_SECRET,
                    'code': code,
                    'redirect_uri': Config.GITHUB_REDIRECT_URI,
                },
                headers={'Accept': 'application/json'},
            )
    except httpx.HTTPError as exc:
        logger.warning("GitHub token exchange failed: %s", exc)
        raise ValueError('GitHub login failed. Please try again.') from exc

    try:
        payload = resp.json()
    except ValueError as exc:
        raise ValueError('GitHub login failed. Please try again.') from exc

    token = payload.get('access_token')
    if resp.status_code != 200 or not token:
        logger.warning(
            "GitHub token exchange rejected (status %s): %s",
            resp.status_code, payload.get('error'),
        )
        raise ValueError('GitHub login failed. Please try again.')
    return token


def _github_get(url: str, token: str) -> dict:
    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.get(
                url,
                headers={
                    'Authorization': f'Bearer {token}',
                    'Accept': 'application/vnd.github+json',
                },
            )
    except httpx.HTTPError as exc:
        logger.warning("GitHub API request failed: %s", exc)
        raise ValueError('Could not read your GitHub profile. Please try again.') from exc
    if resp.status_code != 200:
        logger.warning("GitHub API rejected request (status %s)", resp.status_code)
        raise ValueError('Could not read your GitHub profile. Please try again.')
    return resp.json()


def fetch_github_user(token: str) -> dict:
    """Return the authenticated user's GitHub profile (id, login, name, ...)."""
    return _github_get(GITHUB_USER_URL, token)


def fetch_primary_email(token: str) -> str | None:
    """Return the user's primary verified email, or None if none is visible.

    GitHub only exposes an email here when the user has a public email or
    has granted the user:email scope and verified an address. A private
    email is not a failure of the flow — the callback reports it and asks
    the user to make an email visible / verify one.
    """
    payload = _github_get(GITHUB_EMAILS_URL, token)
    if not isinstance(payload, list):
        return None
    for entry in payload:
        if entry.get('primary') and entry.get('verified'):
            return entry.get('email')
    for entry in payload:
        if entry.get('verified'):
            return entry.get('email')
    return None
