"""Speech NLP classifier + fusion-vote integration tests.

Network-free: the DistilBERT encoder is never loaded. The classifier seam
(``app.ml.speech.nlp_classifier.classify_transcript``) is either monkeypatched
or exercised with stub heads; the live encoder download is covered by an
opt-in test guarded by NEUROSENSE_SPEECH_NLP_LIVE=1.

Contracts locked here:
- minimum-word gate runs before any model construction,
- a probability vote fuses through the explicit ``speech_nlp_result`` channel,
- the display-only ``sentiment`` object still never votes (see test_fusion.py),
- classifier failures are recorded, never raised into the pipeline.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pytest

LONG_TEXT = (
    "The boy is stealing cookies from the jar while the woman is washing "
    "dishes at the sink and the water is overflowing onto the floor behind "
    "her and she does not notice."
)  # 33 words — picture-description style, above the default 15-word gate

STUB_VOTE = {
    'dementia_probability': 0.8321,
    'dementia_prediction': 'dementia',
    'nlp_classifier': 'distilbert-base-uncased+logreg',
}


@pytest.fixture
def gated(monkeypatch):
    """Ensure the classifier can never be constructed during these tests."""
    from app.ml.speech import nlp_classifier

    def _explode(*a, **k):
        raise AssertionError("classifier must not be constructed in this test")

    monkeypatch.setattr(nlp_classifier, 'get_speech_nlp_classifier', _explode)
    return nlp_classifier


class TestClassifierUnit:
    def test_short_text_gate_runs_before_model_load(self, gated, monkeypatch):
        from app.config.settings import Config

        monkeypatch.setattr(Config, 'SPEECH_NLP_MIN_WORDS', 15)
        assert gated.classify_transcript('I went to the store today.') is None

    def test_disabled_flag_short_circuits(self, monkeypatch):
        from app.config.settings import Config
        from app.ml.speech import nlp_classifier

        monkeypatch.setattr(Config, 'SPEECH_NLP_ENABLED', False)
        assert nlp_classifier.get_speech_nlp_classifier() is None

    def _stub_classifier(self, prob_dementia):
        import numpy as np
        from app.ml.speech.nlp_classifier import SpeechNLPClassifier

        clf = SpeechNLPClassifier.__new__(SpeechNLPClassifier)

        class FakeScaler:
            def transform(self, x):
                return x

        class FakeHead:
            def predict_proba(self, x):
                return np.array([[1.0 - prob_dementia, prob_dementia]])

        clf.head = FakeHead()
        clf.scaler = FakeScaler()
        clf._embed = lambda text: np.zeros((1, 768))
        return clf

    def test_threshold_rounds_and_labels(self, monkeypatch):
        from app.config.settings import Config

        monkeypatch.setattr(Config, 'SPEECH_NLP_MIN_WORDS', 15)
        clf = self._stub_classifier(0.73126)
        out = clf.classify(LONG_TEXT)
        assert out['dementia_probability'] == 0.7313
        assert out['dementia_prediction'] == 'dementia'
        assert out['nlp_classifier'] == 'distilbert-base-uncased+logreg'

        clf = self._stub_classifier(0.1)
        out = clf.classify(LONG_TEXT)
        assert out['dementia_probability'] == 0.1
        assert out['dementia_prediction'] == 'control'

    def test_probability_clamped_into_unit_range(self, monkeypatch):
        from app.config.settings import Config

        monkeypatch.setattr(Config, 'SPEECH_NLP_MIN_WORDS', 15)
        clf = self._stub_classifier(1.00004)  # float noise above 1.0
        assert clf.classify(LONG_TEXT)['dementia_probability'] == 1.0

    def test_short_text_never_reaches_head(self, monkeypatch):
        from app.config.settings import Config

        monkeypatch.setattr(Config, 'SPEECH_NLP_MIN_WORDS', 15)
        clf = self._stub_classifier(0.9)
        assert clf.classify('too short') is None

    @pytest.mark.skipif(
        os.environ.get('NEUROSENSE_SPEECH_NLP_LIVE') != '1',
        reason='Live check downloads distilbert-base-uncased (~268MB); opt in via env var.',
    )
    def test_live_artifact_end_to_end(self):
        """Opt-in: the real joblib artefact + real encoder produce a sane vote.

        Also re-validate against Speech/NeuroSense_Final/NLP/predictions/
        frozen_test_recording_predictions.csv when the source transcripts are
        available (see nlp_classifier.py docstring assumption).
        """
        from app.ml.speech.nlp_classifier import classify_transcript

        out = classify_transcript(LONG_TEXT)
        assert out is not None
        assert 0.0 <= out['dementia_probability'] <= 1.0
        assert out['dementia_prediction'] in ('control', 'dementia')


class TestFusionSpeechVote:
    def setup_method(self):
        from app.ml.fusion.engine import MultimodalFusion

        self.fusion = MultimodalFusion()

    def test_speech_vote_alone_produces_result(self):
        r = self.fusion.predict(speech_nlp_result={'dementia_probability': 0.83})
        assert r['stage'] == "Alzheimer's Disease (AD)"  # 83 → risk policy index 2
        assert r['method'] == 'SENTIMENT Only'
        assert r['active_modalities'] == ['sentiment']
        assert 'Speech NLP' in r['evidence_summary'][0]

    def test_weak_probability_votes_lower_stage(self):
        r = self.fusion.predict(speech_nlp_result={'dementia_probability': 0.2})
        assert r['stage'] == 'Mild Cognitive Impairment (MCI)'  # 20 → index 1

    def test_boundary_probability_has_low_confidence(self):
        near = self.fusion.predict(speech_nlp_result={'dementia_probability': 0.52})
        assert near['confidence'] == 10.0  # clamped floor: abs(0.52-0.5)*2 = 0.04
        strong = self.fusion.predict(speech_nlp_result={'dementia_probability': 0.9})
        assert strong['confidence'] == 80.0

    def test_out_of_range_probability_clamped(self):
        high = self.fusion.predict(speech_nlp_result={'dementia_probability': 1.5})
        assert high['stage'] == "Alzheimer's Disease (AD)"
        low = self.fusion.predict(speech_nlp_result={'dementia_probability': -2.0})
        assert low['stage'] == 'Cognitively Normal (CN)'

    def test_display_sentiment_object_still_ignored_with_vote_present(self):
        """The display-only object must never add a second speech vote."""
        display = {
            'dominant_emotion': None,
            'lexical_density': '61%',
            'filler_word_count': 0,
            'clinical_summary': 'Audio transcript available.',
        }
        r = self.fusion.predict(
            sentiment_result=display,
            speech_nlp_result={'dementia_probability': 0.83},
        )
        assert r['active_modalities'] == ['sentiment']
        assert len(r['evidence_summary']) == 1

    def test_none_probability_ignored(self):
        r = self.fusion.predict(speech_nlp_result={'dementia_probability': None})
        assert r['method'] == 'No Data'

    def test_speech_vote_joins_mri_fusion(self):
        r = self.fusion.predict(
            mri_result={'stage': 'Mild Demented', 'stage_index': 2, 'confidence': 80.0},
            speech_nlp_result={'dementia_probability': 0.45},  # 45 → index 2
        )
        assert r['modality_agreement'] in ('Full', 'High')
        assert abs(sum(r['modality_contributions'].values()) - 100) < 0.2
        assert 'SENTIMENT' in r['method']


class TestSpeechStepWiring:
    def _analysis_inputs(self, text):
        return {
            'patient_info': {'patient_id': 'X', 'name': 'X'},
            'patient_notes': '',
            'mri_file': None,
            'audio_file': None,
            'audio_text': text,
            'cognitive_data': None,
            'risk_data': None,
            'gradcam': False,
        }

    def test_long_text_gets_vote_and_fuses(self, monkeypatch):
        from app.ml.speech import nlp_classifier
        from app.features.analysis.service import AnalysisOrchestrator

        monkeypatch.setattr(nlp_classifier, 'classify_transcript', lambda t: dict(STUB_VOTE))
        res = AnalysisOrchestrator().run_full_analysis(self._analysis_inputs(LONG_TEXT))
        assert res['audio_transcription']['dementia_probability'] == 0.8321
        assert res['audio_transcription']['dementia_prediction'] == 'dementia'
        assert res['final_stage']['method'] == 'SENTIMENT Only'
        assert 'Speech NLP' in res['final_stage']['evidence_summary'][0]

    def test_no_vote_keeps_no_data_fusion(self, monkeypatch):
        from app.ml.speech import nlp_classifier
        from app.features.analysis.service import AnalysisOrchestrator

        monkeypatch.setattr(nlp_classifier, 'classify_transcript', lambda t: None)
        res = AnalysisOrchestrator().run_full_analysis(self._analysis_inputs(LONG_TEXT))
        assert 'dementia_probability' not in res['audio_transcription']
        assert res['final_stage']['method'] == 'No Data'

    def test_classifier_failure_recorded_not_raised(self, monkeypatch):
        from app.ml.speech import nlp_classifier
        from app.features.analysis.service import AnalysisOrchestrator

        def _boom(text):
            raise RuntimeError('encoder exploded')

        monkeypatch.setattr(nlp_classifier, 'classify_transcript', _boom)
        res = AnalysisOrchestrator().run_full_analysis(self._analysis_inputs(LONG_TEXT))
        assert 'encoder exploded' in res['audio_transcription']['nlp_error']
        assert 'dementia_probability' not in res['audio_transcription']
        assert res['sentiment']['clinical_summary']  # display summary still built
        assert res['final_stage']['method'] == 'No Data'
