import os
import logging
from app import create_app

# Configure logging
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

os.makedirs(os.path.join(BASE_DIR, 'uploads'), exist_ok=True)
os.makedirs(os.path.join(BASE_DIR, 'models'), exist_ok=True)

app = create_app()

if __name__ == '__main__':
    logger.info("=" * 60)
    logger.info("Starting NeuroSense AI Server")
    logger.info("Backend:  http://0.0.0.0:5000")
    logger.info("Frontend: http://localhost:3000 (via Vite proxy)")
    logger.info("Default login: admin / admin123")
    logger.info("=" * 60)
    app.run(debug=True, use_reloader=False, host='0.0.0.0', port=5000)