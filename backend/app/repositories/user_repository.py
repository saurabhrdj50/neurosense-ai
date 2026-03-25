import logging
from datetime import datetime
from typing import Optional, List, Dict, Any

from app.repositories import BaseRepository
from app.core.security import hash_password, verify_password

logger = logging.getLogger(__name__)

ROLES = {
    'admin': {'label': 'Admin', 'level': 5, 'color': '#f472b6'},
    'doctor': {'label': 'Doctor', 'level': 2, 'color': '#6c8cff'},
    'researcher': {'label': 'Researcher', 'level': 2, 'color': '#34d399'},
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
        created_at: Optional[str] = None,
        **kwargs  # Absorb any extra columns gracefully
    ):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.role = role
        self.full_name = full_name
        self.created_at = created_at
        self.is_active = True

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    def get_id(self) -> str:
        return str(self.id)

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
                logger.info("Seeded %d default users", len(SAMPLE_USERS))

    def _seed_data(self, conn) -> None:
        now = datetime.now().isoformat()
        for u in SAMPLE_USERS:
            conn.execute(
                'INSERT INTO users (username, email, password_hash, role, full_name, created_at) VALUES (?,?,?,?,?,?)',
                (u['username'], u['email'], hash_password(u['password']), u['role'], u['full_name'], now)
            )

    def _row_to_user(self, row) -> Optional['User']:
        """Convert a database row (dict) to a User object."""
        if row is None:
            return None
        data = dict(row) if not isinstance(row, dict) else row
        return User(**data)

    def get_by_id(self, user_id: int) -> Optional[User]:
        row = self.db.fetch_one('SELECT * FROM users WHERE id=?', (user_id,))
        return self._row_to_user(row)

    def get_by_username(self, username: str) -> Optional[User]:
        row = self.db.fetch_one('SELECT * FROM users WHERE username=?', (username,))
        return self._row_to_user(row)

    def get_by_email(self, email: str) -> Optional[User]:
        row = self.db.fetch_one('SELECT * FROM users WHERE email=?', (email,))
        return self._row_to_user(row)

    def authenticate(self, username: str, password: str) -> Optional[User]:
        logger.debug("Authenticating user: %s", username)
        user = self.get_by_username(username)
        if user is None:
            logger.warning("Login failed: user '%s' not found", username)
            return None
        if not user.check_password(password):
            logger.warning("Login failed: invalid password for '%s'", username)
            return None
        logger.info("Login successful for user '%s'", username)
        return user

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
            logger.info("Created user '%s' with role '%s'", username, role)
            return {'success': True, 'user_id': cursor.lastrowid}
        except Exception as e:
            logger.error("Failed to create user '%s': %s", username, e)
            return {'success': False, 'message': 'Username or email already exists'}

    def get_all(self) -> List[User]:
        rows = self.db.fetch_all('SELECT * FROM users ORDER BY username')
        return [self._row_to_user(row) for row in rows if row]
