"""Tasks package initialization."""
from app.tasks.mri_tasks import classify_mri
from app.tasks.analysis_tasks import full_analysis, generate_report
from app.tasks.maintenance import cleanup_old_results, generate_daily_summary, health_check

__all__ = [
    'classify_mri',
    'full_analysis',
    'generate_report',
    'cleanup_old_results',
    'generate_daily_summary',
    'health_check'
]
