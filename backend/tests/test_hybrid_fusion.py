"""
Unit and integration tests for Hybrid Multimodal Fusion:
- Tier 1: Feature-Level Cross-Modal Speech Fusion (Acoustic DSP + DistilBERT NLP).
- Tier 2: Attentive Evidential Decision Fusion across MRI, Cognitive, Speech, and Risk.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest
from app.ml.fusion.engine import MultimodalFusion, STAGE_ORDER
from app.ml.speech.nlp_classifier import SpeechNLPClassifier


CN = 'Cognitively Normal (CN)'
MCI = 'Mild Cognitive Impairment (MCI)'
AD = "Alzheimer's Disease (AD)"


class TestTier1SpeechFeatureFusion:
    def test_acoustic_risk_computation(self):
        classifier = SpeechNLPClassifier.__new__(SpeechNLPClassifier)
        # Empty acoustic features return None
        assert classifier._compute_acoustic_risk({}) is None

        # Normal vocal parameters
        normal_ac = {
            'jitter_percent': 0.65,
            'shimmer_percent': 2.1,
            'hnr_db': 24.0,
            'pause_ratio': 0.15,
            'vocal_risk_score': 15.0,
        }
        risk_normal = classifier._compute_acoustic_risk(normal_ac)
        assert risk_normal is not None
        assert 0.0 <= risk_normal < 0.5  # Below midpoint

        # Highly abnormal vocal parameters
        elevated_ac = {
            'jitter_percent': 2.85,     # Highly elevated
            'shimmer_percent': 8.40,    # Highly elevated
            'hnr_db': 11.2,             # Breathiness / low HNR
            'pause_ratio': 0.45,        # Long pauses
            'vocal_risk_score': 85.0,
        }
        risk_elevated = classifier._compute_acoustic_risk(elevated_ac)
        assert risk_elevated is not None
        assert risk_elevated > 0.6  # Elevated risk

    def test_cross_modal_fusion_modulation(self, monkeypatch):
        classifier = SpeechNLPClassifier.__new__(SpeechNLPClassifier)
        # Mock _embed and head
        import numpy as np

        class StubHead:
            def predict_proba(self, X):
                return np.array([[0.55, 0.45]])  # Raw probability 0.45

        class StubScaler:
            def transform(self, X):
                return X

        classifier.head = StubHead()
        classifier.scaler = StubScaler()
        classifier._embed = lambda text: np.zeros((1, 768))

        # 1. Text-only inference
        long_text = "The quick brown fox jumps over the lazy dog and runs across the wide open green meadow."
        res_text_only = classifier.classify(long_text, acoustic_features=None)
        assert res_text_only is not None
        assert res_text_only['fusion_mode'] == 'text_only_nlp'
        assert res_text_only['dementia_probability'] == 0.45

        # 2. Cross-modal inference with severe acoustic dysprosody
        severe_ac = {
            'jitter_percent': 3.5,
            'shimmer_percent': 9.2,
            'hnr_db': 9.0,
            'pause_ratio': 0.50,
            'vocal_risk_score': 90.0,
        }
        res_fused = classifier.classify(long_text, acoustic_features=severe_ac)
        assert res_fused is not None
        assert res_fused['fusion_mode'] == 'acoustic_linguistic_feature_fusion'
        # Severe acoustic dysprosody pulls the probability upward:
        assert res_fused['dementia_probability'] > res_text_only['dementia_probability']


class TestTier2AttentiveEvidentialFusion:
    def setup_method(self):
        self.fusion = MultimodalFusion()

    def test_attentive_weight_modulation(self):
        """High-confidence modality receives greater adaptive attention weight."""
        # Highly confident MRI vs low-confidence cognitive test
        mri = {'stage': MCI, 'stage_index': 1, 'confidence': 95.0}
        cog = {'composite_score': 45, 'stage_index': 1}  # Uncertainty ~0.45
        res = self.fusion.predict(mri_result=mri, cognitive_result=cog)

        assert res['fusion_architecture'] == 'hybrid_attentive_evidential'
        assert res['stage'] == MCI
        assert res['modality_agreement'] in ('Full', 'High')
        # MRI has higher certainty, so its contribution is boosted above the base 40/25 ratio
        mri_contrib = res['modality_contributions']['mri']
        cog_contrib = res['modality_contributions']['cognitive']
        assert mri_contrib > cog_contrib
        assert abs(mri_contrib + cog_contrib - 100.0) < 0.2

    def test_missing_modalities_graceful_handling(self):
        """Missing modalities never cause errors; active modalities renormalize."""
        res = self.fusion.predict(
            speech_nlp_result={'dementia_probability': 0.82},
            risk_result={'overall_risk_score': 70.0},
        )
        assert res['stage'] in STAGE_ORDER
        assert set(res['active_modalities']) == {'sentiment', 'risk'}
        assert 'mri' in res['missing_modalities']
        assert 'cognitive' in res['missing_modalities']
        assert abs(sum(res['modality_contributions'].values()) - 100.0) < 0.2
