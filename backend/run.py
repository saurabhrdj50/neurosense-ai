"""NeuroSense AI server entrypoint (uvicorn).

    python run.py                # dev server on $PORT (default 10000)
    uvicorn app.main:app ...     # equivalent explicit form used in Docker

Runs as a single process by design: the background-job registry is in-memory
and ML models are process singletons. Concurrency comes from uvicorn's async
event loop plus FastAPI's threadpool for the blocking (sync) endpoints, and
from ML_JOB_WORKERS for heavyweight analysis jobs.
"""
import logging
import os

import uvicorn

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.makedirs(os.path.join(BASE_DIR, 'app', 'uploads'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'app', 'models'), exist_ok=True)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))

    logger.info("=" * 60)
    logger.info("Starting NeuroSense AI Server (FastAPI)")
    logger.info(f"Running on port: {port}")
    logger.info("=" * 60)

    workers = int(os.environ.get("WEB_CONCURRENCY", os.environ.get("UVICORN_WORKERS", "1")))

    uvicorn.run(
        'app.main:app',
        host='0.0.0.0',
        port=port,
        workers=workers,
        proxy_headers=bool(os.environ.get('TRUST_PROXY')),
        server_header=False,
    )
