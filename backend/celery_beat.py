"""
Celery beat scheduler for periodic tasks.
Run with: celery -A app.celery_app beat --loglevel=info
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from celery.schedules import crontab
from app.celery_app import celery_app

celery_app.conf.beat_schedule = {
    'cleanup-old-results': {
        'task': 'app.tasks.maintenance.cleanup_old_results',
        'schedule': crontab(hour=2, minute=0),
    },
    'generate-daily-reports': {
        'task': 'app.tasks.maintenance.generate_daily_summary',
        'schedule': crontab(hour=6, minute=0),
    },
    'health-check': {
        'task': 'app.tasks.maintenance.health_check',
        'schedule': 300.0,
    },
}
