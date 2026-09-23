import os

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
