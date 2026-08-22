import os
import sys

# Ensure backend directory is in sys.path if Gunicorn is invoked from project root
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.join(BASE_DIR, 'backend')
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

# Server socket configuration
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"

# Worker configuration
# Use threaded workers (gthread) to avoid synchronous process blocking during auth/ML requests
workers = int(os.environ.get('WEB_CONCURRENCY', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
worker_class = 'gthread'

# Timeout configuration
# Allow up to 120s for processing before worker termination
timeout = int(os.environ.get('GUNICORN_TIMEOUT', '120'))
keepalive = 5

# Logging configuration
accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info').lower()
