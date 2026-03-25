import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.repositories import BaseRepository
from app.core.security import hash_password, verify_password

logger = logging.getLogger(__name__)

ROLES = {
    'admin': {'label': 'Admin', 'level': 5, 'color': '#f472b6'},
    'doctor': {'label': 'Doctor', 'level': 2, 'color': '#6c8cff'},
}

SAMPLE_USERS = [
    {'username': 'admin', 'email': 'admin@neurosense.ai', 'password': 'admin123', 'role': 'admin', 'full_name': 'System Admin'},
    {'username': 'doctor', 'email': 'doctor@neurosense.ai', 'password': 'doctor123', 'role': 'doctor', 'full_name': 'Dr. Gupta'},
]


class User:
    def __init__(
        self,
        id: int,
        username: str,
        email: str,
        password_hash: str,
        role: str,
        full_name: str,
        created_at: Optional[str] = None
    ):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.full_name = full_name
        self.created_at = created_at

    def check_password(self, password: str) -> bool:
        return verify_password(password, self.password_hash)

    @property
    def role_info(self) -> Dict[str, Any]:
        return ROLES.get(self.role, ROLES.get('doctor'))

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


class UserRepository(BaseRepository):
    def _init_schema(self) -> None:
        with self.db.get_connection() as conn:
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
            
            count = conn.execute('SELECT COUNT(*) FROM users').fetchone()[0]
            if count == 0:
                self._seed_data(conn)

    def _seed_data(self, conn) -> None:
        now = datetime.now().isoformat()
        for u in SAMPLE_USERS:
            conn.execute(
                'INSERT INTO users (username, email, password_hash, role, full_name, created_at) VALUES (?,?,?,?,?,?)',
                (u['username'], u['email'], hash_password(u['password']), u['role'], u['full_name'], now)
            )
        logger.info("Seeded %d users", len(SAMPLE_USERS))

    def get_by_id(self, user_id: int) -> Optional[User]:
        row = self.db.fetch_one('SELECT * FROM users WHERE id=?', (user_id,))
        if row:
            return User(**dict(row))
        return None

    def get_by_username(self, username: str) -> Optional[User]:
        row = self.db.fetch_one('SELECT * FROM users WHERE username=?', (username,))
        if row:
            return User(**dict(row))
        return None

    def get_by_email(self, email: str) -> Optional[User]:
        row = self.db.fetch_one('SELECT * FROM users WHERE email=?', (email,))
        if row:
            return User(**dict(row))
        return None

    def authenticate(self, username: str, password: str) -> Optional[User]:
        user = self.get_by_username(username)
        if user and user.check_password(password):
            return user
        return None

    def create(
        self,
        username: str,
        email: str,
        password: str,
        role: str = 'doctor',
        full_name: str = ''
    ) -> Dict[str, Any]:
        try:
            now = datetime.now().isoformat()
            with self.db.get_connection() as conn:
                cursor = conn.execute(
                    'INSERT INTO users (username, email, password_hash, role, full_name, created_at) VALUES (?,?,?,?,?,?)',
                    (username, email, hash_password(password), role, full_name, now)
                )
            return {'success': True, 'user_id': cursor.lastrowid}
        except Exception as e:
            logger.error("Failed to create user: %s", e)
            return {'success': False, 'message': 'Username or email already exists'}

    def get_all(self) -> List[User]:
        rows = self.db.fetch_all('SELECT * FROM users ORDER BY username')
        return [User(**dict(row)) for row in rows]
