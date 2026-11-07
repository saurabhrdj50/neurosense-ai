"""GitHub OAuth login router — "Continue with GitHub".

Flow (same signed session cookie as password login — no JWT):
  GET  /api/auth/github/login
       → generates a one-time ``state``, stores it in the session, and
         redirects the browser to github.com/login/oauth/authorize.
  GET  /api/auth/github/callback?code=...&state=...
       → verifies ``state``, exchanges ``code`` for a token, fetches the
         GitHub profile + primary verified email, finds or creates the
         user by ``github_id`` (linking an existing password account with
         the same verified email), sets ``request.session['user_id']``
         exactly like POST /api/auth/login, and redirects to the
         frontend's /auth/callback page, which finishes the login.

GitHub login is disabled (503) until GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET
/ GITHUB_REDIRECT_URI are all set — password login is unaffected.
"""
import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, RedirectResponse

from app.api.ratelimit import limiter
from app.config.settings import Config
from app.features.auth import github as github_oauth
from app.features.auth.repository import UserRepository
from app.shared.bootstrap import bump_data_version

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/auth/github', tags=['auth'])

DISABLED_MESSAGE = 'GitHub login is not configured for this deployment.'


def _frontend_url(path: str) -> str:
    base = (Config.FRONTEND_URL or '').rstrip('/')
    if base:
        return f'{base}{path}'
    return path


def _login_redirect(error: str | None = None) -> RedirectResponse:
    url = _frontend_url('/login')
    if error:
        url = f'{url}?github_error={error}'
    return RedirectResponse(url=url, status_code=302)


@router.get('/login')
@limiter.limit("10/minute")
def github_login(request: Request):
    if not github_oauth.is_github_configured():
        return JSONResponse(
            {'success': False, 'message': DISABLED_MESSAGE}, status_code=503
        )
    state = github_oauth.generate_state()
    request.session['github_oauth_state'] = state
    return RedirectResponse(
        url=github_oauth.build_authorize_url(state), status_code=302
    )


@router.get('/callback')
@limiter.limit("10/minute")
def github_callback(request: Request, code: str | None = None,
                    state: str | None = None, error: str | None = None):
    if error:
        logger.info("GitHub OAuth denied/errored: %s", error)
        return _login_redirect('denied')
    if not github_oauth.is_github_configured():
        return JSONResponse(
            {'success': False, 'message': DISABLED_MESSAGE}, status_code=503
        )

    # CSRF check: the state we stored in the session before redirecting.
    expected_state = request.session.pop('github_oauth_state', None)
    if not state or not expected_state or state != expected_state:
        logger.warning("GitHub OAuth state mismatch — possible CSRF attempt")
        return _login_redirect('state_mismatch')
    if not code:
        return _login_redirect('missing_code')

    try:
        token = github_oauth.exchange_code_for_token(code)
        profile = github_oauth.fetch_github_user(token)
        email = profile.get('email') or github_oauth.fetch_primary_email(token)
    except ValueError as exc:
        logger.warning("GitHub OAuth failed: %s", exc)
        return _login_redirect('failed')

    github_id = str(profile.get('id') or '')
    github_login = profile.get('login') or ''
    if not github_id or not github_login:
        return _login_redirect('failed')
    if not email:
        # No verified email is visible for this GitHub account — we cannot
        # create a NeuroSense account without one (email is unique + required).
        logger.info("GitHub OAuth: no verified email visible for %s", github_login)
        return _login_redirect('no_email')

    repo = UserRepository()
    user = repo.get_by_github_id(github_id)
    if user is None:
        # Link an existing password account with the same verified email,
        # so a doctor who registered with email first keeps one account.
        user = repo.get_by_email(email)
        if user is not None:
            repo.link_github_account(
                user.id, github_id, github_login,
                profile.get('avatar_url') or '',
            )
            user = repo.get_by_github_id(github_id)
    if user is None:
        result = repo.create_github_user(
            github_id=github_id,
            github_login=github_login,
            email=email,
            full_name=profile.get('name') or '',
            avatar_url=profile.get('avatar_url') or '',
        )
        if not result.get('success'):
            logger.warning(
                "GitHub OAuth: could not create user for %s: %s",
                github_login, result.get('message'),
            )
            return _login_redirect('failed')
        bump_data_version()
        user = repo.get_by_id(result['user_id'])

    if user is None or not user.is_active:
        return _login_redirect('failed')

    repo.record_login(user.id)
    request.session['user_id'] = user.id
    logger.info("GitHub login successful for '%s' (github_id=%s)", github_login, github_id)
    return RedirectResponse(url=_frontend_url('/auth/callback'), status_code=302)
