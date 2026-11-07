import logging
import re
import secrets
from datetime import timedelta
from typing import Optional, List, Dict, Any

from sqlalchemy.exc import IntegrityError
from app.shared.repository import BaseRepository
from app.shared.security import hash_password, verify_password
from app.shared.db_orm import SessionLocal
from app.shared.models.user import User
from app.shared.time_utils import utc_now, utc_now_iso, parse_timestamp

logger = logging.getLogger(__name__)

# Account lockout settings
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

# A real scrypt hash kept at module level so the unknown-username login path
# burns the same ~100ms of KDF time as a real password check (timing parity).
_DUMMY_HASH = hash_password('timing-equalizer-not-a-real-password')


class UserRepository(BaseRepository):
    """User persistence. Schema and demo seeding live in app.shared.bootstrap."""

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

    def get_by_github_id(self, github_id: str) -> Optional[User]:
        with SessionLocal() as db:
            return db.query(User).filter(User.github_id == str(github_id)).first()

    def record_login(self, user_id: int) -> None:
        """Public wrapper for the successful-login bookkeeping (last login
        timestamp + lockout reset) used by the GitHub callback."""
        self._on_login_success(user_id)

    def link_github_account(self, user_id: int, github_id: str,
                            github_login: str, avatar_url: str = '') -> bool:
        """Attach a GitHub identity to an existing (password) account — e.g.
        a doctor who registered with email first. Refuses if the GitHub id
        is already linked to a different account."""
        with SessionLocal() as db:
            other = db.query(User).filter(
                User.github_id == str(github_id), User.id != user_id
            ).first()
            if other is not None:
                logger.warning(
                    "Refusing to link github_id=%s to user id=%s: already linked",
                    github_id, user_id,
                )
                return False
            user = db.query(User).filter(User.id == user_id).first()
            if user is None:
                return False
            user.github_id = str(github_id)
            user.github_login = github_login
            user.avatar_url = avatar_url or user.avatar_url
            user.auth_provider = 'github'
            db.commit()
            return True

    # ---------------------------------------------------------------------- #
    # GitHub OAuth users                                                       #
    # ---------------------------------------------------------------------- #

    @staticmethod
    def _username_from_github_login(github_login: str) -> str:
        """Derive a valid NeuroSense username from a GitHub login.

        GitHub logins allow hyphens and up to 39 chars; NeuroSense usernames
        allow [a-zA-Z0-9_.-] and 3–30 chars, and must not contain '@'.
        """
        safe = re.sub(r'[^a-zA-Z0-9_.\-]', '_', github_login or '')
        safe = safe.strip('._-') or 'github_user'
        if len(safe) < 3:
            safe = f'gh_{safe}'
        return safe[:30]

    def create_github_user(self, github_id: str, github_login: str, email: str,
                           full_name: str = '', avatar_url: str = '') -> Dict[str, Any]:
        """Create a doctor account from a verified GitHub identity.

        The account gets a random, unusable password hash — it can only ever
        log in via GitHub (password login always fails for it). Username is
        derived from the GitHub login and de-duplicated on collision.
        """
        # A random scrypt hash nobody knows: the account has no usable password.
        unusable_password = secrets.token_urlsafe(48)
        base_username = self._username_from_github_login(github_login)
        with SessionLocal() as db:
            try:
                username = base_username
                suffix = 2
                while db.query(User).filter(User.username == username).first():
                    candidate = f'{base_username[:27]}-{suffix}'
                    username = candidate
                    suffix += 1
                user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password(unusable_password),
                    role='doctor',
                    full_name=full_name,
                    github_id=str(github_id),
                    github_login=github_login,
                    avatar_url=avatar_url,
                    auth_provider='github',
                )
                db.add(user)
                db.flush()
                user.storage_key = f"{user.id}_{self._generate_storage_key_from_username(username)}"
                db.commit()
                db.refresh(user)
                logger.info(
                    "Created GitHub user '%s' (github_login='%s')",
                    username, github_login,
                )
                return {'success': True, 'user_id': user.id}
            except IntegrityError:
                db.rollback()
                logger.error(
                    "Failed to create GitHub user '%s': duplicate", github_login
                )
                return {'success': False, 'message': 'Username or email already exists'}

    # ---------------------------------------------------------------------- #
    # Authentication & lockout                                                 #
    # ---------------------------------------------------------------------- #

    def authenticate(self, username: str, password: str) -> Optional[User]:
        logger.debug("Authenticating user: %s", username)

        user = self.get_by_username(username)

        if user is None:
            # Burn the same KDF time as a real check so unknown usernames are
            # not distinguishable from wrong passwords by response timing.
            verify_password(password, _DUMMY_HASH)
            logger.warning("Login failed: user '%s' not found", username)
            return None

        # Check account lock (locked_until is stored as aware-UTC ISO string)
        if user.locked_until:
            locked_until_dt = parse_timestamp(user.locked_until)
            now = utc_now()
            if locked_until_dt and now < locked_until_dt:
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
            self._increment_failed_attempts(user.id)
            logger.warning("Login failed: invalid password for '%s'", username)
            return None

        self._on_login_success(user.id)
        logger.info("Login successful for user '%s'", username)
        return self.get_by_username(username)  # Refresh after updates block

    def _increment_failed_attempts(self, user_id: int) -> None:
        # Increment atomically at the SQL level: a read-modify-write from a
        # detached object lets concurrent failures all write the same count
        # and never reach the lockout threshold.
        with SessionLocal() as db:
            db.query(User).filter(User.id == user_id).update(
                {'failed_login_attempts': User.failed_login_attempts + 1}
            )
            db.commit()
            count = db.query(User.failed_login_attempts).filter(User.id == user_id).scalar()

        if count is not None and count >= MAX_FAILED_ATTEMPTS:
            locked_until = (utc_now() + timedelta(minutes=LOCKOUT_MINUTES)).isoformat()
            with SessionLocal() as db:
                db.query(User).filter(User.id == user_id).update({'locked_until': locked_until})
                db.commit()
            logger.warning("User id=%s locked until %s after %d failed attempts", user_id, locked_until, count)

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
                db_user.last_login = utc_now_iso()
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
        now = utc_now()
        matched = None
        with SessionLocal() as db:
            users = db.query(User).filter(
                User.reset_token.isnot(None)
            ).all()
            for user in users:
                if user.reset_token_expires:
                    exp = parse_timestamp(user.reset_token_expires)
                    if exp and exp < now:
                        # Purge expired tokens so the scan set stays small.
                        user.reset_token = None
                        user.reset_token_expires = None
                        continue
                if user.reset_token and verify_password(token, user.reset_token):
                    matched = user.id
                    break
            db.commit()
        if matched is None:
            return None
        # Return a detached copy via the standard lookup path.
        return self.get_by_id(matched)

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
        date_of_birth: str = '',
        hospital: str = ''
    ) -> Dict[str, Any]:
        with SessionLocal() as db:
            try:
                user = User(
                    username=username,
                    email=email,
                    password_hash=hash_password(password),
                    role=role,
                    full_name=full_name,
                    date_of_birth=date_of_birth,
                    hospital=hospital
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

    def delete(self, user_id: int, session=None, conn=None) -> int:
        # `conn` is a legacy no-op parameter kept for call-site compatibility;
        # pass `session` (from db_orm.session_scope) for transactional deletes.
        if session is not None:
            deleted = session.query(User).filter(User.id == user_id).delete()
            return deleted
        with SessionLocal() as db:
            deleted = db.query(User).filter(User.id == user_id).delete()
            if deleted:
                db.commit()
                return deleted
        return 0
