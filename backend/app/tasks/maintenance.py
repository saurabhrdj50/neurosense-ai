"""
Maintenance tasks for periodic Celery jobs.
"""
from datetime import datetime, timedelta
from celery import shared_task
import logging
import os

from app import db
from app.models import AnalysisResult

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def cleanup_old_results(self):
    """
    Clean up old analysis results based on retention policy.
    Default retention: 90 days for completed analyses.
    """
    try:
        retention_days = int(os.getenv('DATA_RETENTION_DAYS', '90'))
        cutoff_date = datetime.utcnow() - timedelta(days=retention_days)
        
        deleted_count = AnalysisResult.query.filter(
            AnalysisResult.created_at < cutoff_date,
            AnalysisResult.status == 'completed'
        ).delete()
        
        db.session.commit()
        
        logger.info(f"Cleanup completed: {deleted_count} old results removed")
        
        if deleted_count > 0:
            logger.audit(
                "Old analysis results purged",
                result_count=deleted_count,
                cutoff_date=cutoff_date.isoformat()
            )
        
        return {'deleted': deleted_count, 'cutoff': cutoff_date.isoformat()}
        
    except Exception as exc:
        logger.error(f"Cleanup task failed: {exc}")
        db.session.rollback()
        raise self.retry(exc=exc, countdown=300)


@shared_task(bind=True, max_retries=3)
def generate_daily_summary(self):
    """
    Generate daily summary statistics for admin dashboard.
    """
    try:
        today = datetime.utcnow().date()
        start_of_day = datetime.combine(today, datetime.min.time())
        end_of_day = datetime.combine(today, datetime.max.time())
        
        total_analyses = AnalysisResult.query.filter(
            AnalysisResult.created_at >= start_of_day,
            AnalysisResult.created_at <= end_of_day
        ).count()
        
        completed = AnalysisResult.query.filter(
            AnalysisResult.created_at >= start_of_day,
            AnalysisResult.created_at <= end_of_day,
            AnalysisResult.status == 'completed'
        ).count()
        
        failed = AnalysisResult.query.filter(
            AnalysisResult.created_at >= start_of_day,
            AnalysisResult.created_at <= end_of_day,
            AnalysisResult.status == 'failed'
        ).count()
        
        summary = {
            'date': today.isoformat(),
            'total_analyses': total_analyses,
            'completed': completed,
            'failed': failed,
            'success_rate': (completed / total_analyses * 100) if total_analyses > 0 else 0
        }
        
        logger.info(f"Daily summary generated: {summary}")
        
        return summary
        
    except Exception as exc:
        logger.error(f"Daily summary task failed: {exc}")
        raise self.retry(exc=exc, countdown=60)


@shared_task(bind=True)
def health_check(self):
    """
    Periodic health check for monitoring system status.
    """
    try:
        from app.core.metrics import health_metrics
        
        health_status = {
            'timestamp': datetime.utcnow().isoformat(),
            'database': self.app.backend,
            'workers': self.app.control.inspect().stats() is not None,
        }
        
        logger.debug(f"Health check: {health_status}")
        
        return health_status
        
    except Exception as exc:
        logger.error(f"Health check failed: {exc}")
        return {'status': 'error', 'error': str(exc)}
