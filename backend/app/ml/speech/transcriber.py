import logging
import os
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# Primary backend: faster-whisper (CTranslate2) — ~4x faster and lighter than
# openai-whisper on CPU, same fully-local transcription (no PHI leaves the box).
try:
    from faster_whisper import WhisperModel as FasterWhisperModel
    HAS_FASTER_WHISPER = True
except ImportError:
    HAS_FASTER_WHISPER = False
    FasterWhisperModel = None

# Legacy fallback kept for environments that already have openai-whisper.
try:
    import whisper
    HAS_WHISPER = True
except ImportError:
    HAS_WHISPER = False
    whisper = None


try:
    import librosa
    import numpy as np
    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False
    librosa = None
    np = None

try:
    import httpx
    HAS_HTTPX = True
except ImportError:
    HAS_HTTPX = False
    httpx = None


class SpeechTranscriber:
    """
    Research-grade Speech Analysis Module using local Whisper transcription.
    Extracts transcript, speech rate, pause frequency, pitch variation, and acoustic biomarkers.
    """
    def __init__(self, model_size: str = None) -> None:
        self.whisper_model = None
        self.whisper_impl = None  # 'faster' | 'openai' | None
        # Why no backend loaded, when the libraries themselves are installed —
        # surfaced verbatim so a "no backend" report is diagnosable (a cache
        # permission error must not masquerade as a missing dependency).
        self._init_error = None
        # Whisper-turbo on CPU burns minutes per clip and blew through the
        # request timeout; pick the model by accelerator unless the operator
        # pins one via WHISPER_MODEL.
        if model_size is None:
            model_size = os.environ.get('WHISPER_MODEL')
        if not model_size:
            try:
                import torch
                model_size = 'turbo' if torch.cuda.is_available() else 'base'
            except ImportError:
                model_size = 'base'
        self.model_size = model_size

        requested = os.environ.get('WHISPER_BACKEND', 'auto').strip().lower()
        if requested in ('', 'auto', 'faster', 'openai'):
            want_faster = requested in ('', 'auto', 'faster')
            want_openai = requested in ('', 'auto', 'openai')
        else:
            logger.warning("Unknown WHISPER_BACKEND '%s' — using auto.", requested)
            want_faster, want_openai = True, True

        if want_faster and HAS_FASTER_WHISPER:
            try:
                import torch
                device = 'cuda' if torch.cuda.is_available() else 'cpu'
                compute = 'float16' if device == 'cuda' else 'int8'
                self.whisper_model = FasterWhisperModel(model_size, device=device, compute_type=compute)
                self.whisper_impl = 'faster'
                logger.info("faster-whisper (%s, %s/%s) initialized.", model_size, device, compute)
            except Exception as e:
                # A pinned size this faster-whisper build doesn't ship (e.g. 'turbo')
                # must not take transcription down — fall back to a known-good one.
                logger.warning("faster-whisper '%s' failed (%s); retrying 'base'.", model_size, e)
                try:
                    self.whisper_model = FasterWhisperModel('base', device='cpu', compute_type='int8')
                    self.whisper_impl = 'faster'
                    self.model_size = 'base'
                except Exception as e2:
                    self._init_error = e2
                    logger.warning("faster-whisper unavailable: %s", e2)

        if self.whisper_impl is None and want_openai and HAS_WHISPER and whisper is not None:
            try:
                self.whisper_model = whisper.load_model(model_size)
                self.whisper_impl = 'openai'
                logger.info("OpenAI Whisper (%s) initialized.", model_size)
            except Exception as e:
                self._init_error = e
                logger.warning("Could not load Whisper model '%s': %s", model_size, e)

    def _try_load_audio(self, audio_path: str):
        """Load audio with librosa; decode webm/ogg/mp3 to WAV via ffmpeg first if unavailable.

        Returns (y, sr_rate, converted_path) where converted_path is set only
        when an ffmpeg sibling WAV was created (caller must delete it).
        """
        try:
            y, sr_rate = librosa.load(audio_path, sr=16000)
            return y, sr_rate, None
        except Exception as e:
            logger.warning("Librosa could not open '%s' (%s) — attempting ffmpeg conversion.", audio_path, e)
            wav_path = audio_path.rsplit('.', 1)[0] + '.wav'
            try:
                import subprocess
                res = subprocess.run(
                    ['ffmpeg', '-y', '-i', audio_path, '-ar', '16000', '-ac', '1', wav_path],
                    capture_output=True,
                    timeout=120,  # a hung decode must not block the worker forever
                )
                if res.returncode != 0:
                    raise RuntimeError(res.stderr.decode(errors='replace'))
                y, sr_rate = librosa.load(wav_path, sr=16000)
                return y, sr_rate, wav_path
            except Exception as conv_e:
                logger.warning("ffmpeg conversion failed for '%s': %s", audio_path, conv_e)
                raise

    def _extract_acoustic_from(self, y, sr_rate) -> dict:
        """Extract rich clinical acoustic summaries from an already-decoded signal."""
        features = {}
        if not HAS_LIBROSA or librosa is None or y is None or sr_rate is None:
            return features
        try:
            from app.ml.speech.acoustic_biomarkers import AcousticBiomarkerExtractor
            extractor = AcousticBiomarkerExtractor()
            features = extractor.extract(y, sr_rate)
            # Map backward-compatible aliases for historical consumers
            if 'f0_mean_hz' in features:
                features['mean_f0_hz'] = features['f0_mean_hz']
            if 'pause_ratio' in features:
                features['silent_pause_ratio'] = features['pause_ratio']
        except Exception as e:
            logger.warning("Acoustic extraction warning: %s", e)
        return features

    def _extract_acoustic_biomarkers(self, audio_path: str) -> dict:
        """Extract acoustic summaries for an audio file path (decodes via librosa/ffmpeg)."""
        features = {}
        if not HAS_LIBROSA or librosa is None:
            return features

        converted_path = None
        try:
            y, sr_rate, converted_path = self._try_load_audio(audio_path)
            features = self._extract_acoustic_from(y, sr_rate)
        except Exception as e:
            logger.warning("Librosa acoustic extraction warning: %s", e)
        finally:
            if converted_path:
                try:
                    os.remove(converted_path)
                except OSError:
                    pass

        return features

    @staticmethod
    def _voiced_ratio(y, sr_rate) -> float:
        """Fraction of the clip that is non-silent (energy above top_db=25)."""
        if y is None or sr_rate is None or len(y) == 0:
            return 0.0
        try:
            peak = float(np.max(librosa.feature.rms(y=y)))
            # Absolute floor: digital silence or bare room tone has a peak far
            # below speech level. librosa's relative split alone treats pure
            # silence as "voiced" (0 dB vs 0 dB) — which is exactly the input
            # Whisper hallucinates on.
            if peak < 0.003:  # ≈ -50 dBFS
                return 0.0
            intervals = librosa.effects.split(y, top_db=25)
            voiced = sum((end - start) for start, end in intervals) / sr_rate
            return voiced / max(len(y) / sr_rate, 1e-6)
        except Exception:
            return 1.0  # cannot measure — never block transcription on this


    def _transcribe_groq(self, audio_path: str, language: str = 'en-US') -> Optional[str]:
        """High-speed cloud Whisper transcription via Groq API (free tier).

        Transcribes ~60s audio in 0.3-0.8s on specialized LPUs.
        Returns the transcript string on success, or None on error / if unset.
        """
        api_key = os.environ.get('GROQ_API_KEY', '').strip()
        if not api_key:
            return None
        if not HAS_HTTPX or httpx is None:
            logger.warning("GROQ_API_KEY is configured but httpx is not available; falling back to local Whisper.")
            return None

        model_name = os.environ.get('GROQ_WHISPER_MODEL', 'whisper-large-v3-turbo').strip()
        lang_code = language.split('-')[0].lower() if language else 'en'

        try:
            with open(audio_path, 'rb') as f:
                filename = os.path.basename(audio_path)
                files = {'file': (filename, f, 'application/octet-stream')}
                data = {
                    'model': model_name,
                    'response_format': 'json',
                    'language': lang_code,
                    'temperature': '0',
                }
                headers = {'Authorization': f'Bearer {api_key}'}
                resp = httpx.post(
                    'https://api.groq.com/openai/v1/audio/transcriptions',
                    headers=headers,
                    files=files,
                    data=data,
                    timeout=25.0,
                )
            if resp.status_code == 200:
                payload = resp.json()
                text = (payload.get('text') or '').strip()
                logger.info("Groq Whisper (%s) transcribed in cloud successfully.", model_name)
                return text
            else:
                logger.warning("Groq Whisper API returned status %s: %s", resp.status_code, resp.text[:200])
                return None
        except Exception as e:
            logger.warning("Groq Whisper request failed (%s) — falling back to local Whisper.", e)
            return None

    def transcribe_file(self, audio_path: str, language: str = 'en-US') -> dict:
        result = {
            'text': '',
            'method': 'unavailable',
            'error': None,
            'acoustic_features': {},
            'linguistic_biomarkers': {},
        }

        # Decode once up front: powers speech-presence gate & acoustic biomarker extraction
        y = None
        sr_rate = None
        converted_path = None
        if HAS_LIBROSA and librosa is not None:
            try:
                y, sr_rate, converted_path = self._try_load_audio(audio_path)
            except Exception as e:
                logger.warning("Audio decode failed before transcription: %s", e)

        # Silence / voice activity check: fail loudly if no speech energy detected
        if y is not None and self._voiced_ratio(y, sr_rate) < 0.02:
            result.update({
                'text': '',
                'method': 'silence_gate',
                'error': 'No speech detected in the recording.',
                'acoustic_features': self._extract_acoustic_from(y, sr_rate),
            })
            if converted_path:
                try:
                    os.remove(converted_path)
                except OSError:
                    pass
            return result

        # 1. High-speed Groq Cloud Whisper acceleration (if GROQ_API_KEY is configured)
        groq_text = self._transcribe_groq(audio_path, language=language)
        if groq_text is not None:
            try:
                words = groq_text.split()
                linguistic = self._extract_linguistic_biomarkers(groq_text, words)
                acoustic = (self._extract_acoustic_from(y, sr_rate)
                            if y is not None
                            else self._extract_acoustic_biomarkers(audio_path))
                model_used = os.environ.get('GROQ_WHISPER_MODEL', 'whisper-large-v3-turbo')
                return {
                    'text': groq_text,
                    'method': f'groq_{model_used}',
                    'error': None,
                    'acoustic_features': acoustic,
                    'linguistic_biomarkers': linguistic,
                }
            finally:
                if converted_path:
                    try:
                        os.remove(converted_path)
                    except OSError:
                        pass

        # 2. Local Whisper backend fallback (faster-whisper, else openai-whisper)
        if self.whisper_model is not None:
            try:
                # Both backends accept a 16 kHz float array; cap duration so a
                # long recording cannot monopolize a CPU worker past the timeout.
                whisper_input = audio_path
                if y is not None:
                    try:
                        max_sec = float(os.environ.get('WHISPER_MAX_AUDIO_SEC', '120') or 120)
                    except ValueError:
                        max_sec = 120.0
                    if len(y) > max_sec * sr_rate:
                        whisper_input = y[:int(max_sec * sr_rate)]
                        logger.info("Trimming audio to %.0fs for transcription.", max_sec)

                if self.whisper_impl == 'faster':
                    # Greedy decoding (beam_size=1) and language='en' yields ~2-3x faster CPU execution
                    transcribe_opts = {'beam_size': 1}
                    if language and language.startswith('en'):
                        transcribe_opts['language'] = 'en'
                    seg_iter, _info = self.whisper_model.transcribe(whisper_input, **transcribe_opts)
                    raw_segments = [
                        {'text': s.text, 'no_speech_prob': float(getattr(s, 'no_speech_prob', 0.0) or 0.0)}
                        for s in seg_iter
                    ]
                    fallback_text = ''
                else:  # 'openai'
                    res = self.whisper_model.transcribe(whisper_input)
                    raw_segments = [
                        {'text': s.get('text', ''), 'no_speech_prob': float(s.get('no_speech_prob', 0.0) or 0.0)}
                        for s in (res.get('segments') or [])
                    ]
                    fallback_text = res.get('text', '')

                # Drop segments Whisper itself flagged as probable silence —
                # their text is hallucination, not the patient's speech.
                kept = [s for s in raw_segments if s['no_speech_prob'] < 0.6]
                if raw_segments and not kept:
                    result.update({
                        'text': '',
                        'method': f'whisper_{self.model_size}',
                        'error': 'No clear speech detected in the recording.',
                        'acoustic_features': (self._extract_acoustic_from(y, sr_rate)
                                              if y is not None
                                              else self._extract_acoustic_biomarkers(audio_path)),
                    })
                    return result
                text = (''.join(s['text'] for s in kept) if kept else fallback_text).strip()

                words = text.split()
                linguistic = self._extract_linguistic_biomarkers(text, words)
                acoustic = (self._extract_acoustic_from(y, sr_rate)
                            if y is not None
                            else self._extract_acoustic_biomarkers(audio_path))

                return {
                    'text': text,
                    'method': f'whisper_{self.model_size}',
                    'error': None,
                    'acoustic_features': acoustic,
                    'linguistic_biomarkers': linguistic,
                }
            except Exception as e:
                logger.error("Whisper transcription error: %s", e)
            finally:
                if converted_path:
                    try:
                        os.remove(converted_path)
                    except OSError:
                        pass

        if self.whisper_model is None and self._init_error is not None:
            # Libraries installed, model load failed — report the real cause
            # (e.g. unwritable HF cache) instead of "install faster-whisper".
            result['error'] = (
                'Speech-to-text backend is installed but failed to initialize: '
                f'{self._init_error}'
            )
            result['method'] = 'unavailable'
            return result

        result['error'] = (
            'No local speech-to-text backend available. Install faster-whisper '
            '(pip install faster-whisper) to enable transcription.'
        )
        result['method'] = 'unavailable'
        return result

    def _extract_linguistic_biomarkers(self, text: str, words: list) -> dict:
        """Extract simple transcript statistics; these are not clinical biomarkers."""
        if not words:
            return {}

        # Type-Token Ratio (TTR): vocabulary richness (lower = more repetitive = AD marker)
        unique_words = set(w.lower().strip('.,!?;:') for w in words)
        ttr = round(len(unique_words) / max(len(words), 1), 3)

        # Hesitation & filler words (single set used for counting and tagging).
        # Single-word entries match per-token; '...' is counted separately.
        fillers = {
            # English
            'um', 'uh', 'er', 'ah', 'like', 'hmm',
            # Hindi (हिंदी)
            'मतलब', 'यार', 'अं', 'अह', 'वो', 'हा', 'हम्म',
            # Marathi (मराठी)
            'म्हणजे', 'ते', 'हाच', 'बरं',
        }
        filler_count = sum(1 for w in words if w.lower().strip('.,!?;:') in fillers) + text.count('...')

        # Multilingual Pronouns (English, Hindi, Marathi)
        pronouns = {
            # English
            'i', 'he', 'she', 'it', 'they', 'we', 'this', 'that', 'these', 'those', 'something', 'anything', 'stuff',
            # Hindi (हिंदी)
            'यह', 'वह', 'ये', 'वे', 'उसने', 'इन्होंने', 'कुछ', 'क्या',
            # Marathi (मराठी)
            'हा', 'ही', 'हे', 'तो', 'ती', 'ते', 'त्यांनी', 'काही'
        }
        noun_proxies = [w for w in words if len(w) > 4 and w.lower().strip('.,!?;:') not in pronouns]
        pronoun_count = sum(1 for w in words if w.lower().strip('.,!?;:') in pronouns)
        pronoun_noun_ratio = round(pronoun_count / max(len(noun_proxies), 1), 3)

        # Average Sentence Length (shorter sentences = potential agrammatism)
        sentences = [s.strip() for s in text.replace('!', '.').replace('?', '.').split('.') if s.strip()]
        avg_sentence_length = round(len(words) / max(len(sentences), 1), 1)

        # Syntactic Complexity: clauses per sentence (approximated by conjunction/subordinator count)
        clause_markers = {'and', 'but', 'because', 'when', 'while', 'although', 'however', 'which', 'that', 'so', 'if'}
        clause_count = sum(1 for w in words if w.lower().strip('.,!?;:') in clause_markers)
        syntactic_complexity = round(clause_count / max(len(sentences), 1), 2)

        # Lexical density is a transcript statistic, not semantic coherence.
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'it', 'in', 'on', 'at', 'to', 'of', 'and', 'or'}
        content_words = [w for w in words if w.lower().strip('.,!?;:') not in stopwords and len(w) > 2]
        lexical_density = round(len(content_words) / max(len(words), 1), 3)

        # Annotate tokens for interactive frontend rendering
        annotated_tokens = []
        for word in words:
            clean_word = word.lower().strip('.,!?;:')
            tag = 'normal'
            if clean_word in fillers:
                tag = 'filler'
            elif clean_word in pronouns:
                tag = 'pronoun'
            elif '...' in word or clean_word == 'pause':
                tag = 'pause'
            annotated_tokens.append({'word': word, 'tag': tag})

        return {
            'type_token_ratio': ttr,
            'pronoun_noun_ratio': pronoun_noun_ratio,
            'avg_sentence_length_words': avg_sentence_length,
            'syntactic_complexity': syntactic_complexity,
            'lexical_density': lexical_density,
            'filler_word_count': filler_count,
            'total_words': len(words),
            'unique_words': len(unique_words),
            'sentence_count': len(sentences),
            'annotated_tokens': annotated_tokens,
            'interpretation': {
                'ttr_risk': 'High' if ttr < 0.42 else 'Low',
                'pronoun_risk': 'High' if pronoun_noun_ratio > 0.75 else 'Normal',
                'speech_tempo': 'Sluggish / Hesitant' if filler_count > 4 else 'Fluid',
            }
        }



