"""
Tests for the validation module.
"""
import pytest
from app.core.validation import InputValidator, RequestValidator


class TestInputValidator:
    def test_sanitize_string_removes_control_chars(self):
        result = InputValidator.sanitize_string('hello\x00world')
        assert '\x00' not in result
        assert 'helloworld' == result
    
    def test_sanitize_string_trims_whitespace(self):
        result = InputValidator.sanitize_string('  hello  ')
        assert result == 'hello'
    
    def test_sanitize_string_enforces_max_length(self):
        long_string = 'a' * 2000
        result = InputValidator.sanitize_string(long_string, max_length=500)
        assert len(result) == 500
    
    def test_sanitize_html_removes_tags(self):
        result = InputValidator.sanitize_html('<script>alert(1)</script>hello')
        assert '<script>' not in result
        assert 'hello' in result
    
    def test_validate_patient_id_valid(self):
        valid, msg = InputValidator.validate_patient_id('PAT-001')
        assert valid == True
        assert msg == ''
    
    def test_validate_patient_id_invalid_special_chars(self):
        valid, msg = InputValidator.validate_patient_id('PAT@001!')
        assert valid == False
        assert 'alphanumeric' in msg.lower()
    
    def test_validate_patient_id_too_short(self):
        valid, msg = InputValidator.validate_patient_id('AB')
        assert valid == False
    
    def test_validate_name_valid(self):
        valid, msg = InputValidator.validate_name("O'Brien")
        assert valid == True
    
    def test_validate_name_invalid_chars(self):
        valid, msg = InputValidator.validate_name('John123')
        assert valid == False
    
    def test_validate_age_valid(self):
        valid, age, msg = InputValidator.validate_age(65)
        assert valid == True
        assert age == 65
    
    def test_validate_age_invalid(self):
        valid, age, msg = InputValidator.validate_age('notanumber')
        assert valid == False
    
    def test_validate_age_out_of_range(self):
        valid, age, msg = InputValidator.validate_age(200)
        assert valid == False
    
    def test_validate_cognitive_score_valid(self):
        valid, score, msg = InputValidator.validate_cognitive_score(3, max_score=5)
        assert valid == True
        assert score == 3
    
    def test_validate_cognitive_score_out_of_range(self):
        valid, score, msg = InputValidator.validate_cognitive_score(10, max_score=5)
        assert valid == False


class TestRequestValidator:
    def test_validate_json_structure_valid(self):
        data = {'name': 'test', 'value': 123}
        valid, msg = InputValidator.validate_json_structure(data, ['name', 'value'])
        assert valid == True
    
    def test_validate_json_structure_missing_fields(self):
        data = {'name': 'test'}
        valid, msg = InputValidator.validate_json_structure(data, ['name', 'value'])
        assert valid == False
        assert 'value' in msg
