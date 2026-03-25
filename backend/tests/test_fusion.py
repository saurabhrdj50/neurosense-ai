"""
Tests for MultimodalFusion module.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.fusion import MultimodalFusion, STAGE_ORDER


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
        """All 7 modalities should produce a valid result."""
        result = self.fusion.predict(
            mri_result={'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 85.0},
            sentiment_result={'cognitive_risk_score': 45},
            cognitive_result={'composite_score': 50, 'stage_index': 1},
            risk_result={'overall_risk_score': 35},
            handwriting_result={'handwriting_risk_score': 40, 'stage_index': 2},
            audio_result={'cognitive_risk_score': 30},
            visual_result={'visual_risk_score': 25, 'stage_index': 1},
        )
        assert result['stage'] in STAGE_ORDER
        assert 0 < result['confidence'] <= 100
        assert len(result['modality_contributions']) == 7
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
