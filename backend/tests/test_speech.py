"""Speech pipeline regression tests (fast: no Whisper model load).

Live Whisper execution was validated separately (Phase 5). These tests lock:
- linguistic biomarker determinism on fixed text,
- acoustic extraction JSON-serializability (np.float64 once crashed jsonify),
- the audio_text-only service branch (sentiment shape + fusion exclusion).
"""
import json


def _transcriber():
    from app.ml.speech.transcriber import SpeechTranscriber

    return SpeechTranscriber.__new__(SpeechTranscriber)


class TestLinguisticBiomarkers:
    TEXT = "I went to the store today. I forgot why I went inside."

    def test_deterministic_on_fixed_text(self):
        tr = _transcriber()
        words = self.TEXT.split()
        a = tr._extract_linguistic_biomarkers(self.TEXT, words)
        b = tr._extract_linguistic_biomarkers(self.TEXT, words)
        assert a == b
        assert a['total_words'] == 12
        assert a['filler_word_count'] == 0
        assert 0 < a['lexical_density'] <= 1
        assert json.dumps(a)  # must stay JSON-serializable

    def test_empty_words(self):
        tr = _transcriber()
        assert tr._extract_linguistic_biomarkers('', []) == {}


class TestAcousticExtraction:
    def test_sine_wav_produces_json_safe_features(self, tmp_path):
        import numpy as np

        try:
            import soundfile as sf
        except ImportError:
            import pytest

            pytest.skip('soundfile not installed')
        sr = 16000
        t = np.arange(sr * 2) / sr
        y = (0.5 * np.sin(2 * np.pi * 220 * t)).astype(np.float32)
        wav = str(tmp_path / 'tone.wav')
        sf.write(wav, y, sr)
        feats = _transcriber()._extract_acoustic_biomarkers(wav)
        assert feats  # non-empty on decodable audio
        assert json.dumps(feats)  # regression: np.float64 broke jsonify
        for v in feats.values():
            assert isinstance(v, (str, int, float))

    def test_corrupt_audio_returns_empty_dict(self, tmp_path):
        bad = tmp_path / 'bad.wav'
        bad.write_bytes(b'not audio at all')
        assert _transcriber()._extract_acoustic_biomarkers(str(bad)) == {}


class TestAudioTextBranch:
    def test_text_only_builds_sentiment_without_fusion(self):
        from app.features.analysis.service import AnalysisOrchestrator

        orch = AnalysisOrchestrator()
        res = orch.run_full_analysis(
            {
                'patient_info': {'patient_id': 'X', 'name': 'X'},
                'patient_notes': '',
                'mri_file': None,
                'audio_file': None,
                'audio_text': 'I went to the store today.',
                'cognitive_data': None,
                'risk_data': None,
                'gradcam': False,
            },
            doctor_id=None,
        )
        assert res['audio_transcription']['text'] == 'I went to the store today.'
        assert res['sentiment']['clinical_summary'].startswith('Manual text transcript')
        assert res['final_stage']['method'] == 'No Data'


class TestBuildSentimentSummary:
    """Table tests for the sentiment-mapping seam."""

    def test_audio_success(self):
        from app.features.analysis.speech.service import build_sentiment_summary
        s = build_sentiment_summary(
            {'acoustic_features': {'pause_frequency': 'Elevated', 'pitch_variation': 'Reduced'},
             'linguistic_biomarkers': {'lexical_density': 0.619, 'filler_word_count': 2},
             'method': 'whisper_turbo', 'error': None},
            True,
        )
        assert s['lexical_density'] == '61%'
        assert s['filler_word_count'] == 2
        assert s['clinical_summary'].startswith('Audio transcript available')

    def test_manual_text(self):
        from app.features.analysis.speech.service import build_sentiment_summary
        s = build_sentiment_summary({'text': 'hi', 'acoustic_features': {}, 'linguistic_biomarkers': {}}, False)
        assert s['lexical_density'] is None
        assert s['clinical_summary'].startswith('Manual text transcript')

    def test_failed_audio(self):
        from app.features.analysis.speech.service import build_sentiment_summary
        s = build_sentiment_summary({'method': 'error', 'error': 'boom', 'acoustic_features': {}, 'linguistic_biomarkers': {}}, True)
        assert s['clinical_summary'].startswith('Audio analysis did not produce')

    def test_neutral_emotion_on_no_match(self):
        from app.ml.nlp.sentiment import SentimentAnalyzer
        assert SentimentAnalyzer()._detect_emotions('the sky is blue today')['dominant'] == 'neutral'

    def test_multilingual_fillers_counted(self):
        from app.ml.speech.transcriber import SpeechTranscriber
        tr = SpeechTranscriber.__new__(SpeechTranscriber)
        words = 'मतलब dog हाच cat'.split()
        out = tr._extract_linguistic_biomarkers('मतलब dog हाच cat', words)
        assert out['filler_word_count'] == 2
        assert [t['tag'] for t in out['annotated_tokens']] == ['filler', 'normal', 'filler', 'normal']
