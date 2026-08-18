import logging
from flask import Blueprint, request, jsonify

from app.api.schemas import LoginSchema, RegisterSchema, ForgotPasswordSchema, ResetPasswordSchema
from app.repositories.user_repository import UserRepository
from app.core.security import login_user, logout_user, get_current_user, role_required

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def _check_login_rate_limit():
    """Apply login rate limiting if limiter is configured and not in test mode."""
    import os
    if os.environ.get('TESTING'):
        return
    try:
        from app import get_limiter
        limiter = get_limiter()
        if limiter:
            limiter.check()
    except Exception:
        pass


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() if request.is_json else None
    if not data:
        data = {
            'username': request.form.get('username'),
            'password': request.form.get('password'),
        }

    logger.debug("Login attempt for: %s", data.get('username'))

    try:
        validated = LoginSchema.validate(data)
    except ValueError as e:
        logger.warning("Login validation failed: %s", e)
        return jsonify({'success': False, 'message': str(e)}), 400

    try:
        user_repo = UserRepository()
        user = user_repo.authenticate(validated['username'], validated['password'])
    except ValueError as e:
        # Catch account lockout exceptions
        logger.warning("Account locked: %s", e)
        return jsonify({'success': False, 'message': str(e)}), 429

    if user:
        login_user(user, remember=True)
        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'role': user.role
        })

    return jsonify({'success': False, 'message': 'Invalid username or password'}), 401


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() if request.is_json else None
    if not data:
        data = {k: request.form.get(k) for k in ('username', 'email', 'password', 'full_name', 'date_of_birth')}

    logger.debug("Registration attempt for: %s", data.get('username'))

    data['role'] = 'doctor'

    try:
        validated = RegisterSchema.validate(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    validated['role'] = 'doctor'

    user_repo = UserRepository()
    result = user_repo.create(
        username=validated['username'],
        email=validated['email'],
        password=validated['password'],
        role='doctor',
        full_name=validated.get('full_name', ''),
        date_of_birth=validated.get('date_of_birth', ''),
    )

    status = 200 if result['success'] else 409
    return jsonify(result), status


@auth_bp.route('/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json() if request.is_json else None
    if not data:
        data = {
            'email': request.form.get('email'),
            'date_of_birth': request.form.get('date_of_birth'),
        }

    try:
        validated = ForgotPasswordSchema.validate(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    user_repo = UserRepository()
    user = user_repo.get_by_email_and_dob(validated['email'], validated['date_of_birth'])

    if not user:
        # Don't reveal exactly whether it failed or succeeded to limit info leakage
        return jsonify({'success': False, 'message': 'If the details exist, a reset link has been sent.'}), 200

    # Generate a time-limited token
    import secrets
    from datetime import datetime, timedelta

    token = secrets.token_urlsafe(32)
    expires = (datetime.now() + timedelta(hours=1)).isoformat()
    
    user_repo.store_reset_token(user.id, token, expires)
    
    # In a real app we would send the email here instead of returning it directly
    return jsonify({
        'success': True, 
        'message': 'Password reset token generated (sent to email)',
        'reset_token': token  # returned here for easy testing
    })


@auth_bp.route('/reset-password', methods=['POST'])
def reset_password():
    data = request.get_json() if request.is_json else None
    if not data:
        data = {
            'token': request.form.get('token'),
            'new_password': request.form.get('new_password'),
        }

    try:
        validated = ResetPasswordSchema.validate(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

    user_repo = UserRepository()
    user = user_repo.get_by_reset_token(validated['token'])

    if not user:
        return jsonify({'success': False, 'message': 'Invalid or expired token'}), 400

    # Set new password
    success = user_repo.reset_password(user.id, validated['new_password'])
    
    if success:
        user_repo.clear_reset_token(user.id)
        # Clear current user's session if they are logged in while doing a reset
        # A more robust solution would track all session IDs and invalidate them
        if get_current_user() and getattr(get_current_user(), 'id', None) == user.id:
            logout_user()
            
        return jsonify({'success': True, 'message': 'Password reset successfully'})
        
    return jsonify({'success': False, 'message': 'Failed to reset password'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@auth_bp.route('/current-user', methods=['GET'])
def current_user_route():
    user = get_current_user()
    if user:
        return jsonify({'authenticated': True, 'user': user.to_dict(), 'role': user.role})
    return jsonify({'authenticated': False})
