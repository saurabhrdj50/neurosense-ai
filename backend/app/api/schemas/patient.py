from typing import Dict, Any, Optional
import re


class PatientSchema:
    @staticmethod
    def validate_create(data: Dict[str, Any]) -> Dict[str, Any]:
        errors = {}
        
        patient_id = data.get('patient_id', '').strip()
        name = data.get('name', '').strip()
        age = data.get('age')
        sex = data.get('sex')
        education_years = data.get('education_years')
        notes = data.get('notes', '').strip()
        
        if not patient_id:
            errors['patient_id'] = 'Patient ID is required'
        elif not re.match(r'^[A-Za-z0-9\-]+$', patient_id):
            errors['patient_id'] = 'Patient ID can only contain letters, numbers, and hyphens'
        
        if not name:
            errors['name'] = 'Name is required'
        elif len(name) < 2:
            errors['name'] = 'Name must be at least 2 characters'
        
        if age is not None:
            try:
                age = int(age)
                if age < 0 or age > 150:
                    errors['age'] = 'Age must be between 0 and 150'
            except (ValueError, TypeError):
                errors['age'] = 'Age must be a number'
        
        if sex is not None and sex not in ('M', 'F', 'Other'):
            errors['sex'] = 'Sex must be M, F, or Other'
        
        if education_years is not None:
            try:
                education_years = int(education_years)
                if education_years < 0 or education_years > 30:
                    errors['education_years'] = 'Education years must be between 0 and 30'
            except (ValueError, TypeError):
                errors['education_years'] = 'Education years must be a number'
        
        if errors:
            raise ValueError(errors)
        
        return {
            'patient_id': patient_id,
            'name': name,
            'age': age,
            'sex': sex,
            'education_years': education_years,
            'notes': notes,
        }
    
    @staticmethod
    def validate_update(data: Dict[str, Any]) -> Dict[str, Any]:
        allowed = {'name', 'age', 'sex', 'education_years', 'stage', 'notes'}
        result = {k: v for k, v in data.items() if k in allowed}
        
        if 'age' in result:
            try:
                result['age'] = int(result['age'])
            except (ValueError, TypeError):
                raise ValueError({'age': 'Age must be a number'})
        
        if 'education_years' in result:
            try:
                result['education_years'] = int(result['education_years'])
            except (ValueError, TypeError):
                raise ValueError({'education_years': 'Education years must be a number'})
        
        return result
