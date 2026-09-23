import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from sqlalchemy.exc import IntegrityError
from app.repositories import BaseRepository
from app.core.db_orm import SessionLocal, init_db
from app.models.patient import Patient

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
            from app.core.config import Config
            Config.DB_PATH = db_path
        super().__init__(db_path=db_path)

    def _init_schema(self) -> None:
        init_db()
        self._ensure_seed_data()

    def _ensure_seed_data(self) -> None:
        if not self._should_seed_demo_patients():
            return
            
        with SessionLocal() as db:
            from app.core.database import Database
            db_mgr = Database.get_instance()
            if db_mgr.get_meta('patients_seeded') == '1':
                return

            count = db.query(Patient).count()
            if count == 0:
                from app.models.user import User
                doctor = db.query(User).filter(User.username == 'doctor').first()
                doctor_id = doctor.id if doctor else None

                now = datetime.now().isoformat()
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
        if photo and photo.startswith('data:image'):
            try:
                from app.services.storage_manager import StorageManager
                photo = StorageManager.save_base64_avatar(created_by, patient_id, photo, patient_name=name)
            except Exception as e:
                logger.error("Failed to save avatar photo: %s", e)
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
                    created_at=datetime.now().isoformat()
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
                return {'success': False, 'message': str(e)}

    def update(self, patient_id: str, **kwargs) -> Dict[str, Any]:
        allowed_fields = {'name', 'age', 'sex', 'education_years', 'stage', 'notes', 'photo'}
        update_fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not update_fields:
            return {'success': False, 'message': 'No valid fields to update'}
            
        with SessionLocal() as db:
            pat = db.query(Patient).filter(Patient.patient_id == patient_id).first()
            if not pat:
                return {'success': False, 'message': 'Patient not found'}
                
            if 'photo' in update_fields and update_fields['photo'] and update_fields['photo'].startswith('data:image'):
                try:
                    from app.services.storage_manager import StorageManager
                    update_fields['photo'] = StorageManager.save_base64_avatar(
                        pat.created_by,
                        patient_id,
                        update_fields['photo'],
                        patient_name=update_fields.get('name', pat.name)
                    )
                except Exception as e:
                    logger.error("Failed to update avatar photo: %s", e)
                
            for k, v in update_fields.items():
                setattr(pat, k, v)
            # Always stamp the last modification time
            pat.updated_at = datetime.now().isoformat()

            db.commit()
            return {'success': True}

    def delete(self, patient_id: str, conn=None) -> bool:
        with SessionLocal() as db:
            pat = db.query(Patient).filter(Patient.patient_id == patient_id).first()
            if pat:
                db.delete(pat)
                db.commit()
                return True
        return False

    def delete_by_creator(self, creator_id: int, conn=None) -> int:
        with SessionLocal() as db:
            deleted = db.query(Patient).filter(Patient.created_by == creator_id).delete()
            db.commit()
            return deleted
