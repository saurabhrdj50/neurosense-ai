import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.repositories import BaseRepository

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
    def _init_schema(self) -> None:
        with self.db.get_connection() as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS patients (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    patient_id TEXT UNIQUE NOT NULL,
                    name TEXT NOT NULL,
                    age INTEGER,
                    sex TEXT,
                    education_years INTEGER,
                    stage TEXT,
                    notes TEXT DEFAULT '',
                    created_by INTEGER,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY (created_by) REFERENCES users(id)
                )
            ''')
            
            count = conn.execute('SELECT COUNT(*) FROM patients').fetchone()[0]
            if count == 0:
                self._seed_data(conn)

    def _seed_data(self, conn) -> None:
        now = datetime.now().isoformat()
        from app.repositories.user_repository import UserRepository
        user_repo = UserRepository()
        doctor = user_repo.get_by_username('doctor')
        doctor_id = doctor.id if doctor else None
        
        for i, p in enumerate(SAMPLE_PATIENTS):
            pid = f"PAT-{1001 + i}"
            conn.execute(
                'INSERT INTO patients (patient_id, name, age, sex, education_years, stage, notes, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
                (pid, p['name'], p['age'], p['sex'], p['education_years'], p['stage'], p['notes'], doctor_id, now)
            )
        logger.info("Seeded %d patients", len(SAMPLE_PATIENTS))

    def get_all(self, created_by: Optional[int] = None) -> List[Dict[str, Any]]:
        if created_by:
            rows = self.db.fetch_all(
                'SELECT * FROM patients WHERE created_by=? ORDER BY name',
                (created_by,)
            )
        else:
            rows = self.db.fetch_all('SELECT * FROM patients ORDER BY name')
        return rows

    def get_by_patient_id(self, patient_id: str) -> Optional[Dict[str, Any]]:
        return self.db.fetch_one('SELECT * FROM patients WHERE patient_id=?', (patient_id,))

    def create(
        self,
        patient_id: str,
        name: str,
        age: Optional[int] = None,
        sex: Optional[str] = None,
        education_years: Optional[int] = None,
        notes: str = '',
        created_by: Optional[int] = None
    ) -> Dict[str, Any]:
        try:
            now = datetime.now().isoformat()
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    'INSERT INTO patients (patient_id, name, age, sex, education_years, notes, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
                    (patient_id, name, age, sex, education_years, notes, created_by, now)
                )
            return {'success': True, 'id': cursor.lastrowid}
        except Exception as e:
            logger.error("Failed to create patient: %s", e)
            return {'success': False, 'message': 'Patient ID already exists'}

    def update(self, patient_id: str, **kwargs) -> Dict[str, Any]:
        allowed_fields = {'name', 'age', 'sex', 'education_years', 'stage', 'notes'}
        update_fields = {k: v for k, v in kwargs.items() if k in allowed_fields}
        
        if not update_fields:
            return {'success': False, 'message': 'No valid fields to update'}
        
        set_clause = ', '.join(f'{k}=?' for k in update_fields.keys())
        values = list(update_fields.values()) + [patient_id]
        
        with self.db.get_connection() as conn:
            cursor = conn.execute(f'UPDATE patients SET {set_clause} WHERE patient_id=?', values)
        
        if cursor.rowcount == 0:
            return {'success': False, 'message': 'Patient not found'}
        return {'success': True}

    def delete(self, patient_id: str) -> bool:
        with self.db.get_connection() as conn:
            cursor = conn.execute('DELETE FROM patients WHERE patient_id=?', (patient_id,))
        return cursor.rowcount > 0
