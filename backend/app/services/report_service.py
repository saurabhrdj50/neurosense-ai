import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)


class ReportOrchestrator:
    """Handles PDF report generation."""
    
    def generate_report(
        self,
        results: Dict[str, Any],
        patient_info: Optional[Dict[str, Any]] = None
    ) -> Optional[bytes]:
        from app.services.report_generator import ReportGenerator
        generator = ReportGenerator()
        return generator.generate(results, patient_info)
