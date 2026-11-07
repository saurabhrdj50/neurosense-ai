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
    # their own explicit env vars — never off APP_ENV alone.
    APP_ENV = (
        os.environ.get('APP_ENV') or os.environ.get('FLASK_ENV') or 'development'
    ).lower()
    IS_PRODUCTION = APP_ENV == 'production'
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

    # Primary database URL. PostgreSQL in production (see docker-compose);
    # empty → SQLite file at DB_PATH (zero-config dev/test fallback).
    DATABASE_URL = os.environ.get('DATABASE_URL', '').strip() or None

    MODEL_DIR = BASE_DIR / 'models'
    MODEL_PATH = MODEL_DIR / 'alzheimer_model.pth'

    # Speech NLP dementia classifier (research model over the Whisper
    # transcript; runs fully local, no third-party calls). Enabled by
    # default — the artefact must exist at models/speech/, otherwise the
    # classifier silently carries no vote.
    SPEECH_NLP_ENABLED = _env_bool('SPEECH_NLP_ENABLED', 'true')
    SPEECH_NLP_MIN_WORDS = int(os.environ.get('SPEECH_NLP_MIN_WORDS', '15'))

    # GitHub OAuth login (optional — unset = GitHub login disabled, password
    # login still works). Set these from the GitHub OAuth App created for
    # this deployment; GITHUB_REDIRECT_URI must match the app's callback URL
    # exactly, e.g. https://<render-service>.onrender.com/api/auth/github/callback
    GITHUB_CLIENT_ID = os.environ.get('GITHUB_CLIENT_ID', '').strip()
    GITHUB_CLIENT_SECRET = os.environ.get('GITHUB_CLIENT_SECRET', '').strip()
    GITHUB_REDIRECT_URI = os.environ.get('GITHUB_REDIRECT_URI', '').strip()
    # Public frontend origin the OAuth flow redirects back to after login.
    FRONTEND_URL = os.environ.get('FRONTEND_URL', '').strip()

    # Simplified (free-tier) deploy flags. Heavy MRI / voice inference is
    # OFF by default in this deploy profile — Render free (512 MB) cannot
    # hold Whisper (~1.5 GB) / DistilBERT. When a flag is false the
    # corresponding routes answer 503 with a clear "disabled" message
    # instead of running the model; cognitive + risk analysis still runs
    # and fusion re-normalises over the modalities that are present.
    # Defaults are true so local dev and the test suite keep full behaviour;
    # the simplified deploy sets both to false (see render.yaml).
    ENABLE_MRI = _env_bool('ENABLE_MRI', 'true')
    ENABLE_VOICE = _env_bool('ENABLE_VOICE', 'true')

    # Object Storage (Local disk vs MinIO / S3)
    STORAGE_BACKEND = os.environ.get('STORAGE_BACKEND', 'local').lower()
    MINIO_ENDPOINT = os.environ.get('MINIO_ENDPOINT', '').strip()
    MINIO_ACCESS_KEY = os.environ.get('MINIO_ACCESS_KEY', 'minioadmin')
    MINIO_SECRET_KEY = os.environ.get('MINIO_SECRET_KEY', 'minioadmin')
    MINIO_BUCKET = os.environ.get('MINIO_BUCKET', 'neurosense-uploads')
    MINIO_SECURE = _env_bool('MINIO_SECURE', 'false')

    # Distributed Task Queue (Celery + Redis)
    REDIS_URL = os.environ.get('REDIS_URL', '').strip()
    CELERY_BROKER_URL = os.environ.get('CELERY_BROKER_URL', REDIS_URL or 'redis://localhost:6379/0')
    CELERY_RESULT_BACKEND = os.environ.get('CELERY_RESULT_BACKEND', REDIS_URL or 'redis://localhost:6379/0')
    USE_CELERY = _env_bool('USE_CELERY', 'false')

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
    # NOTE: there is no SEED_DEMO_USERS flag anymore — the fixed admin is
    # provisioned at startup from ADMIN_USERNAME / ADMIN_PASSWORD /
    # ADMIN_EMAIL (see app.shared.bootstrap); in production with no
    # ADMIN_PASSWORD set, no fixed admin is created at all. Doctors
    # self-register.
    EXPOSE_RESET_TOKEN = _env_bool('EXPOSE_RESET_TOKEN')
    TRUST_PROXY = _env_bool('TRUST_PROXY')
