from flask import Blueprint, request, jsonify

from app.api.schemas import LoginSchema, RegisterSchema
from app.repositories.user_repository import UserRepository
from app.core.security import login_user, logout_user, get_current_user

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json() if request.is_json else None
    if not data:
        data = {
            'username': request.form.get('username'),
            'password': request.form.get('password'),
        }
    
    try:
        validated = LoginSchema.validate(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    
    user_repo = UserRepository()
    user = user_repo.authenticate(validated['username'], validated['password'])
    
    if user:
        login_user(user, remember=True)
        return jsonify({'success': True, 'user': user.to_dict()})
    
    return jsonify({'success': False, 'message': 'Invalid username or password'}), 401


@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json() if request.is_json else None
    if not data:
        data = {k: request.form.get(k) for k in ('username', 'email', 'password', 'role', 'full_name')}
    
    try:
        validated = RegisterSchema.validate(data)
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    
    user_repo = UserRepository()
    result = user_repo.create(
        username=validated['username'],
        email=validated['email'],
        password=validated['password'],
        role=validated['role'],
        full_name=validated['full_name'],
    )
    
    status = 200 if result['success'] else 409
    return jsonify(result), status


@auth_bp.route('/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@auth_bp.route('/current-user', methods=['GET'])
def current_user():
    user = get_current_user()
    if user:
        return jsonify({'authenticated': True, 'user': user.to_dict()})
    return jsonify({'authenticated': False})