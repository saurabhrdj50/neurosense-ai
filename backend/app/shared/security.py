"""Security primitives: password hashing and PHI field encryption.

These helpers are framework-independent (no HTTP-layer imports) and depend
only on the Python standard library.

Password hashes are stored in Werkzeug's format (``method$salt$hash``) for
backward compatibility with existing accounts:

  * ``scrypt:32768:8:1$<salt>$<hex>``  (current default)
  * ``pbkdf2:sha256:<iterations>$<salt>$<hex>``  (legacy rows)

The derivation parameters are identical to the historical implementation, so
every existing hash verifies unchanged. New hashes use scrypt with per-hash
random salts.

The Fernet key derives from SECRET_KEY exactly as it did historically —
changing that KDF would make every encrypted PHI value unreadable.

HTTP auth (session cookie handling, role guards) lives in app.api.deps.
"""
import base64
import hashlib
import hmac
import secrets
import string

from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

_SALT_CHARS = string.ascii_letters + string.digits
SCRYPT_N = 2 ** 15
SCRYPT_R = 8
SCRYPT_P = 1
PBKDF2_ITERATIONS = 600000


def _gen_salt(length: int = 16) -> str:
    return ''.join(secrets.choice(_SALT_CHARS) for _ in range(length))


def hash_password(password: str) -> str:
    """Hash with scrypt in the historical storage format."""
    salt = _gen_salt(16)
    digest = hashlib.scrypt(
        password.encode(),
        salt=salt.encode(),
        n=SCRYPT_N,
        r=SCRYPT_R,
        p=SCRYPT_P,
        maxmem=132 * SCRYPT_N * SCRYPT_R * SCRYPT_P,
    ).hex()
    return f"scrypt:{SCRYPT_N}:{SCRYPT_R}:{SCRYPT_P}${salt}${digest}"


def verify_password(password: str, password_hash: str) -> bool:
    """Constant-time verification of scrypt and legacy pbkdf2 hash formats."""
    try:
        method, salt, expected = password_hash.split('$', 2)
    except (ValueError, AttributeError):
        return False

    name, *args = method.split(':')
    try:
        if name == 'scrypt':
            n, r, p = (int(a) for a in args) if len(args) == 3 else (SCRYPT_N, SCRYPT_R, SCRYPT_P)
            computed = hashlib.scrypt(
                password.encode(),
                salt=salt.encode(),
                n=n, r=r, p=p,
                maxmem=132 * n * r * p,
            ).hex()
        elif name == 'pbkdf2':
            hash_name = args[0] if args else 'sha256'
            iterations = int(args[1]) if len(args) > 1 else PBKDF2_ITERATIONS
            computed = hashlib.pbkdf2_hmac(
                hash_name, password.encode(), salt.encode(), iterations
            ).hex()
        else:
            return False
    except (ValueError, TypeError):
        return False

    return hmac.compare_digest(computed, expected)


# ─────────────────────────────────────────────
# HIPAA COMPLIANCE & PHI FIELD ENCRYPTION
# ─────────────────────────────────────────────
_FERNET_INSTANCE = None


def _get_fernet() -> Fernet:
    global _FERNET_INSTANCE
    if _FERNET_INSTANCE is None:
        from app.config.settings import Config
        secret = Config.SECRET_KEY
        salt = b'neurosense_phi_salt'
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100_000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(secret.encode()))
        _FERNET_INSTANCE = Fernet(key)
    return _FERNET_INSTANCE


def encrypt_phi(data: str) -> str:
    """Encrypt Protected Health Information (PHI) for HIPAA compliance."""
    if not data:
        return ""
    f = _get_fernet()
    return f.encrypt(data.encode('utf-8')).decode('utf-8')


def decrypt_phi(token: str) -> str:
    """Decrypt Protected Health Information (PHI) token."""
    if not token:
        return ""
    try:
        f = _get_fernet()
        return f.decrypt(token.encode('utf-8')).decode('utf-8')
    except Exception:
        return token


try:
    from sqlalchemy.types import TypeDecorator, Text

    class EncryptedString(TypeDecorator):
        """SQLAlchemy TypeDecorator for transparent encryption of PHI at rest.

        Data is encrypted with AES-128-CBC + HMAC-SHA256 (Fernet) before writing
        to the database, and automatically decrypted when loaded. Legacy unencrypted
        strings pass through seamlessly via decrypt_phi's exception fallback.
        """
        impl = Text
        cache_ok = True

        def process_bind_param(self, value, dialect):
            if value is not None and value != '':
                return encrypt_phi(str(value))
            return value

        def process_result_value(self, value, dialect):
            if value is not None and value != '':
                return decrypt_phi(str(value))
            return value
except ImportError:
    pass
