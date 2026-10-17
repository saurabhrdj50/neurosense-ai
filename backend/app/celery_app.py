"""Celery application configuration for NeuroSense AI background workers."""
import os
import logging
from celery import Celery
from app.config.settings import Config

logger = logging.getLogger(__name__)

broker_url = Config.CELERY_BROKER_URL or Config.REDIS_URL or 'redis://localhost:6379/0'
result_backend = Config.CELERY_RESULT_BACKEND or Config.REDIS_URL or 'redis://localhost:6379/0'

celery_app = Celery(
    'neurosense',
    broker=broker_url,
    backend=result_backend,
    include=['app.tasks.analysis_tasks'],
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,        # 5 min hard limit
    task_soft_time_limit=240,   # 4 min soft limit
    worker_prefetch_multiplier=1,
)

if __name__ == '__main__':
    celery_app.start()
