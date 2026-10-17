import re
import magic
from typing import Dict, Any, List, Optional, Tuple
from functools import wraps



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
                'audio': ['audio/wav', 'audio/x-wav', 'audio/mpeg', 'audio/ogg', 'audio/flac', 'audio/webm', 'video/webm'],
                'text': ['text/plain'],
            }
            
            allowed_mimes = set()
            for file_type in allowed_types:
                allowed_mimes.update(mime_mapping.get(file_type, []))
            
            if file_mime in allowed_mimes:
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
