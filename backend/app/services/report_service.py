import logging
from typing import Dict, Any, Optional
from app.modules.reporting.report_generator import generate_clinical_report

logger = logging.getLogger(__name__)

class ReportOrchestrator:
    """Handles PDF and HTML report generation wrapper."""
    
    def generate_report(
        self,
        results: Dict[str, Any],
        patient_info: Optional[Dict[str, Any]] = None,
        format_type: str = 'pdf'
    ) -> Optional[bytes]:
        try:
            return generate_clinical_report(results, patient_info or {}, format=format_type)
        except Exception as e:
            logger.error(f"Error generating report: {e}")
            return None

