import os
import logging
from app import create_app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.makedirs(os.path.join(BASE_DIR, 'uploads'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'models'), exist_ok=True)

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))

    logger.info("=" * 60)
    logger.info("Starting NeuroSense AI Server")
    logger.info(f"Running on port: {port}")
    logger.info("=" * 60)

    app.run(
        host='0.0.0.0',
        port=port,
        debug=False
    )
