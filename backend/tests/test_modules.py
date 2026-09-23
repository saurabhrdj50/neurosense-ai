"""
Tests for the ML modules.
"""
import pytest
from app.modules.cognitive.evaluator import CognitiveEvaluator
from app.modules.risk.profiler import RiskProfiler


class TestCognitiveEvaluator:
    def setup_method(self):
        self.evaluator = CognitiveEvaluator()
    
    def test_evaluate_empty_answers(self):
        result = self.evaluator.evaluate({})
        assert result['composite_score'] == 0
        assert result['tests_completed'] == 0
    
    def test_evaluate_single_test(self):
        result = self.evaluator.evaluate({'mini_cog': 5})
        assert result['tests_completed'] == 1
        assert result['test_results']['mini_cog']['raw_score'] == 5
    
    def test_evaluate_all_tests_normal(self):
        result = self.evaluator.evaluate({
            'mini_cog': 5,
            'serial_7s': 5,
            'category_fluency': 18,
            'digit_span': 12,
            'orientation': 10
        })
        assert result['tests_completed'] == 5
        assert result['risk_label'] == 'Low Risk'
    
    def test_evaluate_all_tests_impaired(self):
        result = self.evaluator.evaluate({
            'mini_cog': 0,
            'serial_7s': 0,
            'category_fluency': 3,
            'digit_span': 2,
            'orientation': 1
        })
        assert result['risk_label'] == 'Very High Risk'
    
    def test_score_normalization(self):
        result = self.evaluator.evaluate({'mini_cog': 2})
        assert 0 <= result['composite_score'] <= 100


class TestRiskProfiler:
    def setup_method(self):
        self.profiler = RiskProfiler()
    
    def test_assess_empty_factors(self):
        result = self.profiler.assess({})
        assert result['overall_risk_score'] == 0
        assert result['factors_assessed'] == 0
    
    def test_assess_single_factor(self):
        result = self.profiler.assess({'age': 45})
        assert result['factors_assessed'] == 1
    
    def test_assess_multiple_factors(self):
        result = self.profiler.assess({
            'age': 75,
            'family_history': True,
            'hypertension': True
        })
        assert result['factors_assessed'] == 3
        assert 'Demographics' in result['category_scores']
        assert 'Medical' in result['category_scores']
    
    def test_modifiable_vs_nonmodifiable(self):
        result = self.profiler.assess({
            'age': 70,
            'physical_activity': 'sedentary',
            'diabetes': True
        })
        assert result['modifiable_risk'] > result['non_modifiable_risk']
