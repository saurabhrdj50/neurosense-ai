"""
Celery configuration for async task processing.
Enables background processing for long-running ML operations.
"""
from celery import Celery
from celery.signals import worker_ready, worker_shutdown
import logging

logger = logging.getLogger(__name__)

celery_app = Celery(
    'neurosense',
    broker='redis://localhost:6379/0',
    backend='redis://localhost:6379/1',
    include=['app.tasks.mri_tasks', 'app.tasks.analysis_tasks']
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    task_track_started=True,
    task_time_limit=600,
    task_soft_time_limit=540,
    
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
    
    task_routes={
        'app.tasks.mri_tasks.*': {'queue': 'mri'},
        'app.tasks.analysis_tasks.*': {'queue': 'analysis'},
    },
    
    task_annotations={
        'app.tasks.mri_tasks.classify_mri': {'rate_limit': '10/m'},
        'app.tasks.analysis_tasks.full_analysis': {'rate_limit': '5/m'},
    },
    
    result_expires=3600,
    
    redis_max_connections=10,
)


@worker_ready.connect
def on_worker_ready(**kwargs):
    logger.info("Celery worker is ready and connected to broker")


@worker_shutdown.connect
def on_worker_shutdown(**kwargs):
    logger.info("Celery worker is shutting down")
