import logging
from typing import Dict, Any, Optional

from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository

logger = logging.getLogger(__name__)


class PatientService:
    """Orchestrates patient-related operations."""
    
    def __init__(self):
        self.patient_repo = PatientRepository()
        self.session_repo = SessionRepository()
    
    def get_all_patients(self, created_by: Optional[int] = None) -> list:
        return self.patient_repo.get_all(created_by)
    
    def get_patient(self, patient_id: str) -> Optional[Dict]:
        return self.patient_repo.get_by_patient_id(patient_id)
    
    def create_patient(
        self,
        patient_id: str,
        name: str,
        age: Optional[int] = None,
        sex: Optional[str] = None,
        education_years: Optional[int] = None,
        notes: str = '',
        created_by: Optional[int] = None,
    ) -> Dict:
        return self.patient_repo.create(
            patient_id=patient_id,
            name=name,
            age=age,
            sex=sex,
            education_years=education_years,
            notes=notes,
            created_by=created_by,
        )
    
    def update_patient(self, patient_id: str, **kwargs) -> Dict:
        return self.patient_repo.update(patient_id, **kwargs)
    
    def delete_patient(self, patient_id: str) -> bool:
        self.session_repo.delete_patient(patient_id)
        return self.patient_repo.delete(patient_id)
    
    def get_patient_history(self, patient_id: str, limit: int = 20) -> list:
        return self.session_repo.get_history(patient_id, limit)
    
    def get_patient_trends(self, patient_id: str) -> Dict:
        return self.session_repo.get_trends(patient_id)
