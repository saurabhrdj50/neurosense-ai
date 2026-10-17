import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.exc import IntegrityError
from app.shared.repository import BaseRepository
from app.shared.db_orm import SessionLocal
from app.shared.models.patient import Patient
from app.shared.time_utils import utc_now_iso

logger = logging.getLogger(__name__)


class PatientRepository(BaseRepository):
    """Patient persistence. Schema and demo seeding live in app.shared.bootstrap."""

    def get_all(self, created_by: Optional[int] = None, limit: Optional[int] = None,
                offset: int = 0) -> List[Dict[str, Any]]:
        with SessionLocal() as db:
            query = db.query(Patient)
            if created_by is not None:
                query = query.filter(Patient.created_by == created_by)
            query = query.order_by(Patient.name)
            if limit is not None:
                patients = query.offset(max(offset, 0)).limit(limit).all()
            else:
                patients = query.all()
            return [p.to_dict() for p in patients]

    def count_all(self, created_by: Optional[int] = None) -> int:
        with SessionLocal() as db:
            query = db.query(Patient)
            if created_by is not None:
                query = query.filter(Patient.created_by == created_by)
            return int(query.count())

    def get_by_patient_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        with SessionLocal() as db:
            pat = db.query(Patient).filter(Patient.patient_id == patient_id).first()
            return pat.to_dict() if pat else None

    def create(
        self,
        patient_id: str,
        name: str,
        age: Optional[int] = None,
        sex: Optional[str] = None,
        education_years: Optional[int] = None,
        notes: str = '',
        created_by: Optional[int] = None,
        photo: Optional[str] = None,
        stage: Optional[str] = None
    ) -> Dict[str, Any]:
        # NOTE: `photo` is stored opaquely. Avatar data-URL conversion lives in
        # app/services/patients.py (repositories must not depend on storage).
        with SessionLocal() as db:
            try:
                new_pat = Patient(
                    patient_id=patient_id,
                    name=name,
                    age=age,
                    sex=sex,
                    education_years=education_years,
                    stage=stage,
                    photo=photo,
                    notes=notes,
                    created_by=created_by,
                    created_at=utc_now_iso()
                )
                db.add(new_pat)
                db.commit()
                db.refresh(new_pat)
                return {'success': True, 'id': new_pat.id}
            except IntegrityError as e:
                db.rollback()
                logger.error("Failed to create patient: %s", e)
                return {'success': False, 'message': 'Patient ID already exists'}
            except Exception as e:
                db.rollback()
                logger.error("Failed to create patient: %s", e)
                return {'success': False, 'message': 'Could not create patient'}

    def update(self, patient_id: str, **kwargs) -> Dict[str, Any]:
        allowed_fields = {'name', 'age', 'sex', 'education_years', 'stage', 'notes', 'photo'}
        update_fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not update_fields:
            return {'success': False, 'message': 'No valid fields to update'}
            
        with SessionLocal() as db:
            pat = db.query(Patient).filter(Patient.patient_id == patient_id).first()
            if not pat:
                return {'success': False, 'message': 'Patient not found'}
                
            # NOTE: avatar data-URL conversion lives in app/services/patients.py.
            for k, v in update_fields.items():
                setattr(pat, k, v)
            # Always stamp the last modification time
            pat.updated_at = utc_now_iso()

            db.commit()
            return {'success': True}

    def delete(self, patient_id: str, session=None, conn=None) -> bool:
        # `conn` is a legacy no-op parameter kept for call-site compatibility;
        # pass `session` (from db_orm.session_scope) for transactional deletes.
        if session is not None:
            pat = session.query(Patient).filter(Patient.patient_id == patient_id).first()
            if pat:
                session.delete(pat)
                return True
            return False
        with SessionLocal() as db:
            pat = db.query(Patient).filter(Patient.patient_id == patient_id).first()
            if pat:
                db.delete(pat)
                db.commit()
                return True
        return False

    def delete_by_creator(self, creator_id: int, session=None, conn=None) -> int:
        if session is not None:
            return session.query(Patient).filter(Patient.created_by == creator_id).delete()
        with SessionLocal() as db:
            deleted = db.query(Patient).filter(Patient.created_by == creator_id).delete()
            db.commit()
            return deleted
