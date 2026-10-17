"""Password-hash compatibility tests.

The stored format is the historical Werkzeug layout (``method$salt$hash``) so
existing account rows verify unchanged after the pure-stdlib rewrite. These
tests pin the derivation parameters: if they ever drift, previously valid
passwords stop working.
"""
import hashlib

from app.shared.security import hash_password, verify_password


def test_new_hash_roundtrip():
    h = hash_password('Doctor@123')
    assert h.startswith('scrypt:32768:8:1$')
    assert verify_password('Doctor@123', h)
    assert not verify_password('Doctor@124', h)
    assert not verify_password('', h)


def test_hash_is_salted_per_call():
    assert hash_password('same-password') != hash_password('same-password')


def test_legacy_pbkdf2_hash_format_verifies():
    """Format used by older deployments: pbkdf2:sha256:<iters>$salt$hex."""
    salt = '0123456789abcdef'
    digest = hashlib.pbkdf2_hmac(
        'sha256', 'old-password'.encode(), salt.encode(), 260000
    ).hex()
    stored = f'pbkdf2:sha256:260000${salt}${digest}'
    assert verify_password('old-password', stored)
    assert not verify_password('wrong-password', stored)


def test_legacy_pbkdf2_default_iterations():
    salt = 'abcdef0123456789'
    digest = hashlib.pbkdf2_hmac(
        'sha256', 'legacy'.encode(), salt.encode(), 600000
    ).hex()
    assert verify_password('legacy', f'pbkdf2:sha256${salt}${digest}')


def test_garbage_hash_is_rejected_not_raised():
    assert not verify_password('pw', 'not-a-hash')
    assert not verify_password('pw', '')
    assert not verify_password('pw', 'plain$only-two-parts')
    assert not verify_password('pw', 'unknown-method:1:2:3$s$abcdef')


def test_wrong_length_hash_is_rejected():
    h = hash_password('correct horse')
    truncated = h[:-2]
    assert not verify_password('correct horse', truncated)


def test_phi_encryption_and_decryption_roundtrip():
    from app.shared.security import encrypt_phi, decrypt_phi
    sensitive_notes = "Patient exhibits severe episodic memory loss and disorientation."
    token = encrypt_phi(sensitive_notes)
    assert token != sensitive_notes
    assert len(token) > len(sensitive_notes)
    decrypted = decrypt_phi(token)
    assert decrypted == sensitive_notes


def test_phi_decryption_fallback_on_unencrypted():
    from app.shared.security import decrypt_phi
    plain = "Regular checkup notes without encryption"
    assert decrypt_phi(plain) == plain
    assert decrypt_phi("") == ""
