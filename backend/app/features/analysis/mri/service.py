"""MRI step of the analysis workflow (mirrors analysis/mri/ in frontend)."""
import logging
from typing import Optional

from app.ml.contracts import AnalysisInput, AnalysisResult

logger = logging.getLogger(__name__)


def run_mri_step(orch, inputs: AnalysisInput, results: AnalysisResult,
                 pid: str, doctor_id: Optional[int]) -> None:
    """Persist the raw MRI upload (if any) and run MRI classification.

    Mutates ``results`` with ``mri`` or ``mri_error``.
    """
    from app.shared.storage import StorageManager

    mri_file = inputs.get('mri_file')
    if mri_file is None:
        return
    if pid:
        try:
            mri_file.stream.seek(0)
            StorageManager.persist_raw_file(
                doctor_id, pid, mri_file, 'mri', mri_file.filename
            )
            mri_file.stream.seek(0)
        except Exception as e:
            logger.error("Failed to persist raw MRI file: %s", e)
    try:
        results['mri'] = orch.analyze_mri(
            mri_file, gradcam=inputs.get('gradcam', True)
        )
    except Exception as e:
        results['mri_error'] = str(e)
