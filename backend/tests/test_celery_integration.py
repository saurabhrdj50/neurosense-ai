"""Unit tests for Celery integration and task queuing."""
from unittest.mock import MagicMock, patch
from app.celery_app import celery_app
from app.shared.jobs import JobManager


def test_celery_app_is_configured():
    assert celery_app is not None
    assert celery_app.main == 'neurosense'
    assert 'app.tasks.analysis_tasks' in celery_app.conf.include


def test_job_manager_check_celery_task_fallback():
    jm = JobManager()
    # Nonexistent task returns None or failure snapshot gracefully
    res = jm._check_celery_task('nonexistent-id')
    # If redis/celery is offline or task unknown, returns None or queued/failed dict
    assert res is None or isinstance(res, dict)


def test_job_manager_submit_celery():
    jm = JobManager()
    mock_task = MagicMock()
    mock_task.id = 'task-12345'
    with patch('app.tasks.analysis_tasks.run_analysis_task.delay', return_value=mock_task):
        job_id = jm.submit_celery({'test': 1}, {'name': 'Sample'}, 1)
        assert job_id == 'task-12345'
