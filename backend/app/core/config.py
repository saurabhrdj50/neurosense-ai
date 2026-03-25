import os
import logging
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(BASE_DIR / '.env')


class Config:
    BASE_DIR = Path(__file__).resolve().parent.parent
    ROOT_DIR = BASE_DIR.parent
    
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.environ.get('FLASK_SECRET_KEY')
    if not SECRET_KEY:
        logging.warning("SECRET_KEY not set — using development fallback.")
        SECRET_KEY = 'neurosense-dev-key-change-in-production'
    
    UPLOAD_FOLDER = BASE_DIR / 'uploads'
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    
    DB_PATH = ROOT_DIR / 'patient_data.db'
    
    MODEL_PATH = BASE_DIR / 'models' / 'alzheimer_model.pth'
    
    ALLOWED_IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff'}
    ALLOWED_AUDIO_EXTENSIONS = {'wav', 'mp3', 'flac', 'webm', 'ogg'}
    
    SESSION_COOKIE_SECURE = False
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    JSON_SORT_KEYS = False
    JSONIFY_PRETTYPRINT_REGULAR = False
    
    CORS_HEADERS = 'Content-Type'
