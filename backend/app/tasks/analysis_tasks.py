"""Celery background tasks for heavy ML inference and report generation."""
import logging
from typing import Any, Dict, Optional

from app.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(bind=True, name='analysis.run_full_analysis')
def run_analysis_task(
    self,
    inputs: Dict[str, Any],
    patient_info: Dict[str, Any],
    doctor_id: Optional[int],
    input_errors: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """Execute complete multimodal analysis asynchronously within a Celery worker."""
    from app.features.analysis.service import AnalysisOrchestrator

    logger.info("Starting Celery analysis task %s for doctor %s", self.request.id, doctor_id)

    def progress_callback(step: str, pct: int):
        self.update_state(
            state='PROGRESS',
            meta={
                'job_id': self.request.id,
                'step': step,
                'progress': pct,
                'message': f"Processing {step} ({pct}%)",
            },
        )

    orchestrator = AnalysisOrchestrator()
    results = orchestrator.run_full_analysis(inputs, doctor_id=doctor_id, progress=progress_callback)
    if input_errors:
        results.update(input_errors)

    try:
        final_result = orchestrator.persist_analysis(patient_info, results, doctor_id=doctor_id)
        logger.info("Completed Celery analysis task %s", self.request.id)
        return final_result
    except Exception as exc:
        logger.error("Failed to persist Celery analysis %s: %s", self.request.id, exc)
        raise
