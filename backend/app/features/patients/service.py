"""Patient application service: storage + persistence orchestration.

Owns everything the repository layer must not: file storage (avatars) and
the create-or-update workflow. ``PatientRepository`` only persists opaque
values; URL mapping for stored photos lives in ``Patient.to_dict``.
"""
import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class PatientService:
    def __init__(self):
        from app.features.patients.repository import PatientRepository

        self._repo = PatientRepository()

    def store_avatar(
        self,
        doctor_id: Optional[int],
        patient_id: str,
        photo: Optional[str],
        patient_name: Optional[str] = None,
    ) -> Optional[str]:
        """Convert a ``data:image`` URL into a stored avatar, returning its path.

        Non-data-URL values (already-stored paths, None) pass through untouched.
        """
        if not photo or not photo.startswith('data:image'):
            return photo
        try:
            from app.shared.storage import StorageManager

            return StorageManager.save_base64_avatar(
                doctor_id, patient_id, photo, patient_name=patient_name
            )
        except Exception as e:
            logger.error("Failed to save avatar photo: %s", e)
            return photo

    def upsert_from_analysis(
        self,
        patient_info: Dict[str, Any],
        stage: Optional[str],
        doctor_id: Optional[int],
    ) -> Optional[str]:
        """Create or update the patient row for an analysis run.

        Raises PermissionError when the patient already exists and belongs to
        a different clinician — the analyze flow must never modify another
        doctor's patient record.

        Returns the patient_id when a row was written, else None.
        """
        pid = (patient_info.get('patient_id') or '').strip()
        name = (patient_info.get('name') or '').strip()
        if not pid or not name:
            return None

        photo = self.store_avatar(
            doctor_id, pid, patient_info.get('photo'), patient_name=name
        )
        existing = self._repo.get_by_patient_id(pid)
        if existing:
            existing_owner = existing.get('created_by')
            if existing_owner is not None and existing_owner != doctor_id:
                raise PermissionError(
                    f"Patient '{pid}' belongs to another clinician; refusing to overwrite."
                )
            self._repo.update(
                patient_id=pid,
                name=name or existing.get('name'),
                age=patient_info.get('age'),
                sex=patient_info.get('sex'),
                education_years=patient_info.get('education_years'),
                stage=stage,
                notes=patient_info.get('notes', ''),
                photo=photo,
            )
            logger.info("Updated patient %s", pid)
        else:
            result = self._repo.create(
                patient_id=pid,
                name=name,
                age=patient_info.get('age'),
                sex=patient_info.get('sex'),
                education_years=patient_info.get('education_years'),
                notes=patient_info.get('notes', ''),
                created_by=doctor_id,
                photo=photo,
                stage=stage,
            )
            if result.get('success'):
                logger.info("Created new patient %s", pid)
        return pid
