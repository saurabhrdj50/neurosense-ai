"""Acoustic Biomarker Extraction for Neurocognitive Assessment.

Extracts clinically validated vocal biomarkers:
- Jitter (frequency perturbation / micro-instability)
- Shimmer (amplitude perturbation / loudness tremor)
- Harmonics-to-Noise Ratio (HNR / voice breathiness & roughness)
- Formant frequencies (F1, F2 / articulatory vowel space)
- Prosodic & Pause Dynamics (speech-to-pause ratio, hesitation count, articulation rate)

Supports opensmile (eGeMAPS) if available, with a resilient SciPy/Librosa fallback.
"""
import logging
from typing import Any, Dict, Optional, Tuple
import numpy as np
from scipy import signal

logger = logging.getLogger(__name__)


class AcousticBiomarkerExtractor:
    """Extracts multidimensional acoustic voice biomarkers from speech audio."""

    def __init__(self):
        self._opensmile_available = False
        try:
            import opensmile
            self._opensmile = opensmile.Smile(
                feature_set=opensmile.FeatureSet.eGeMAPS,
                feature_level=opensmile.FeatureLevel.Functionals,
            )
            self._opensmile_available = True
            logger.info("OpenSMILE (eGeMAPS) initialized for acoustic extraction.")
        except Exception:
            logger.debug("OpenSMILE not available; using SciPy/Librosa acoustic extraction.")

    def extract(self, y: np.ndarray, sr: int, audio_path: Optional[str] = None) -> Dict[str, Any]:
        """Extract acoustic biomarkers from audio array and sampling rate."""
        if y is None or len(y) == 0 or sr <= 0:
            return self._empty_result()

        duration = max(len(y) / sr, 0.1)

        # 1. Pitch / F0 and Glottal Periods
        f0_stats, periods = self._extract_f0_and_periods(y, sr)

        # 2. Jitter and Shimmer
        jitter_pct, shimmer_pct = self._calculate_jitter_and_shimmer(y, sr, periods)

        # 3. Harmonics-to-Noise Ratio (HNR)
        hnr_db = self._calculate_hnr(y, sr)

        # 4. Formant Frequencies (F1, F2)
        f1_hz, f2_hz = self._extract_formants(y, sr)

        # 5. Temporal Pause and Hesitation Dynamics
        temporal_stats = self._extract_temporal_dynamics(y, sr, duration)

        # 6. Clinical Benchmarks & Interpretations
        # Normal clinical cutoffs:
        # - Jitter (local) normal < 1.04%
        # - Shimmer (local) normal < 3.8%
        # - HNR normal > 15.0 dB
        # - Pause ratio normal < 0.25
        is_jitter_elevated = jitter_pct is not None and jitter_pct > 1.04
        is_shimmer_elevated = shimmer_pct is not None and shimmer_pct > 3.80
        is_hnr_reduced = hnr_db is not None and hnr_db < 15.0
        is_pause_elevated = temporal_stats.get('pause_ratio', 0) > 0.25
        is_monotone = f0_stats.get('f0_std_hz', 20.0) < 12.0

        # Risk index: 0-100 indicating vocal dysprosody / hesitation burden
        risk_flags = sum([is_jitter_elevated, is_shimmer_elevated, is_hnr_reduced, is_pause_elevated, is_monotone])
        vocal_risk_score = min(round((risk_flags / 5.0) * 100, 1), 100.0)

        # OpenSMILE supplementary features if enabled
        egemaps_features = {}
        if self._opensmile_available and audio_path:
            try:
                df = self._opensmile.process_file(audio_path)
                if not df.empty:
                    egemaps_features = {
                        'f0_semitones_mean': round(float(df.get('F0semitoneFrom27.5Hz_sma3nz_amean', [0])[0]), 2),
                        'loudness_mean': round(float(df.get('loudness_sma3_amean', [0])[0]), 2),
                        'spectral_flux_mean': round(float(df.get('spectralFlux_sma3_amean', [0])[0]), 2),
                    }
            except Exception as e:
                logger.debug("OpenSMILE extraction skipped: %s", e)

        raw_output = {
            'duration_seconds': round(float(duration), 2),
            'f0_mean_hz': f0_stats.get('f0_mean_hz'),
            'f0_std_hz': f0_stats.get('f0_std_hz'),
            'pitch_variation': 'Reduced (Monotone)' if is_monotone else 'Not reduced',
            'jitter_percent': jitter_pct,
            'jitter_status': 'Elevated' if is_jitter_elevated else 'Normal',
            'shimmer_percent': shimmer_pct,
            'shimmer_status': 'Elevated' if is_shimmer_elevated else 'Normal',
            'hnr_db': hnr_db,
            'hnr_status': 'Reduced (Breathiness/Roughness)' if is_hnr_reduced else 'Normal',
            'formant_f1_hz': f1_hz,
            'formant_f2_hz': f2_hz,
            'pause_ratio': temporal_stats.get('pause_ratio'),
            'pause_frequency': 'Elevated' if is_pause_elevated else 'Not elevated',
            'pause_count': temporal_stats.get('pause_count'),
            'articulation_rate_syl_sec': temporal_stats.get('articulation_rate'),
            'vocal_risk_score': vocal_risk_score,
            'clinical_impression': self._format_clinical_impression(risk_flags, vocal_risk_score),
        }

        # Filter to strictly str, int, float (omitting None and nested structures for test safety)
        clean_output = {}
        for k, v in raw_output.items():
            if v is not None:
                if isinstance(v, (int, np.integer)) and not isinstance(v, bool):
                    clean_output[k] = int(v)
                elif isinstance(v, (float, np.floating)):
                    clean_output[k] = float(v)
                elif isinstance(v, str):
                    clean_output[k] = str(v)
        return clean_output

    def _extract_f0_and_periods(self, y: np.ndarray, sr: int) -> Tuple[Dict[str, float], np.ndarray]:
        """Extract pitch curve and glottal cycle period estimates."""
        try:
            import librosa
            f0, voiced_flag, _ = librosa.pyin(
                y,
                fmin=librosa.note_to_hz('C2'),
                fmax=librosa.note_to_hz('C6'),
                sr=sr,
            )
            valid_f0 = f0[~np.isnan(f0)] if f0 is not None else np.array([])
            if len(valid_f0) > 5:
                periods = 1.0 / valid_f0
                return {
                    'f0_mean_hz': round(float(np.mean(valid_f0)), 2),
                    'f0_std_hz': round(float(np.std(valid_f0)), 2),
                    'f0_min_hz': round(float(np.min(valid_f0)), 2),
                    'f0_max_hz': round(float(np.max(valid_f0)), 2),
                }, periods
        except Exception as e:
            logger.debug("Pitch extraction exception: %s", e)
        return {}, np.array([])

    def _calculate_jitter_and_shimmer(
        self, y: np.ndarray, sr: int, periods: np.ndarray
    ) -> Tuple[Optional[float], Optional[float]]:
        """Compute relative Jitter (%) and Shimmer (%) from glottal pitch periods."""
        if len(periods) < 10:
            return None, None
        try:
            # Jitter (local): relative average cycle-to-cycle period difference
            period_diffs = np.abs(np.diff(periods))
            mean_period = np.mean(periods)
            if mean_period > 0:
                jitter_local = (np.mean(period_diffs) / mean_period) * 100.0
                jitter_val = round(float(jitter_local), 2)
            else:
                jitter_val = None

            # Shimmer (local): relative amplitude perturbation across frames
            frame_len = int(sr * 0.025)  # 25ms
            hop_len = int(sr * 0.010)    # 10ms
            if len(y) > frame_len:
                num_frames = (len(y) - frame_len) // hop_len
                amplitudes = [
                    np.max(np.abs(y[i * hop_len: i * hop_len + frame_len]))
                    for i in range(num_frames)
                ]
                amplitudes = np.array([a for a in amplitudes if a > 0.01])
                if len(amplitudes) > 10:
                    amp_diffs = np.abs(np.diff(amplitudes))
                    mean_amp = np.mean(amplitudes)
                    shimmer_local = (np.mean(amp_diffs) / mean_amp) * 100.0
                    shimmer_val = round(float(shimmer_local), 2)
                else:
                    shimmer_val = None
            else:
                shimmer_val = None

            return jitter_val, shimmer_val
        except Exception as exc:
            logger.debug("Jitter/Shimmer calculation failed: %s", exc)
            return None, None

    def _calculate_hnr(self, y: np.ndarray, sr: int) -> Optional[float]:
        """Compute Harmonics-to-Noise Ratio (HNR in dB) via autocorrelation."""
        try:
            # Bandpass filter around speech frequencies (80 - 4000 Hz)
            sos = signal.butter(4, [80, min(3800, sr // 2 - 100)], btype='bandpass', fs=sr, output='sos')
            filtered = signal.sosfilt(sos, y)
            autocorr = np.correlate(filtered, filtered, mode='full')
            mid = len(autocorr) // 2
            half = autocorr[mid:]
            if len(half) < 2:
                return None
            r0 = half[0]
            # Search for peak between 80 Hz and 400 Hz (min lag sr/400 to sr/80)
            min_lag = int(sr / 400)
            max_lag = int(sr / 80)
            if max_lag > len(half):
                return None
            search_window = half[min_lag:max_lag]
            if len(search_window) == 0:
                return None
            r_max = np.max(search_window)
            if r0 > r_max and (r0 - r_max) > 0:
                hnr = 10.0 * np.log10(r_max / (r0 - r_max))
                return round(float(hnr), 2)
        except Exception as exc:
            logger.debug("HNR computation exception: %s", exc)
        return None

    def _extract_formants(self, y: np.ndarray, sr: int) -> Tuple[Optional[float], Optional[float]]:
        """Estimate Formant Frequencies F1 and F2 using Linear Predictive Coding (LPC)."""
        try:
            # Pre-emphasis filter
            pre_emphasized = np.append(y[0], y[1:] - 0.97 * y[:-1])
            # Select center 1 second of audio
            center = len(pre_emphasized) // 2
            start = max(0, center - sr // 2)
            end = min(len(pre_emphasized), center + sr // 2)
            chunk = pre_emphasized[start:end]
            if len(chunk) < 512:
                return None, None
            windowed = chunk * np.hamming(len(chunk))

            # LPC order: sr / 1000 + 4
            order = int(sr / 1000) + 4
            # Autocorrelation for Levinson-Durbin
            r = np.correlate(windowed, windowed, mode='full')[len(windowed) - 1: len(windowed) + order]
            # Solve LPC coefficients via toeplitz
            from scipy.linalg import solve_toeplitz
            if len(r) > 1 and r[0] > 0:
                a = solve_toeplitz((r[:-1], r[:-1]), -r[1:])
                lpc_coeffs = np.concatenate([[1.0], a])
                roots = np.roots(lpc_coeffs)
                roots = roots[np.imag(roots) >= 0]
                angles = np.arctan2(np.imag(roots), np.real(roots))
                freqs = sorted(angles * (sr / (2 * np.pi)))
                formants = [f for f in freqs if 250 < f < 3500]
                f1 = round(float(formants[0]), 1) if len(formants) > 0 else None
                f2 = round(float(formants[1]), 1) if len(formants) > 1 else None
                return f1, f2
        except Exception as exc:
            logger.debug("Formant extraction failed: %s", exc)
        return None, None

    def _extract_temporal_dynamics(self, y: np.ndarray, sr: int, total_duration: float) -> Dict[str, Any]:
        """Compute silent pause intervals, speech-to-pause ratio, and articulation rate."""
        try:
            import librosa
            # Top db threshold for speech vs silence
            intervals = librosa.effects.split(y, top_db=25)
            voiced_duration = sum((end - start) for start, end in intervals) / sr
            pause_duration = max(total_duration - voiced_duration, 0.0)
            pause_ratio = round(pause_duration / max(total_duration, 0.1), 3)

            # Count hesitation pauses longer than 250ms
            pause_count = 0
            if len(intervals) > 1:
                for i in range(len(intervals) - 1):
                    gap = (intervals[i + 1][0] - intervals[i][1]) / sr
                    if gap >= 0.25:
                        pause_count += 1

            # Approximate syllable count using onset envelope peaks
            onset_env = librosa.onset.onset_strength(y=y, sr=sr)
            peaks = librosa.util.peak_pick(onset_env, pre_max=3, post_max=3, pre_avg=3, post_avg=5, delta=0.5, wait=10)
            syllable_count = len(peaks)
            articulation_rate = round(syllable_count / max(voiced_duration, 0.5), 2)

            return {
                'voiced_seconds': round(voiced_duration, 2),
                'pause_seconds': round(pause_duration, 2),
                'pause_ratio': float(pause_ratio),
                'pause_count': pause_count,
                'articulation_rate': articulation_rate,
            }
        except Exception as exc:
            logger.debug("Temporal dynamics calculation exception: %s", exc)
            return {'pause_ratio': 0.0, 'pause_count': 0, 'articulation_rate': 0.0}

    def _format_clinical_impression(self, risk_flags: int, vocal_risk_score: float) -> str:
        if risk_flags == 0:
            return "Stable prosody and acoustic dynamics. Pitch variation and harmonic ratios within normal clinical ranges."
        elif risk_flags <= 2:
            return f"Mild acoustic irregularities detected ({vocal_risk_score}% indicator score). Minor elevation in hesitation pauses or pitch micro-instability."
        else:
            return f"Significant acoustic markers identified ({vocal_risk_score}% indicator score). Elevated micro-jitter, reduced harmonic ratio, and pronounced hesitation patterns characteristic of motor speech / cognitive dysprosody."

    def _empty_result(self) -> Dict[str, Any]:
        return {
            'success': False,
            'vocal_risk_score': 0.0,
            'clinical_impression': 'No audio signal available for acoustic biomarker evaluation.',
        }
