import logging
from typing import Optional, List, Dict, Any

from sqlalchemy.exc import IntegrityError
from app.shared.repository import BaseRepository
from app.shared.db_orm import SessionLocal, init_db
from app.shared.models.patient import Patient
from app.shared.time_utils import utc_now_iso

logger = logging.getLogger(__name__)

SAMPLE_PATIENTS = [
    {'name': 'Ramesh Kumar', 'age': 68, 'sex': 'male', 'education_years': 16, 'stage': 'Non-Demented', 'notes': 'Regular check-up'},
    {'name': 'Sunita Sharma', 'age': 72, 'sex': 'female', 'education_years': 12, 'stage': 'Non-Demented', 'notes': 'Family history of AD'},
    {'name': 'Mohan Patel', 'age': 75, 'sex': 'male', 'education_years': 10, 'stage': 'Very Mild Demented', 'notes': 'Occasional word-finding difficulty'},
    {'name': 'Lakshmi Iyer', 'age': 70, 'sex': 'female', 'education_years': 14, 'stage': 'Very Mild Demented', 'notes': 'Mild forgetfulness'},
    {'name': 'Anand Deshmukh', 'age': 78, 'sex': 'male', 'education_years': 8, 'stage': 'Very Mild Demented', 'notes': 'Repeats questions'},
    {'name': 'Kamla Devi', 'age': 80, 'sex': 'female', 'education_years': 5, 'stage': 'Mild Demented', 'notes': 'Difficulty managing finances'},
    {'name': 'Rajendra Singh', 'age': 76, 'sex': 'male', 'education_years': 12, 'stage': 'Mild Demented', 'notes': 'Needs help with daily tasks'},
    {'name': 'Savita Joshi', 'age': 82, 'sex': 'female', 'education_years': 10, 'stage': 'Mild Demented', 'notes': 'Gets lost in familiar places'},
    {'name': 'Gopal Verma', 'age': 85, 'sex': 'male', 'education_years': 6, 'stage': 'Moderate Demented', 'notes': 'Significant memory loss'},
    {'name': 'Pushpa Agarwal', 'age': 79, 'sex': 'female', 'education_years': 8, 'stage': 'Moderate Demented', 'notes': 'Cannot recognise family'},
]

class PatientRepository(BaseRepository):
    def __init__(self, db_path: Optional[str] = None):
        if db_path:
            from app.config.settings import Config
            Config.DB_PATH = db_path
        super().__init__(db_path=db_path)

    def _init_schema(self) -> None:
        init_db()
        self._ensure_seed_data()

    def _ensure_seed_data(self) -> None:
        if not self._should_seed_demo_patients():
            return
            
        with SessionLocal() as db:
            from app.shared.database import Database
            db_mgr = Database.get_instance()
            if db_mgr.get_meta('patients_seeded') == '1':
                return

            count = db.query(Patient).count()
            if count == 0:
                from app.shared.models.user import User
                doctor = db.query(User).filter(User.username == 'doctor').first()
                doctor_id = doctor.id if doctor else None

                now = utc_now_iso()
                for i, p in enumerate(SAMPLE_PATIENTS):
                    new_pat = Patient(
                        patient_id=f"PAT-{1001 + i}",
                        name=p['name'],
                        age=p['age'],
                        sex=p['sex'],
                        education_years=p['education_years'],
                        stage=p['stage'],
                        notes=p['notes'],
                        created_by=doctor_id,
                        created_at=now
                    )
                    db.add(new_pat)
                try:
                    db.commit()
                    db_mgr.set_meta('patients_seeded', '1')
                    logger.info("Seeded %d demo patients", len(SAMPLE_PATIENTS))
                except IntegrityError:
                    db.rollback()
            else:
                db_mgr.set_meta('patients_seeded', '1')

    @staticmethod
    def _should_seed_demo_patients() -> bool:
        import os
        explicit = os.environ.get('SEED_DEMO_DATA')
        if explicit is not None:
            return explicit.lower() in ('1', 'true', 'yes')
        return False

    def get_all(self, created_by: Optional[int] = None) -> List[Dict[str, Any]]:
        with SessionLocal() as db:
            query = db.query(Patient)
            if created_by is not None:
                query = query.filter(Patient.created_by == created_by)
            patients = query.order_by(Patient.name).all()
            return [p.to_dict() for p in patients]

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
