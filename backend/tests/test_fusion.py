"""
Tests for MultimodalFusion module.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.ml.fusion.engine import MultimodalFusion, STAGE_ORDER


class TestFusionEmpty:
    def setup_method(self):
        self.fusion = MultimodalFusion()

    def test_no_data(self):
        """Fusion with no inputs should return empty result."""
        result = self.fusion.predict()
        assert result['stage'] is None
        assert result['confidence'] == 0
        assert result['method'] == 'No Data'


class TestSingleModality:
    def setup_method(self):
        self.fusion = MultimodalFusion()

    def test_mri_only(self):
        """Single MRI input should return MRI result directly."""
        mri = {'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 85.0}
        result = self.fusion.predict(mri_result=mri)
        assert result['stage'] == 'Mild Demented'
        assert result['stage_index'] == 2
        assert result['method'] == 'MRI Only'
        assert result['modality_contributions'] == {'mri': 100}

    def test_sentiment_only(self):
        """Single sentiment input should return sentiment result."""
        sent = {'cognitive_risk_score': 70}
        result = self.fusion.predict(sentiment_result=sent)
        assert result['stage'] == STAGE_ORDER[3]  # 70 >= 60, so index 3
        assert result['method'] == 'SENTIMENT Only'


class TestMultiModality:
    def setup_method(self):
        self.fusion = MultimodalFusion()

    def test_two_modalities_agreement(self):
        """Two modalities agreeing should have high agreement."""
        mri = {'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 90.0}
        cog = {'composite_score': 40, 'stage_index': 2}
        result = self.fusion.predict(mri_result=mri, cognitive_result=cog)
        assert result['modality_agreement'] in ('Full', 'High')
        assert result['stage'] == 'Mild Demented'
        assert 'MRI' in result['method']
        assert 'COGNITIVE' in result['method']

    def test_three_modalities_disagreement(self):
        """Modalities with spread should have lower agreement."""
        mri = {'stage': 'Non-Demented', 'stage_index': 0, 'confidence': 80.0}
        cog = {'composite_score': 25, 'stage_index': 3}  # Moderate
        risk = {'overall_risk_score': 50}
        result = self.fusion.predict(mri_result=mri, cognitive_result=cog, risk_result=risk)
        assert result['modality_agreement'] in ('Moderate', 'Low')
        assert len(result['evidence_summary']) == 3

    def test_all_modalities(self):
        """All 5 modalities should produce a valid result."""
        result = self.fusion.predict(
            mri_result={'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 85.0},
            sentiment_result={'cognitive_risk_score': 45},
            cognitive_result={'composite_score': 50, 'stage_index': 1},
            risk_result={'overall_risk_score': 35},
            audio_result={'cognitive_risk_score': 30},
        )
        assert result['stage'] in STAGE_ORDER
        assert 0 < result['confidence'] <= 100
        assert len(result['modality_contributions']) == 5
        assert 'Multimodal Fusion' in result['method']


class TestMappingHelpers:
    def setup_method(self):
        self.fusion = MultimodalFusion()

    def test_risk_to_stage_boundaries(self):
        """Test risk-to-stage mapping at boundaries."""
        assert self.fusion._risk_to_stage_index(0) == 0
        assert self.fusion._risk_to_stage_index(14) == 0
        assert self.fusion._risk_to_stage_index(15) == 1
        assert self.fusion._risk_to_stage_index(34) == 1
        assert self.fusion._risk_to_stage_index(35) == 2
        assert self.fusion._risk_to_stage_index(59) == 2
        assert self.fusion._risk_to_stage_index(60) == 3
        assert self.fusion._risk_to_stage_index(100) == 3

    def test_cog_to_stage_boundaries(self):
        """Test cognitive-to-stage mapping at boundaries."""
        assert self.fusion._cog_to_stage_index(100) == 0
        assert self.fusion._cog_to_stage_index(80) == 0
        assert self.fusion._cog_to_stage_index(79) == 1
        assert self.fusion._cog_to_stage_index(55) == 1
        assert self.fusion._cog_to_stage_index(54) == 2
        assert self.fusion._cog_to_stage_index(30) == 2
        assert self.fusion._cog_to_stage_index(29) == 3
        assert self.fusion._cog_to_stage_index(0) == 3


class TestProductionShape:
    """Production input shapes: 3-class MRI, display-only speech, honest gaps."""

    def setup_method(self):
        self.fusion = MultimodalFusion()

    def test_mri_3_class_indices_map_without_shift(self):
        """MRI argmax 0/1/2 (CN/MCI/AD) must map to fusion stages 0/1/2."""
        for idx, name in [(0, 'Non-Demented'), (1, 'Very Mild Demented'), (2, 'Mild Demented')]:
            r = self.fusion.predict(
                mri_result={'stage': name, 'stage_index': idx, 'confidence': 90.0}
            )
            assert r['stage'] == name
            assert r['stage_index'] == idx

    def test_production_speech_shape_never_fuses(self):
        """The speech display object built by the service carries no severity
        score, so fusion must ignore it entirely."""
        speech = {
            'dominant_emotion': None,
            'lexical_density': '61%',
            'filler_word_count': 0,
            'pause_frequency': 'Not elevated',
            'pitch_variation': 'Not reduced',
            'clinical_summary': 'Audio transcript available.',
        }
        mri = {'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 80.0}
        cog = {'composite_score': 60.0}
        risk = {'overall_risk_score': 30.0}
        base = self.fusion.predict(mri_result=mri, cognitive_result=cog, risk_result=risk)
        with_speech = self.fusion.predict(
            mri_result=mri, cognitive_result=cog, risk_result=risk,
            sentiment_result=speech, audio_result=None,
        )
        assert with_speech == base
        assert 'sentiment' not in with_speech['active_modalities']

    def test_single_modality_clamps_malformed_input(self):
        """Out-of-range single-modality values are clamped, never echoed."""
        r = self.fusion.predict(risk_result={'overall_risk_score': 1000})
        assert r['stage'] == 'Moderate Demented'
        assert 0 <= r['confidence'] <= 100

    def test_deterministic_repeated_runs(self):
        """Three identical runs must produce identical output."""
        kw = dict(
            mri_result={'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 85.0},
            cognitive_result={'composite_score': 50.0, 'stage_index': 1},
            risk_result={'overall_risk_score': 35.0},
        )
        r1 = self.fusion.predict(**kw)
        r2 = self.fusion.predict(**kw)
        r3 = self.fusion.predict(**kw)
        assert r1 == r2 == r3

    def test_weights_renormalize_over_available_modalities(self):
        """Missing modalities must not keep weight in the denominator."""
        r = self.fusion.predict(
            mri_result={'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 80.0},
            cognitive_result={'composite_score': 60.0},
        )
        assert r['active_modalities'] == ['mri', 'cognitive']
        assert 'risk' in r['missing_modalities']
        total = sum(r['modality_contributions'].values())
        assert abs(total - 100) < 0.2
