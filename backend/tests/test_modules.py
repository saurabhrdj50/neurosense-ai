"""
Tests for the ML modules.
"""
import pytest
from app.ml.cognitive.evaluator import CognitiveEvaluator
from app.ml.risk.profiler import RiskProfiler


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


class TestCognitiveScreening:
    """Tests for the 15-item multi-domain cognitive screening profile."""

    def setup_method(self):
        self.evaluator = CognitiveEvaluator()

    def test_empty_screening(self):
        result = self.evaluator.evaluate({'screening_breakdown': {}})
        assert result['composite_score'] == 0
        assert result['tests_completed'] == 0
        assert result['questions_completed'] == 0
        assert result['profile'] is None

    def test_partial_screening(self):
        result = self.evaluator.evaluate({
            'screening_breakdown': {'orient_date': 4, 'orient_place': 4}
        })
        assert result['tests_completed'] == 2
        assert result['profile']['orientation']['score'] == 8
        assert result['profile']['orientation']['max'] == 8
        assert result['profile']['orientation']['pct'] == 100
        assert result['composite_score'] == 100

    def test_full_screening_profile(self):
        breakdown = {
            'orient_date': 4, 'orient_place': 4, 'register_3words': 4,
            'delay_recall': 4, 'digit_span_fwd': 4, 'serial_7': 4,
            'animal_fluency': 4, 'object_naming': 4, 'sentence_compreh': 4,
            'multi_step_cmd': 4, 'logical_reason': 4, 'abstraction': 4,
            'months_reverse': 4, 'problem_solve': 4, 'auto_memory': 4,
        }
        result = self.evaluator.evaluate({'screening_breakdown': breakdown})
        assert result['tests_completed'] == 15
        assert result['questions_completed'] == 15
        assert result['total_questions'] == 15
        assert result['composite_score'] == 100
        assert result['risk_label'] == 'Low Risk'
        for domain in ('orientation', 'immediate_memory', 'delayed_memory',
                       'working_memory', 'attention', 'verbal_fluency',
                       'language', 'executive_function', 'reasoning',
                       'problem_solving', 'episodic_memory'):
            assert domain in result['profile']
            assert result['profile'][domain]['pct'] == 100
        assert result['memory_recall'] == 4

    def test_screening_impairment(self):
        result = self.evaluator.evaluate({
            'screening_breakdown': {
                'orient_date': 0, 'orient_place': 0, 'register_3words': 0,
                'delay_recall': 0, 'digit_span_fwd': 0, 'serial_7': 0,
                'animal_fluency': 0, 'object_naming': 0, 'sentence_compreh': 0,
                'multi_step_cmd': 0, 'logical_reason': 0, 'abstraction': 0,
                'months_reverse': 0, 'problem_solve': 0, 'auto_memory': 0,
            }
        })
        assert result['composite_score'] == 0
        assert result['risk_label'] == 'Very High Risk'
        # 15 answered questions with every answer wrong is the most impaired
        # outcome — 'Not Assessed' here contradicted risk_label='Very High Risk'.
        assert result['impairment_level'] == 'Severe'


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
