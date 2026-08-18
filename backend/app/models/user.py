from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, event
from sqlalchemy.orm import relationship
from app.core.db_orm import Base


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    password_hash = Column(String, nullable=False)
    role = Column(String, nullable=False, default='doctor')
    full_name = Column(String, default='')
    date_of_birth = Column(String, default='')
    # Immutable canonical storage key used as the upload directory name
    storage_key = Column(String, nullable=True)
    created_at = Column(String, default=datetime.now().isoformat)
    updated_at = Column(String, nullable=True)
    last_login = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(String, nullable=True)

    # Relationships
    patients = relationship('Patient', back_populates='created_by_user',
                            cascade='all, delete-orphan', lazy='dynamic')
    sessions = relationship('Session', back_populates='created_by_user',
                            cascade='all, delete-orphan', lazy='dynamic')

    @property
    def is_authenticated(self) -> bool:
        return True

    @property
    def is_anonymous(self) -> bool:
        return False

    @property
    def is_admin(self) -> bool:
        return self.role == 'admin'

    def check_password(self, password: str) -> bool:
        from app.core.security import verify_password
        return verify_password(password, self.password_hash)

    def get_id(self):
        return str(self.id)

    def get_storage_key(self) -> str:
        """Returns the canonical, immutable storage directory name for this user."""
        if self.storage_key:
            return self.storage_key
        # Fallback for legacy records without storage_key
        safe_name = "".join(c if c.isalnum() or c in ('-', '_') else '_'
                            for c in (self.username or 'unknown')).strip('_').lower()
        return f"{self.id}_{safe_name}"

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'date_of_birth': self.date_of_birth,
            'storage_key': self.storage_key,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'last_login': self.last_login,
            'is_active': self.is_active,
            'failed_login_attempts': self.failed_login_attempts,
            'locked_until': self.locked_until,
        }
