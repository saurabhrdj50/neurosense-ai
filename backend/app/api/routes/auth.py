"""Auth router — byte-compatible port of features/auth/routes.py (Flask).

Routes are sync ``def`` (password hashing and DB work block — they belong in
the threadpool); bodies are parsed by async dependencies so the event loop
never blocks.
"""
import logging
import secrets
from datetime import timedelta
from typing import Any, Dict

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse

from app.api.parsing import parse_json_or_form
from app.api.ratelimit import limiter
from app.config.settings import Config
from app.features.auth.schemas import (
    LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema
)
from app.features.auth.repository import UserRepository
from app.shared.time_utils import utc_now

logger = logging.getLogger(__name__)

router = APIRouter(prefix='/api/auth', tags=['auth'])

FORM_ALL_FIELDS = ('username', 'email', 'password', 'full_name', 'date_of_birth',
                   'hospital', 'token', 'new_password')


def _set_session_user(request: Request, user) -> None:
    request.session['user_id'] = user.id


async def _login_body(request: Request) -> Dict[str, Any]:
    return await parse_json_or_form(request, ('username', 'password'))


async def _register_body(request: Request) -> Dict[str, Any]:
    return await parse_json_or_form(
        request, ('username', 'email', 'password', 'full_name', 'date_of_birth', 'hospital'))


async def _forgot_body(request: Request) -> Dict[str, Any]:
    return await parse_json_or_form(request, ('email', 'date_of_birth'))


async def _reset_body(request: Request) -> Dict[str, Any]:
    return await parse_json_or_form(request, ('token', 'new_password'))


@router.post('/login')
@limiter.limit("10/minute")
def login(request: Request, data: Dict = Depends(_login_body)):
    logger.debug("Login attempt for: %s", data.get('username'))

    try:
        validated = LoginSchema.validate(data)
    except ValueError as e:
        logger.warning("Login validation failed: %s", e)
        return JSONResponse({'success': False, 'message': str(e)}, status_code=400)

    try:
        user_repo = UserRepository()
        user = user_repo.authenticate(validated['username'], validated['password'])
    except ValueError as e:
        # Catch account lockout exceptions
        logger.warning("Account locked: %s", e)
        return JSONResponse({'success': False, 'message': str(e)}, status_code=429)

    if user:
        _set_session_user(request, user)
        return {'success': True, 'user': user.to_dict(), 'role': user.role}

    return JSONResponse({'success': False, 'message': 'Invalid username or password'}, status_code=401)


@router.post('/register', status_code=201)
@limiter.limit("10/hour")
def register(request: Request, data: Dict = Depends(_register_body)):
    logger.debug("Registration attempt for: %s", data.get('username'))

    try:
        validated = RegisterSchema.validate(data)
    except ValueError as e:
        return JSONResponse({'success': False, 'message': str(e)}, status_code=400)

    user_repo = UserRepository()
    result = user_repo.create(
        username=validated['username'],
        email=validated['email'],
        password=validated['password'],
        # Role is never taken from client input — self-service registration
        # always creates a doctor account.
        role='doctor',
        full_name=validated.get('full_name', ''),
        date_of_birth=validated.get('date_of_birth', ''),
        hospital=validated.get('hospital', ''),
    )

    if result.get('success'):
        from app.shared.bootstrap import bump_data_version
        bump_data_version()

    status = 201 if result['success'] else 409
    return JSONResponse(result, status_code=status)


@router.post('/forgot-password')
@limiter.limit("5/hour")
def forgot_password(request: Request, data: Dict = Depends(_forgot_body)):

    try:
        validated = ForgotPasswordSchema.validate(data)
    except ValueError as e:
        return JSONResponse({'success': False, 'message': str(e)}, status_code=400)

    user_repo = UserRepository()
    user = user_repo.get_by_email_and_dob(validated['email'], validated['date_of_birth'])

    # Identical response either way so account existence cannot be probed.
    generic_response = {
        'success': True,
        'message': 'If an account exists for this email and date of birth, password reset instructions have been sent.',
    }

    # The fixed admin account never participates in password reset — its
    # credential is a deployment constant, not a recoverable secret. The
    # response is identical to the unknown-identity case.
    if not user or user.role == 'admin':
        if user is not None:
            logger.info("Password reset requested for the fixed admin account — refused, no token issued")
        return generic_response

    token = secrets.token_urlsafe(32)
    expires = (utc_now() + timedelta(hours=1)).isoformat()

    user_repo.store_reset_token(user.id, token, expires)
    logger.info("Password reset token issued for user id=%s", user.id)

    response = dict(generic_response)
    # The token is echoed in the response only when explicitly enabled
    # (EXPOSE_RESET_TOKEN=true) — i.e. isolated dev/test setups with no email
    # delivery channel. It must never leak by accident of a missing env var.
    if Config.EXPOSE_RESET_TOKEN:
        response['reset_token'] = token
    return response


@router.post('/reset-password')
@limiter.limit("10/hour")
def reset_password(request: Request, data: Dict = Depends(_reset_body)):

    try:
        validated = ResetPasswordSchema.validate(data)
    except ValueError as e:
        return JSONResponse({'success': False, 'message': str(e)}, status_code=400)

    user_repo = UserRepository()
    user = user_repo.get_by_reset_token(validated['token'])

    if not user:
        return JSONResponse({'success': False, 'message': 'Invalid or expired token'}, status_code=400)

    # Defense in depth: no reset token can ever belong to the fixed admin
    # (none is issued and startup clears any), but reject one anyway.
    if user.role == 'admin':
        user_repo.clear_reset_token(user.id)
        return JSONResponse({'success': False, 'message': 'Invalid or expired token'}, status_code=400)

    success = user_repo.reset_password(user.id, validated['new_password'])

    if success:
        user_repo.clear_reset_token(user.id)
        # Clear current user's session if they are logged in while doing a reset
        from app.api.deps import get_current_user
        current = get_current_user(request)
        if current and getattr(current, 'id', None) == user.id:
            request.session.pop('user_id', None)

        return {'success': True, 'message': 'Password reset successfully'}

    return JSONResponse({'success': False, 'message': 'Failed to reset password'}, status_code=500)


@router.post('/logout')
def logout(request: Request):
    request.session.pop('user_id', None)
    return {'success': True, 'message': 'Logged out successfully'}


@router.get('/current-user')
def current_user_route(request: Request):
    from app.api.deps import get_current_user
    user = get_current_user(request)
    if user:
        return {'authenticated': True, 'user': user.to_dict(), 'role': user.role}
    return {'authenticated': False}
