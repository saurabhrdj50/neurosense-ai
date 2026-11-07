from sqlalchemy import Column, Index, Integer, String, Boolean, text
from sqlalchemy.orm import relationship
from app.shared.db_orm import Base
from app.shared.time_utils import utc_now_iso


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, autoincrement=True)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    # Nullable: GitHub-only accounts never set a password — they get a
    # random unusable hash at creation instead of a real one. Password
    # login for such an account always fails (see check_password).
    password_hash = Column(String, nullable=True)
    role = Column(String, nullable=False, default='doctor')
    # GitHub OAuth identity (all nullable — password accounts have none).
    github_id = Column(String, unique=True, nullable=True)
    github_login = Column(String, nullable=True)
    avatar_url = Column(String, nullable=True)
    # 'password' | 'github' — which flow created the account. Existing rows
    # backfill to 'password' (server_default + Alembic migration).
    auth_provider = Column(String, nullable=False, default='password',
                           server_default='password')
    full_name = Column(String, default='')
    date_of_birth = Column(String, default='')
    hospital = Column(String, default='')
    # Immutable canonical storage key used as the upload directory name
    storage_key = Column(String, nullable=True)
    created_at = Column(String, default=utc_now_iso)
    updated_at = Column(String, nullable=True)
    last_login = Column(String, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)
    failed_login_attempts = Column(Integer, default=0)
    locked_until = Column(String, nullable=True)
    reset_token = Column(String, nullable=True)
    reset_token_expires = Column(String, nullable=True)

    __table_args__ = (
        Index('idx_users_reset_token', 'reset_token'),
        # Token lookups only ever scan rows holding a token — keep the useful
        # subset small and hot.
        Index('idx_users_reset_token_active', 'reset_token',
              postgresql_where=text('reset_token IS NOT NULL'),
              sqlite_where=text('reset_token IS NOT NULL')),
        Index('idx_users_storage_key', 'storage_key'),
        # GitHub lookups are by github_id; NULLs (password accounts) are
        # distinct in both PostgreSQL and SQLite, so the unique index only
        # ever constrains real GitHub identities.
        Index('idx_users_github_id', 'github_id', unique=True,
              postgresql_where=text('github_id IS NOT NULL'),
              sqlite_where=text('github_id IS NOT NULL')),
    )

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
        # GitHub-only accounts have no usable password (random hash) — and
        # legacy rows always have one. A missing hash can never verify.
        if not self.password_hash:
            return False
        from app.shared.security import verify_password
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
        # Deliberately excludes storage_key, failed_login_attempts and
        # locked_until — internal security/account-state fields that must not
        # reach API clients.
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'role': self.role,
            'full_name': self.full_name,
            'date_of_birth': self.date_of_birth,
            'hospital': self.hospital,
            'created_at': self.created_at,
            'updated_at': self.updated_at,
            'last_login': self.last_login,
            'is_active': self.is_active,
            'github_login': self.github_login,
            'avatar_url': self.avatar_url,
            'auth_provider': self.auth_provider,
        }
