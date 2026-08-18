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


# --------------------------------------------------------------------------- #
# Schemas                                                                      #
# --------------------------------------------------------------------------- #

class LoginSchema:
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors: Dict[str, str] = {}

        username = data.get('username', '').strip()
        # Do NOT strip the password — spaces are valid characters
        password = data.get('password', '')

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

        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        # Do NOT strip the password
        password = data.get('password', '')
        full_name = data.get('full_name', '').strip()
        date_of_birth = data.get('date_of_birth', '').strip()
        role = data.get('role', 'doctor').strip()

        # Username
        if not username:
            errors['username'] = 'Username is required'
        elif not _USERNAME_RE.match(username):
            errors['username'] = (
                'Username must be 3–30 characters and may only contain '
                'letters, numbers, underscores, dots, or hyphens'
            )

        # Email
        try:
            email = _validate_email(email)
        except ValueError as e:
            errors['email'] = str(e)

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

        # Role
        valid_roles = ('doctor', 'admin')
        if role not in valid_roles:
            errors['role'] = f'Role must be one of: {", ".join(valid_roles)}'

        if errors:
            raise ValueError(errors)

        return {
            'username': username,
            'email': email,
            'password': password,
            'role': role,
            'full_name': full_name,
            'date_of_birth': date_of_birth,
        }


class ForgotPasswordSchema:
    """
    Validates Step 1 of the forgot-password flow
    (identity verification via email + date_of_birth).
    The new password is handled by ResetPasswordSchema via a token.
    """
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors: Dict[str, str] = {}

        email = data.get('email', '').strip()
        date_of_birth = data.get('date_of_birth', '').strip()

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

        token = data.get('token', '').strip()
        new_password = data.get('new_password', '')

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
