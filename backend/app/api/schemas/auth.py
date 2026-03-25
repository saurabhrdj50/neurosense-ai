from typing import Dict, Any, Optional


class LoginSchema:
    @staticmethod
    def validate(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        
        username = data.get('username', '').strip()
        password = data.get('password', '').strip()
        
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
        errors = {}
        
        username = data.get('username', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '').strip()
        role = data.get('role', 'doctor').strip()
        full_name = data.get('full_name', '').strip()
        
        if not username:
            errors['username'] = 'Username is required'
        elif len(username) < 3:
            errors['username'] = 'Username must be at least 3 characters'
        
        if not email:
            errors['email'] = 'Email is required'
        elif '@' not in email:
            errors['email'] = 'Invalid email format'
        
        if not password:
            errors['password'] = 'Password is required'
        elif len(password) < 6:
            errors['password'] = 'Password must be at least 6 characters'
        
        if role not in ('admin', 'doctor'):
            errors['role'] = 'Role must be admin or doctor'
        
        if errors:
            raise ValueError(errors)
        
        return {
            'username': username,
            'email': email,
            'password': password,
            'role': role,
            'full_name': full_name,
        }
