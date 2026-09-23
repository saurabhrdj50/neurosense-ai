import re
import magic
from typing import Dict, Any, List, Optional, Tuple
from functools import wraps
from flask import request, jsonify, g

from app.core.exceptions import ValidationError


class InputValidator:
    """Centralized input validation with sanitization."""
    
    @staticmethod
    def sanitize_string(value: str, max_length: int = 1000) -> str:
        """Sanitize string input by removing potentially dangerous characters."""
        if not isinstance(value, str):
            return ''
        
        sanitized = value.strip()
        sanitized = re.sub(r'[\x00-\x08\x0b-\x0c\x0e-\x1f\x7f]', '', sanitized)
        
        if len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized
    
    @staticmethod
    def sanitize_html(value: str) -> str:
        """Remove HTML tags from input."""
        return re.sub(r'<[^>]+>', '', value)
    
    @staticmethod
    def validate_patient_id(patient_id: str) -> Tuple[bool, str]:
        """Validate patient ID format."""
        if not patient_id:
            return False, "Patient ID is required"
        
        if not re.match(r'^[A-Za-z0-9\-_]{3,50}$', patient_id):
            return False, "Patient ID must be 3-50 alphanumeric characters, hyphens, or underscores"
        
        return True, ""
    
    @staticmethod
    def validate_name(name: str) -> Tuple[bool, str]:
        """Validate person name."""
        if not name:
            return False, "Name is required"
        
        if len(name) < 2 or len(name) > 100:
            return False, "Name must be 2-100 characters"
        
        if not re.match(r'^[a-zA-Z\s\-\.\']+$', name):
            return False, "Name contains invalid characters"
        
        return True, ""
    
    @staticmethod
    def validate_age(age: Any) -> Tuple[bool, int, str]:
        """Validate and convert age."""
        try:
            age_int = int(age)
            if age_int < 0 or age_int > 150:
                return False, 0, "Age must be between 0 and 150"
            return True, age_int, ""
        except (ValueError, TypeError):
            return False, 0, "Age must be a valid number"
    
    @staticmethod
    def validate_cognitive_score(score: Any, max_score: int) -> Tuple[bool, int, str]:
        """Validate cognitive test score."""
        try:
            score_int = int(score)
            if score_int < 0 or score_int > max_score:
                return False, 0, f"Score must be between 0 and {max_score}"
            return True, score_int, ""
        except (ValueError, TypeError):
            return False, 0, "Score must be a valid number"
    
    @staticmethod
    def validate_file_type(file_content: bytes, allowed_types: List[str]) -> Tuple[bool, str]:
        """Validate file type using magic bytes."""
        if not file_content:
            return False, "Empty file"
        
        try:
            mime = magic.Magic(mime=True)
            file_mime = mime.from_buffer(file_content[:1024])
            
            mime_mapping = {
                'image': ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/tiff'],
                'audio': ['audio/wav', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/webm'],
                'text': ['text/plain'],
            }
            
            allowed_mimes = []
            for file_type in allowed_types:
                allowed_mimes.extend(mime_mapping.get(file_type, []))
            
            for allowed_mime in allowed_mimes:
                if file_mime.startswith(allowed_mime.split('/')[0]):
                    return True, ""
            
            return False, f"Invalid file type: {file_mime}. Allowed: {', '.join(allowed_types)}"
        except Exception:
            return False, "Unable to validate file type"
    
    @staticmethod
    def validate_json_structure(data: Dict, required_fields: List[str]) -> Tuple[bool, str]:
        """Validate JSON structure has required fields."""
        missing = [f for f in required_fields if f not in data]
        if missing:
            return False, f"Missing required fields: {', '.join(missing)}"
        return True, ""
    
    @staticmethod
    def validate_risk_factor(factor: Dict) -> Tuple[bool, str]:
        """Validate risk factor structure."""
        required = ['id', 'label']
        valid, msg = InputValidator.validate_json_structure(factor, required)
        if not valid:
            return valid, msg
        
        factor_type = factor.get('type', 'bool')
        if factor_type not in ('bool', 'number', 'string'):
            return False, f"Invalid factor type: {factor_type}"
        
        return True, ""


class RequestValidator:
    """Validates incoming HTTP requests."""
    
    @staticmethod
    def validate_json() -> Tuple[bool, Dict, str]:
        """Validate JSON content type and parse."""
        if not request.is_json:
            return False, {}, "Content-Type must be application/json"
        
        try:
            data = request.get_json()
            if data is None:
                return False, {}, "Invalid JSON body"
            return True, data, ""
        except Exception as e:
            return False, {}, f"Failed to parse JSON: {str(e)}"
    
    @staticmethod
    def validate_form_fields(required_fields: List[str]) -> Tuple[bool, Dict, str]:
        """Validate form contains required fields."""
        data = {}
        missing = []
        
        for field in required_fields:
            value = request.form.get(field)
            if value is not None:
                data[field] = value.strip()
            elif field in request.files:
                data[field] = request.files[field]
            else:
                missing.append(field)
        
        if missing:
            return False, {}, f"Missing required fields: {', '.join(missing)}"
        
        return True, data, ""


def validate_request(*required_fields: str, json_body: bool = False):
    """Decorator for request validation."""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if json_body:
                valid, data, error = RequestValidator.validate_json()
                if not valid:
                    return jsonify({'error': error}), 400
                g.validated_data = data
            else:
                valid, data, error = RequestValidator.validate_form_fields(list(required_fields))
                if not valid:
                    return jsonify({'error': error}), 400
                g.form_data = data
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator


def sanitize_input(func):
    """Decorator to sanitize all string inputs in request."""
    @wraps(func)
    def decorated_function(*args, **kwargs):
        if request.is_json:
            data = request.get_json(silent=True) or {}
            sanitized = {}
            for key, value in data.items():
                if isinstance(value, str):
                    sanitized[key] = InputValidator.sanitize_string(value)
                elif isinstance(value, dict):
                    sanitized[key] = {
                        k: InputValidator.sanitize_string(v) if isinstance(v, str) else v
                        for k, v in value.items()
                    }
                else:
                    sanitized[key] = value
            g.sanitized_data = sanitized
        return func(*args, **kwargs)
    return decorated_function


def rate_limit_key_func():
    """Generate rate limit key including user ID if authenticated."""
    from app.core.security import get_current_user_id
    
    user_id = get_current_user_id()
    if user_id:
        return f"user_{user_id}"
    
    return request.remote_addr
