import logging
from flask import Blueprint, request, jsonify

from app.api.schemas import LoginSchema, RegisterSchema
from app.repositories.user_repository import UserRepository
from app.core.security import login_user, logout_user, get_current_user, role_required

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def _rate_limit_login(f):
    try:
        from app import get_limiter
        limiter = get_limiter()
        if limiter:
            return limiter.limit("5 per minute")(f)
    except Exception:
        pass
    return f


@auth_bp.route('/login', methods=['POST'])
@_rate_limit_login
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
    
    user_repo = UserRepository()
    user = user_repo.authenticate(validated['username'], validated['password'])
    
    if user:
        login_user(user, remember=True)
        logger.info("User '%s' logged in successfully", user.username)
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
        data = {k: request.form.get(k) for k in ('username', 'email', 'password', 'full_name')}
    
    logger.debug("Registration attempt for: %s", data.get('username'))
    
    # Force role to be 'doctor' - cannot register as admin from frontend
    data['role'] = 'doctor'
    
    try:
        validated = RegisterSchema.validate(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    
    # Ensure role is always 'doctor' for registration
    validated['role'] = 'doctor'
    
    user_repo = UserRepository()
    result = user_repo.create(
        username=validated['username'],
        email=validated['email'],
        password=validated['password'],
        role='doctor',  # Always create as doctor
        full_name=validated.get('full_name', ''),
    )
    
    status = 200 if result['success'] else 409
    return jsonify(result), status


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