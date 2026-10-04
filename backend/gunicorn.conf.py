import os

# Server socket configuration
bind = f"0.0.0.0:{os.environ.get('PORT', '10000')}"

# Worker configuration
# Use threaded workers (gthread) to avoid synchronous process blocking during auth/ML requests
workers = int(os.environ.get('WEB_CONCURRENCY', '2'))
threads = int(os.environ.get('GUNICORN_THREADS', '4'))
worker_class = 'gthread'

# Preload the app so every worker shares one import: without it, each worker
# derived its own SECRET_KEY (ephemeral fallback) and PHI encryption key —
# sessions signed by one worker were rejected by the others. Requires
# SECRET_KEY to be set explicitly in production (settings refuses otherwise).
preload_app = True

# Timeout configuration
# Allow up to 120s for processing before worker termination
timeout = int(os.environ.get('GUNICORN_TIMEOUT', '120'))
keepalive = 5

# Logging configuration
accesslog = '-'
errorlog = '-'
loglevel = os.environ.get('LOG_LEVEL', 'info').lower()
