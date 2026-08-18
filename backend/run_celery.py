#!/usr/bin/env python
"""
Celery worker entry point.
Run with: celery -A app.celery_app worker --loglevel=info
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.celery_app import celery_app
from app.tasks import mri_tasks, analysis_tasks

if __name__ == '__main__':
    celery_app.start()
