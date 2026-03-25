"""
Tests for the ML modules.
"""
import pytest
from app.modules.cognitive.evaluator import CognitiveEvaluator
from app.modules.risk.profiler import RiskProfiler
from app.modules.genomics.sequencer import GenomicSequencer


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


class TestGenomicSequencer:
    def setup_method(self):
        self.sequencer = GenomicSequencer()
    
    def test_analyze_empty_text(self):
        result = self.sequencer.analyze_dna_text('')
        assert result['success'] == False
    
    def test_analyze_no_matching_alleles(self):
        result = self.sequencer.analyze_dna_text('some random text without rs markers')
        assert result['success'] == False
    
    def test_analyze_apoe_homozygous(self):
        text = 'rs429358 19 45411941 C C'
        result = self.sequencer.analyze_dna_text(text)
        assert result['success'] == True
        assert result['apoe_e4_status'] == 'Homozygous'
        assert result['genetic_risk_score'] == 90
    
    def test_analyze_apoe_heterozygous(self):
        text = 'rs429358 19 45411941 T C'
        result = self.sequencer.analyze_dna_text(text)
        assert result['success'] == True
        assert result['apoe_e4_status'] == 'Heterozygous'
        assert result['genetic_risk_score'] == 65
    
    def test_analyze_apoe_negative(self):
        text = 'rs429358 19 45411941 T T'
        result = self.sequencer.analyze_dna_text(text)
        assert result['success'] == True
        assert result['apoe_e4_status'] == 'Negative'
        assert result['genetic_risk_score'] == 15
