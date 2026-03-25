"""
Tests for the API schemas and validation.
"""
import pytest
from app.api.schemas.auth import LoginSchema, RegisterSchema
from app.api.schemas.patient import PatientSchema


class TestLoginSchema:
    def test_validate_valid_login(self):
        data = {'username': 'doctor', 'password': 'doctor123'}
        result = LoginSchema.validate(data)
        assert result['username'] == 'doctor'
        assert result['password'] == 'doctor123'
    
    def test_validate_missing_username(self):
        data = {'password': 'doctor123'}
        with pytest.raises(ValueError) as exc_info:
            LoginSchema.validate(data)
        assert 'username' in str(exc_info.value)
    
    def test_validate_missing_password(self):
        data = {'username': 'doctor'}
        with pytest.raises(ValueError) as exc_info:
            LoginSchema.validate(data)
        assert 'password' in str(exc_info.value)
    
    def test_validate_empty_credentials(self):
        data = {}
        with pytest.raises(ValueError) as exc_info:
            LoginSchema.validate(data)
        assert 'username' in str(exc_info.value)


class TestRegisterSchema:
    def test_validate_valid_registration(self):
        data = {
            'username': 'newdoctor',
            'email': 'new@hospital.org',
            'password': 'secure123'
        }
        result = RegisterSchema.validate(data)
        assert result['username'] == 'newdoctor'
        assert result['email'] == 'new@hospital.org'
    
    def test_validate_short_username(self):
        data = {
            'username': 'ab',
            'email': 'test@test.com',
            'password': 'password123'
        }
        with pytest.raises(ValueError) as exc_info:
            RegisterSchema.validate(data)
        assert 'username' in str(exc_info.value)
    
    def test_validate_invalid_email(self):
        data = {
            'username': 'newdoctor',
            'email': 'notanemail',
            'password': 'password123'
        }
        with pytest.raises(ValueError) as exc_info:
            RegisterSchema.validate(data)
        assert 'email' in str(exc_info.value)
    
    def test_validate_short_password(self):
        data = {
            'username': 'newdoctor',
            'email': 'test@test.com',
            'password': '12345'
        }
        with pytest.raises(ValueError) as exc_info:
            RegisterSchema.validate(data)
        assert 'password' in str(exc_info.value)
    
    def test_validate_invalid_role(self):
        data = {
            'username': 'newdoctor',
            'email': 'test@test.com',
            'password': 'password123',
            'role': 'superadmin'
        }
        with pytest.raises(ValueError) as exc_info:
            RegisterSchema.validate(data)
        assert 'role' in str(exc_info.value)


class TestPatientSchema:
    def test_validate_valid_patient(self):
        data = {
            'patient_id': 'PAT-001',
            'name': 'John Doe',
            'age': 65,
            'sex': 'M'
        }
        result = PatientSchema.validate_create(data)
        assert result['patient_id'] == 'PAT-001'
        assert result['name'] == 'John Doe'
    
    def test_validate_invalid_patient_id(self):
        data = {
            'patient_id': 'PAT@001!',
            'name': 'John Doe'
        }
        with pytest.raises(ValueError) as exc_info:
            PatientSchema.validate_create(data)
        assert 'patient_id' in str(exc_info.value)
    
    def test_validate_invalid_age(self):
        data = {
            'patient_id': 'PAT-001',
            'name': 'John Doe',
            'age': 200
        }
        with pytest.raises(ValueError) as exc_info:
            PatientSchema.validate_create(data)
        assert 'age' in str(exc_info.value)
    
    def test_validate_invalid_sex(self):
        data = {
            'patient_id': 'PAT-001',
            'name': 'John Doe',
            'sex': 'X'
        }
        with pytest.raises(ValueError) as exc_info:
            PatientSchema.validate_create(data)
        assert 'sex' in str(exc_info.value)
