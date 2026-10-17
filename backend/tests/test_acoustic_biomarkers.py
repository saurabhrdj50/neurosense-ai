"""Unit tests for Acoustic Biomarker extraction pipeline."""
import numpy as np
from app.ml.speech.acoustic_biomarkers import AcousticBiomarkerExtractor


def test_extractor_handles_empty_audio():
    extractor = AcousticBiomarkerExtractor()
    res = extractor.extract(np.array([]), 16000)
    assert res['vocal_risk_score'] == 0.0


def test_extractor_extracts_synthetic_sine_wave():
    extractor = AcousticBiomarkerExtractor()
    sr = 16000
    duration = 2.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Synthetic speech-like signal: 200 Hz tone with pauses
    signal_wave = 0.5 * np.sin(2 * np.pi * 200 * t)
    # Insert silence in middle
    signal_wave[int(0.8 * sr): int(1.3 * sr)] = 0.0

    res = extractor.extract(signal_wave, sr)
    assert res.get('duration_seconds') == 2.0
    assert res['duration_seconds'] == 2.0
    assert 'vocal_risk_score' in res
    assert 'clinical_impression' in res
    assert 'pause_frequency' in res
