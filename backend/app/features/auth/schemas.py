import re
from datetime import date, datetime
from typing import Dict, Any

# --------------------------------------------------------------------------- #
# Compiled regex patterns                                                      #
# --------------------------------------------------------------------------- #
_EMAIL_RE = re.compile(
    r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$'
)
_USERNAME_RE = re.compile(r'^[a-zA-Z0-9_.\-]{3,30}$')


def _validate_email(email: str) -> str:
    """Return normalised email or raise ValueError."""
    email = email.strip().lower()
    if not email:
        raise ValueError('Email is required')
    if not _EMAIL_RE.match(email):
        raise ValueError('Invalid email address')
    return email


def _validate_password_strength(password: str, field: str = 'password') -> str:
    """
    Requires:
      - 8+ characters
      - at least one uppercase letter
      - at least one digit
      - at least one special character
    Returns the password unchanged.
    """
    issues = []
    if len(password) < 8:
        issues.append('at least 8 characters')
    if not re.search(r'[A-Z]', password):
        issues.append('one uppercase letter')
    if not re.search(r'[0-9]', password):
        issues.append('one digit')
    if not re.search(r'[^a-zA-Z0-9]', password):
        issues.append('one special character (e.g. !@#$%)')
    if issues:
        raise ValueError(f'Password must contain {", ".join(issues)}')
    return password


def _validate_dob(dob_str: str) -> str:
    """Validate date_of_birth: must be YYYY-MM-DD format and in the past."""
    dob_str = dob_str.strip()
    if not dob_str:
        raise ValueError('Date of birth is required')
    try:
        parsed = datetime.strptime(dob_str, '%Y-%m-%d').date()
    except ValueError:
        raise ValueError('Date of birth must be in YYYY-MM-DD format (e.g. 1985-06-15)')
    if parsed >= date.today():
        raise ValueError('Date of birth must be in the past')
    return dob_str


def _validate_hospital(hospital: str) -> str:
    """Validate hospital/institution name: optional, free text, length-capped."""
    hospital = ' '.join(hospital.split())
    if len(hospital) > 120:
        raise ValueError('Hospital name must be 120 characters or fewer')
    return hospital


# --------------------------------------------------------------------------- #
# Schemas                                                                      #
# --------------------------------------------------------------------------- #

class LoginSchema:
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors: Dict[str, str] = {}

        # `or ''` guards against JSON null / missing form fields — a bare
        # .get(..., '').strip() raises AttributeError on None.
        username = (data.get('username') or '').strip()
        # Do NOT strip the password — spaces are valid characters
        password = data.get('password') or ''

        if not username:
            errors['username'] = 'Username is required'
        if not password:
            errors['password'] = 'Password is required'

        if errors:
            raise ValueError(errors)

        return {'username': username, 'password': password}


class RegisterSchema:
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors: Dict[str, str] = {}

        # `or ''` guards against JSON null / missing form fields.
        username = (data.get('username') or '').strip()
        email = (data.get('email') or '').strip()
        # Do NOT strip the password
        password = data.get('password') or ''
        full_name = (data.get('full_name') or '').strip()
        date_of_birth = (data.get('date_of_birth') or '').strip()
        hospital = (data.get('hospital') or '').strip()
        # NOTE: role is deliberately not accepted here — the route hardcodes
        # role='doctor' so self-service registration can never grant admin.

        # Email (validated first — the username falls back to it)
        try:
            email = _validate_email(email)
        except ValueError as e:
            errors['email'] = str(e)

        # Username: optional. When omitted (simplified registration), derive
        # it from the email local part and sanitize it to the username rules.
        # '@' is never valid in a username, so a raw email must not be sent.
        if not username and 'email' not in errors:
            username = email.split('@')[0].strip().lower()
            username = re.sub(r'[^a-zA-Z0-9_.\-]', '_', username)[:30]
            if len(username) < 3:
                username = f"{username}_user"
        if not _USERNAME_RE.match(username):
            errors['username'] = (
                'Username must be 3–30 characters and may only contain '
                'letters, numbers, underscores, dots, or hyphens'
            )

        # Password
        if not password:
            errors['password'] = 'Password is required'
        else:
            try:
                _validate_password_strength(password)
            except ValueError as e:
                errors['password'] = str(e)

        # Date of birth
        try:
            date_of_birth = _validate_dob(date_of_birth)
        except ValueError as e:
            errors['date_of_birth'] = str(e)

        # Hospital / institution (optional; stored for the clinician profile)
        try:
            hospital = _validate_hospital(hospital)
        except ValueError as e:
            errors['hospital'] = str(e)

        if errors:
            raise ValueError(errors)

        return {
            'username': username,
            'email': email,
            'password': password,
            'full_name': full_name,
            'date_of_birth': date_of_birth,
            'hospital': hospital,
        }


class ForgotPasswordSchema:
    """
    Validates Step 1 of the forgot-password flow
    (identity verification via email + date of birth).
    The new password is handled by ResetPasswordSchema via a token.
    """
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors: Dict[str, str] = {}

        email = (data.get('email') or '').strip()
        date_of_birth = (data.get('date_of_birth') or '').strip()

        try:
            email = _validate_email(email)
        except ValueError as e:
            errors['email'] = str(e)

        try:
            date_of_birth = _validate_dob(date_of_birth)
        except ValueError as e:
            errors['date_of_birth'] = str(e)

        if errors:
            raise ValueError(errors)

        return {'email': email, 'date_of_birth': date_of_birth}


class ResetPasswordSchema:
    """Validates Step 2: token + new password."""
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors: Dict[str, str] = {}

        token = (data.get('token') or '').strip()
        new_password = data.get('new_password') or ''

        if not token:
            errors['token'] = 'Reset token is required'

        if not new_password:
            errors['new_password'] = 'New password is required'
        else:
            try:
                _validate_password_strength(new_password, field='new_password')
            except ValueError as e:
                errors['new_password'] = str(e)

        if errors:
            raise ValueError(errors)

        return {'token': token, 'new_password': new_password}
