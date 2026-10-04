import os
import secrets
import logging
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent  # backend root
PROJECT_ROOT = BASE_DIR.parent
# Load .env from backend directory first, then root project directory.
# The backend/.env wins for keys it defines; real environment variables always
# win over values absent from both files.
load_dotenv(BASE_DIR / '.env')
load_dotenv(PROJECT_ROOT / '.env')


def _env_bool(name: str, default: str = 'false') -> bool:
    return os.environ.get(name, default).strip().lower() in ('1', 'true', 'yes')


class Config:
    BASE_DIR = Path(__file__).resolve().parent.parent
    ROOT_DIR = BASE_DIR.parent

    # Single source of truth for "is this a production deployment".
    # Unsafe-by-default behaviors (demo seeding, reset-token echo) key off
    # their own explicit env vars — never off FLASK_ENV alone.
    FLASK_ENV = os.environ.get('FLASK_ENV', 'development').lower()
    IS_PRODUCTION = FLASK_ENV == 'production'
    TESTING = _env_bool('TESTING')

    SECRET_KEY = os.environ.get('SECRET_KEY') or os.environ.get('FLASK_SECRET_KEY')
    if not SECRET_KEY:
        if IS_PRODUCTION:
            raise RuntimeError(
                "SECRET_KEY must be set in production. Refusing to start with a default key."
            )
        logging.warning("SECRET_KEY not set — generating ephemeral development key.")
        SECRET_KEY = secrets.token_urlsafe(48)

    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    MAX_CONTENT_LENGTH = 100 * 1024 * 1024

    DB_PATH = Path(os.environ.get('SQLITE_PATH', ROOT_DIR / 'patient_data.db'))

    MODEL_PATH = BASE_DIR / 'models' / 'alzheimer_model.pth'

    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
    ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3', 'flac', 'webm', 'ogg'}

    # Cookies: secure defaults in production; operators may override for
    # local plain-HTTP development.
    SESSION_COOKIE_SECURE = (
        _env_bool('SESSION_COOKIE_SECURE', 'true' if IS_PRODUCTION else 'false')
    )
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.environ.get('SESSION_COOKIE_SAMESITE', 'Lax')
    REMEMBER_COOKIE_DURATION = int(os.environ.get('REMEMBER_COOKIE_DAYS', '30')) * 24 * 3600

    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = False

    CORS_HEADERS = 'Content-Type'

    # Explicit opt-in flags (all default to the safe direction):
    SEED_DEMO_USERS = _env_bool('SEED_DEMO_USERS')
    EXPOSE_RESET_TOKEN = _env_bool('EXPOSE_RESET_TOKEN')
    ENABLE_GOOGLE_SPEECH_FALLBACK = _env_bool('ENABLE_GOOGLE_SPEECH_FALLBACK')
    TRUST_PROXY = _env_bool('TRUST_PROXY')
