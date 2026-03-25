"""Reporting module initialization."""
from app.modules.reporting.report_generator import (
    ClinicalReportGenerator, generate_clinical_report
)

__all__ = [
    'ClinicalReportGenerator',
    'generate_clinical_report',
]
