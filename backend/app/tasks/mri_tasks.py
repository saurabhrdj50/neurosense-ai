"""
MRI classification tasks for async processing.
"""
import tempfile
import os
import logging
from celery import Task
from app.celery_app import celery_app

logger = logging.getLogger(__name__)


class MRITask(Task):
    """Base task for MRI operations."""
    
    def on_failure(self, exc, task_id, args, kwargs, einfo):
        logger.error(f"Task {task_id} failed: {exc}")
        super().on_failure(exc, task_id, args, kwargs, einfo)
    
    def on_retry(self, exc, task_id, args, kwargs, einfo):
        logger.warning(f"Task {task_id} retrying: {exc}")
        super().on_retry(exc, task_id, args, kwargs, einfo)


@celery_app.task(
    bind=True,
    base=MRITask,
    name='app.tasks.mri_tasks.classify_mri',
    max_retries=3,
    default_retry_delay=60
)
def classify_mri(self, image_data: bytes, patient_id: str, use_gradcam: bool = True):
    """
    Async MRI classification task.
    
    Args:
        image_data: Base64 encoded image data or file path
        patient_id: Patient identifier
        use_gradcam: Whether to generate Grad-CAM visualization
    
    Returns:
        dict: Classification result with stage, confidence, probabilities
    """
    from app.modules.mri.inference import MRIClassifier
    
    try:
        logger.info(f"Starting MRI classification for patient: {patient_id}")
        
        temp_path = None
        if isinstance(image_data, str):
            temp_path = image_data
        else:
            with tempfile.NamedTemporaryFile(delete=False, suffix='.png') as f:
                f.write(image_data)
                temp_path = f.name
        
        try:
            classifier = MRIClassifier()
            
            if use_gradcam:
                result = classifier.predict_with_gradcam(temp_path)
            else:
                result = classifier.predict(temp_path)
            
            result['patient_id'] = patient_id
            result['task_id'] = self.request.id
            
            logger.info(
                f"MRI classification completed: {result.get('stage')} "
                f"({result.get('confidence')}%)"
            )
            
            return result
        finally:
            if temp_path and os.path.exists(temp_path) and isinstance(image_data, bytes):
                os.remove(temp_path)
    
    except Exception as exc:
        logger.exception(f"MRI classification failed: {exc}")
        
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        
        return {
            'error': str(exc),
            'stage': None,
            'confidence': 0,
            'task_id': self.request.id,
            'patient_id': patient_id
        }


@celery_app.task(
    bind=True,
    base=MRITask,
    name='app.tasks.mri_tasks.batch_classify',
    max_retries=2
)
def batch_classify(self, image_paths: list, patient_ids: list):
    """
    Batch MRI classification task.
    
    Args:
        image_paths: List of image file paths
        patient_ids: List of corresponding patient IDs
    
    Returns:
        list: List of classification results
    """
    from app.modules.mri.inference import MRIClassifier
    
    results = []
    classifier = MRIClassifier()
    
    for img_path, patient_id in zip(image_paths, patient_ids):
        try:
            result = classifier.predict(img_path)
            result['patient_id'] = patient_id
            results.append(result)
        except Exception as exc:
            logger.error(f"Batch classification failed for {patient_id}: {exc}")
            results.append({
                'error': str(exc),
                'patient_id': patient_id,
                'success': False
            })
    
    return results
