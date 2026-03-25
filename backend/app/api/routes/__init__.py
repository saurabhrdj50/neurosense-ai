from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

from app.api.routes import auth  # noqa: E402, F401
