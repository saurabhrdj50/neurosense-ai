import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, cast

from sqlalchemy.exc import IntegrityError
from app.repositories import BaseRepository
from app.core.security import hash_password, verify_password
from app.core.db_orm import SessionLocal, init_db
from app.models.user import User

logger = logging.getLogger(__name__)

# Account lockout settings
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

SAMPLE_USERS = [
    {'username': 'admin', 'email': 'admin@neurosense.ai', 'password': 'Admin@123!', 'role': 'admin', 'full_name': 'System Admin', 'date_of_birth': '1985-01-15'},
    {'username': 'doctor', 'email': 'doctor@neurosense.ai', 'password': 'Doctor@123', 'role': 'doctor', 'full_name': 'Dr. Gupta', 'date_of_birth': '1980-06-20'},
]


class UserRepository(BaseRepository):
    def _init_schema(self) -> None:
        """Initialize the SQLAlchemy schema."""
        init_db()
        self._ensure_seed_data()

    def _ensure_seed_data(self) -> None:
        if not self._should_seed_demo_users():
            return

        with SessionLocal() as db:
            count = db.query(User).count()
            if count == 0:
                for u in SAMPLE_USERS:
                    user = User(
                        username=u['username'],
                        email=u['email'],
                        password_hash=hash_password(u['password']),
                        role=u['role'],
                        full_name=u['full_name'],
                        date_of_birth=u.get('date_of_birth', '')
                    )
                    db.add(user)
                    try:
                        db.flush()  # Obtain the auto-generated ID
                        safe = self._generate_storage_key_from_username(u['username'])
                        user.storage_key = f"{user.id}_{safe}"
                    except Exception:
                        pass
                try:
                    db.commit()
                    logger.info("Seeded default users via SQLAlchemy")
                except IntegrityError:
                    db.rollback()
            else:
                # Backfill storage_key for existing users that don't have one
                self._backfill_storage_keys(db)

    @staticmethod
    def _should_seed_demo_users() -> bool:
        import os
        env = os.environ.get('FLASK_ENV', 'development').lower()
        explicit = os.environ.get('SEED_DEMO_DATA')
        if explicit is not None:
            return explicit.lower() in ('1', 'true', 'yes')
        return env != 'production'

    @staticmethod
    def _generate_storage_key_from_username(username: str, user_id: Optional[int] = None) -> str:
        """Generate an immutable, filesystem-safe storage key for a user."""
        safe = "".join(
            c if c.isalnum() or c in ('-', '_') else '_'
            for c in (username or 'unknown')
        ).strip('_').lower()
        if user_id is not None:
            return f"{user_id}_{safe}"
        return safe  # Will be updated with ID after commit

    @staticmethod
    def _backfill_storage_keys(db) -> None:
        """Backfill storage_key for legacy users who have none set."""
        users = db.query(User).filter(User.storage_key.is_(None)).all()
        for user in users:
            safe = "".join(
                c if c.isalnum() or c in ('-', '_') else '_'
                for c in (user.username or 'unknown')
            ).strip('_').lower()
            user.storage_key = f"{user.id}_{safe}"
        if users:
            try:
                db.commit()
                logger.info("Backfilled storage_key for %d users", len(users))
            except Exception:
                db.rollback()

    # ---------------------------------------------------------------------- #
    # Basic lookups                                                            #
    # ---------------------------------------------------------------------- #

    def get_by_id(self, user_id: int) -> Optional[User]:
        with SessionLocal() as db:
            return db.query(User).filter(User.id == user_id).first()

    def get_by_username(self, username: str) -> Optional[User]:
        with SessionLocal() as db:
            return db.query(User).filter(User.username == username).first()

    def get_by_email(self, email: str) -> Optional[User]:
        with SessionLocal() as db:
            return db.query(User).filter(User.email == email).first()

    def get_by_email_and_dob(self, email: str, date_of_birth: str) -> Optional[User]:
        with SessionLocal() as db:
            return db.query(User).filter(
                User.email == email,
                User.date_of_birth == date_of_birth
            ).first()

    # ---------------------------------------------------------------------- #
    # Authentication & lockout                                                 #
    # ---------------------------------------------------------------------- #

    def authenticate(self, username: str, password: str) -> Optional[User]:
        logger.debug("Authenticating user: %s", username)
        
        user = self.get_by_username(username)

        if user is None:
            # Perform a dummy comparison to prevent timing attacks
            verify_password(password, 'dummy_hash_to_prevent_timing_attack')
            logger.warning("Login failed: user '%s' not found", username)
            return None

        # Check account lock
        if user.locked_until:
            locked_until_dt = datetime.fromisoformat(user.locked_until) if isinstance(user.locked_until, str) else user.locked_until
            now = datetime.now()
            if now < locked_until_dt:
                remaining = locked_until_dt - now
                mins = int(remaining.total_seconds() / 60) + 1
                logger.warning("Account '%s' is locked until %s", username, user.locked_until)
                raise ValueError(
                    f"Account temporarily locked due to too many failed attempts. "
                    f"Try again in {mins} minute(s)."
                )
            else:
                self._reset_failed_attempts(user.id)
                user = self.get_by_username(username)  # refresh

        if not user.check_password(password):
            self._increment_failed_attempts(user)
            logger.warning("Login failed: invalid password for '%s'", username)
            return None

        self._on_login_success(user.id)
        logger.info("Login successful for user '%s'", username)
        return self.get_by_username(username)  # Refresh after updates block

    def _increment_failed_attempts(self, user: User) -> None:
        new_count = user.failed_login_attempts + 1
        locked_until = None
        if new_count >= MAX_FAILED_ATTEMPTS:
            locked_until = datetime.utcnow() + timedelta(minutes=LOCKOUT_MINUTES)
            logger.warning("User '%s' locked after %d failed attempts", user.username, new_count)
            
        with SessionLocal() as db:
            db_user = db.query(User).filter(User.id == user.id).first()
            if db_user:
                db_user.failed_login_attempts = new_count
                db_user.locked_until = locked_until
                db.commit()

    def _reset_failed_attempts(self, user_id: int) -> None:
        with SessionLocal() as db:
            db_user = db.query(User).filter(User.id == user_id).first()
            if db_user:
                db_user.failed_login_attempts = 0
                db_user.locked_until = None
                db.commit()

    def _on_login_success(self, user_id: int) -> None:
        with SessionLocal() as db:
            db_user = db.query(User).filter(User.id == user_id).first()
            if db_user:
                db_user.last_login = datetime.utcnow()
                db_user.failed_login_attempts = 0
                db_user.locked_until = None
                db.commit()

    # ---------------------------------------------------------------------- #
    # Password reset (2-step token flow)                                       #
    # ---------------------------------------------------------------------- #

    def store_reset_token(self, user_id: int, token: str, expires_iso: str) -> None:
        token_hash = hash_password(token)
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.reset_token = token_hash
                user.reset_token_expires = expires_iso
                db.commit()

    def get_by_reset_token(self, token: str) -> Optional[User]:
        now_iso = datetime.now().isoformat()
        with SessionLocal() as db:
            users = db.query(User).filter(
                User.reset_token.isnot(None)
            ).all()
            for user in users:
                if user.reset_token_expires:
                    exp = user.reset_token_expires if isinstance(user.reset_token_expires, str) else user.reset_token_expires.isoformat()
                    if exp < now_iso:
                        continue
                if user.reset_token and verify_password(token, user.reset_token):
                    return user
        return None

    def clear_reset_token(self, user_id: int) -> None:
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.reset_token = None
                user.reset_token_expires = None
                db.commit()

    # ---------------------------------------------------------------------- #
    # Password change                                                          #
    # ---------------------------------------------------------------------- #

    def reset_password(self, user_id: int, new_password: str) -> bool:
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                user.password_hash = hash_password(new_password)
                db.commit()
                return True
        return False

    # ---------------------------------------------------------------------- #
    # CRUD                                                                     #
    # ---------------------------------------------------------------------- #

    def create(
        self,
        username: str,
        email: str,
        password: str,
        role: str = 'doctor',
        full_name: str = '',
        date_of_birth: str = ''
    ) -> Dict[str, Any]:
        with SessionLocal() as db:
            try:
                user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                    full_name=full_name,
                    date_of_birth=date_of_birth
                )
                db.add(user)
                db.flush()  # Populate user.id before commit
                # Set the canonical storage_key using the real ID
                user.storage_key = f"{user.id}_{self._generate_storage_key_from_username(username)}"
                db.commit()
                db.refresh(user)
                logger.info("Created user '%s' with role '%s' storage_key='%s'",
                            username, role, user.storage_key)
                return {'success': True, 'user_id': user.id}
            except IntegrityError:
                db.rollback()
                logger.error("Failed to create user '%s': duplicate", username)
                return {'success': False, 'message': 'Username or email already exists'}

    def get_all(self) -> List[User]:
        with SessionLocal() as db:
            return db.query(User).order_by(User.username).all()

    def delete(self, user_id: int, conn=None) -> int:
        with SessionLocal() as db:
            user = db.query(User).filter(User.id == user_id).first()
            if user:
                db.delete(user)
                db.commit()
                return 1
        return 0
