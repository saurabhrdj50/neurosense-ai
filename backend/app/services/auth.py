"""
Authentication Module
Flask-Login based auth with role-based access control.
"""

from __future__ import annotations

import os
import logging
import sqlite3
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)
from werkzeug.security import generate_password_hash, check_password_hash

try:
    from flask_login import LoginManager, UserMixin
    HAS_FLASK_LOGIN = True
    FlaskUserMixin = UserMixin
except ImportError:
    HAS_FLASK_LOGIN = False
    FlaskUserMixin = object  # type: ignore[misc, assignment]

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'patient_data.db')

ROLES: Dict[str, Dict[str, Any]] = {
    'admin': {'label': 'Admin', 'level': 5, 'color': '#f472b6'},
    'doctor': {'label': 'Doctor', 'level': 2, 'color': '#6c8cff'},
}

SAMPLE_USERS: List[Dict[str, str]] = [
    {'username': 'admin', 'email': 'admin@neurosense.ai', 'password': 'admin123', 'role': 'admin', 'full_name': 'System Admin'},
    {'username': 'doctor', 'email': 'doctor@neurosense.ai', 'password': 'doctor123', 'role': 'doctor', 'full_name': 'Dr. Gupta'},
]

SAMPLE_PATIENTS: List[Dict[str, Any]] = [
    {'name': 'Ramesh Kumar', 'age': 68, 'sex': 'male', 'education_years': 16, 'stage': 'Non-Demented', 'notes': 'Regular check-up, no cognitive complaints'},
    {'name': 'Sunita Sharma', 'age': 72, 'sex': 'female', 'education_years': 12, 'stage': 'Non-Demented', 'notes': 'Family history of AD, preventive screening'},
    {'name': 'Mohan Patel', 'age': 75, 'sex': 'male', 'education_years': 10, 'stage': 'Very Mild Demented', 'notes': 'Occasional word-finding difficulty'},
    {'name': 'Lakshmi Iyer', 'age': 70, 'sex': 'female', 'education_years': 14, 'stage': 'Very Mild Demented', 'notes': 'Mild forgetfulness, misplacing items'},
    {'name': 'Anand Deshmukh', 'age': 78, 'sex': 'male', 'education_years': 8, 'stage': 'Very Mild Demented', 'notes': 'Repeats questions, slight confusion'},
    {'name': 'Kamla Devi', 'age': 80, 'sex': 'female', 'education_years': 5, 'stage': 'Mild Demented', 'notes': 'Difficulty managing finances, some disorientation'},
    {'name': 'Rajendra Singh', 'age': 76, 'sex': 'male', 'education_years': 12, 'stage': 'Mild Demented', 'notes': 'Needs help with daily tasks, mood changes'},
    {'name': 'Savita Joshi', 'age': 82, 'sex': 'female', 'education_years': 10, 'stage': 'Mild Demented', 'notes': 'Gets lost in familiar places'},
    {'name': 'Gopal Verma', 'age': 85, 'sex': 'male', 'education_years': 6, 'stage': 'Moderate Demented', 'notes': 'Significant memory loss, requires full-time care'},
    {'name': 'Pushpa Agarwal', 'age': 79, 'sex': 'female', 'education_years': 8, 'stage': 'Moderate Demented', 'notes': 'Cannot recognise family, wandering behaviour'},
]


class User(FlaskUserMixin):  # type: ignore[misc, valid-type]
    """User model for Flask-Login."""

    def __init__(
        self,
        id: int,
        username: str,
        email: str,
        password_hash: str,
        role: str,
        full_name: str,
        created_at: Optional[str] = None
    ) -> None:
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.full_name = full_name
        self.created_at = created_at

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    @property
    def role_info(self) -> Dict[str, Any]:
        return ROLES.get(self.role, ROLES.get('doctor', {'label': 'Doctor', 'level': 2, 'color': '#6c8cff'}))

    @property
    def is_doctor(self) -> bool:
        return self.role == 'doctor'

    @property
    def is_admin(self) -> bool:
        return self.role == 'admin'

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'role_info': self.role_info,
            'created_at': self.created_at,
        }


class AuthManager:
    """Manages user authentication and database."""

    def __init__(self, db_path: Optional[str] = None) -> None:
        self.db_path = db_path or DB_PATH
        self._init_db()

    def _init_db(self) -> None:
        with sqlite3.connect(self.db_path) as conn:
            conn.execute('''
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password_hash TEXT NOT NULL,
                    role TEXT NOT NULL DEFAULT 'doctor',
                    full_name TEXT DEFAULT '',
                    created_at TEXT NOT NULL
                )
            ''')
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
            conn.commit()

            count = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
            if count == 0:
                self._seed_data(conn)

    def _seed_data(self, conn: sqlite3.Connection) -> None:
        now = datetime.now().isoformat()
        for u in SAMPLE_USERS:
            conn.execute(
                'INSERT INTO users (username, email, password_hash, role, full_name, created_at) VALUES (?,?,?,?,?,?)',
                (u['username'], u['email'], generate_password_hash(u['password']), u['role'], u['full_name'], now)
            )
        doctor_id = conn.execute("SELECT id FROM users WHERE role='doctor' LIMIT 1").fetchone()[0]
        for i, p in enumerate(SAMPLE_PATIENTS):
            pid = f"PAT-{1001 + i}"
            conn.execute(
                'INSERT INTO patients (patient_id, name, age, sex, education_years, stage, notes, created_by, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
                (pid, p['name'], p['age'], p['sex'], p['education_years'], p['stage'], p['notes'], doctor_id, now)
            )
        conn.commit()
        logger.info("Seeded %d users and %d patients.", len(SAMPLE_USERS), len(SAMPLE_PATIENTS))

    def register(
        self,
        username: str,
        email: str,
        password: str,
        role: str = 'doctor',
        full_name: str = ''
    ) -> Dict[str, Any]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    'INSERT INTO users (username, email, password_hash, role, full_name, created_at) VALUES (?,?,?,?,?,?)',
                    (username, email, generate_password_hash(password), role, full_name, datetime.now().isoformat())
                )
                conn.commit()
                return {'success': True, 'message': 'Registration successful'}
        except sqlite3.IntegrityError:
            return {'success': False, 'message': 'Username or email already exists'}

    def authenticate(self, username: str, password: str) -> Optional[User]:
        user = self.get_user_by_username(username)
        if user and user.check_password(password):
            return user
        return None

    def get_user_by_id(self, user_id: int) -> Optional[User]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute('SELECT * FROM users WHERE id=?', (user_id,)).fetchone()
        if row:
            return User(**dict(row))
        return None

    def get_user_by_username(self, username: str) -> Optional[User]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute('SELECT * FROM users WHERE username=?', (username,)).fetchone()
        if row:
            return User(**dict(row))
        return None

    def get_patients(self, created_by: Optional[int] = None) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            rows = conn.execute('SELECT * FROM patients ORDER BY name').fetchall()
        return [dict(r) for r in rows]

    def get_patient(self, patient_id: str) -> Optional[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            row = conn.execute('SELECT * FROM patients WHERE patient_id=?', (patient_id,)).fetchone()
        return dict(row) if row else None

    def add_patient(
        self,
        patient_id: str,
        name: str,
        age: Optional[int],
        sex: Optional[str],
        education_years: Optional[int],
        notes: str = '',
        created_by: Optional[int] = None
    ) -> Dict[str, Any]:
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.execute(
                    'INSERT INTO patients (patient_id, name, age, sex, education_years, notes, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
                    (patient_id, name, age, sex, education_years, notes, created_by, datetime.now().isoformat())
                )
                conn.commit()
                return {'success': True}
        except sqlite3.IntegrityError:
            return {'success': False, 'message': 'Patient ID already exists'}
