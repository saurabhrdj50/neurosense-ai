import logging
import os

logger = logging.getLogger(__name__)

try:
    import speech_recognition as sr
    HAS_SR = True
except ImportError:
    HAS_SR = False
    logger.warning("SpeechRecognition not installed.")


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


class SpeechTranscriber:
    """
    Research-grade Speech Analysis Module using OpenAI Whisper.
    Extracts transcript, speech rate, pause frequency, pitch variation, and acoustic biomarkers.
    """
    def __init__(self, model_size: str = None) -> None:
        self.whisper_model = None
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

        if HAS_WHISPER and whisper is not None:
            try:
                self.whisper_model = whisper.load_model(model_size)
                logger.info("OpenAI Whisper (%s) initialized.", model_size)
            except Exception as e:
                logger.warning("Could not load Whisper model '%s': %s", model_size, e)

        if HAS_SR:
            self.recognizer = sr.Recognizer()
            logger.info("SpeechRecognition loaded fallback.")
        else:
            self.recognizer = None

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
        """Extract raw acoustic summaries from an already-decoded signal."""
        features = {}
        if not HAS_LIBROSA or librosa is None or y is None or sr_rate is None:
            return features
        try:
            duration = max(len(y) / sr_rate, 0.1)

            # Pitch (F0) extraction
            f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C6'))
            valid_f0 = f0[~np.isnan(f0)] if f0 is not None else np.array([])

            if len(valid_f0) > 5:
                f0_std = float(np.std(valid_f0))
                features['f0_std_hz'] = round(f0_std, 2)
                features['mean_f0_hz'] = round(float(np.mean(valid_f0)), 2)
                features['pitch_variation'] = 'Reduced' if f0_std < 12.0 else 'Not reduced'

            # Energy / Silence detection
            non_silent_intervals = librosa.effects.split(y, top_db=25)
            non_silent_duration = sum((end - start) for start, end in non_silent_intervals) / sr_rate
            silent_duration = max(duration - non_silent_duration, 0.0)
            pause_ratio = round(silent_duration / duration, 3)

            features['silent_pause_ratio'] = float(pause_ratio)
            features['pause_frequency'] = 'Elevated' if pause_ratio > 0.25 else 'Not elevated'
            features['mfcc_mean'] = round(float(np.mean(librosa.feature.mfcc(y=y, sr=sr_rate))), 2)
        except Exception as e:
            logger.warning("Librosa acoustic extraction warning: %s", e)
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


    def transcribe_file(self, audio_path: str, language: str = 'en-US') -> dict:
        result = {
            'text': '',
            'method': 'unavailable',
            'error': None,
            'acoustic_features': {},
            'linguistic_biomarkers': {},
        }

        # Try Whisper first if available
        if self.whisper_model is not None:
            y = None
            sr_rate = None
            converted_path = None
            try:
                # Decode once up front: it powers the speech-presence gate,
                # the duration cap, and the acoustic features.
                if HAS_LIBROSA and librosa is not None:
                    try:
                        y, sr_rate, converted_path = self._try_load_audio(audio_path)
                    except Exception as e:
                        logger.warning("Audio decode failed before transcription: %s", e)

                if y is not None and self._voiced_ratio(y, sr_rate) < 0.02:
                    # Whisper hallucinates fluent text ("…") on silence — a
                    # fabricated transcript on a clinical report is worse than
                    # no transcript. Fail loudly instead.
                    result.update({
                        'text': '',
                        'method': f'whisper_{self.model_size}',
                        'error': 'No speech detected in the recording.',
                        'acoustic_features': self._extract_acoustic_from(y, sr_rate),
                    })
                    return result

                # Whisper accepts a 16 kHz float array; cap duration so a long
                # recording cannot monopolize a CPU worker past the timeout.
                whisper_input = audio_path
                if y is not None:
                    try:
                        max_sec = float(os.environ.get('WHISPER_MAX_AUDIO_SEC', '120') or 120)
                    except ValueError:
                        max_sec = 120.0
                    if len(y) > max_sec * sr_rate:
                        whisper_input = y[:int(max_sec * sr_rate)]
                        logger.info("Trimming audio to %.0fs for transcription.", max_sec)

                res = self.whisper_model.transcribe(whisper_input)
                # Drop segments Whisper itself flagged as probable silence —
                # their text is hallucination, not the patient's speech.
                segments = res.get('segments') or []
                kept = [s for s in segments
                        if float(s.get('no_speech_prob', 0.0)) < 0.6]
                if segments and not kept:
                    result.update({
                        'text': '',
                        'method': f'whisper_{self.model_size}',
                        'error': 'No clear speech detected in the recording.',
                        'acoustic_features': (self._extract_acoustic_from(y, sr_rate)
                                              if y is not None
                                              else self._extract_acoustic_biomarkers(audio_path)),
                    })
                    return result
                text = (''.join(s.get('text', '') for s in kept) if kept
                        else res.get('text', '')).strip()

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


        if not HAS_SR:
            result['error'] = 'SpeechRecognition and Whisper not available.'
            return result

        # The Google free web API receives raw patient audio (PHI) with no
        # consent gate and no BAA — it must be an explicit operator opt-in,
        # never a silent fallback. sr.AudioFile also only decodes
        # WAV/AIFF/FLAC, so this path fails for mp3/webm/ogg anyway.
        from app.config.settings import Config
        if not Config.ENABLE_GOOGLE_SPEECH_FALLBACK:
            result['error'] = (
                'Local Whisper transcription unavailable. Set '
                'ENABLE_GOOGLE_SPEECH_FALLBACK=true to allow the third-party '
                'speech service (requires patient consent).'
            )
            result['method'] = 'unavailable'
            return result

        try:
            with sr.AudioFile(audio_path) as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.record(source)

            try:
                text = self.recognizer.recognize_google(audio, language=language)
                words = text.split()
                linguistic = self._extract_linguistic_biomarkers(text, words)
                acoustic = self._extract_acoustic_biomarkers(audio_path)

                return {
                    'text': text,
                    'method': 'google_free',
                    'error': None,
                    'acoustic_features': acoustic,
                    'linguistic_biomarkers': linguistic,
                }
            except sr.UnknownValueError:
                result['error'] = 'Could not understand the audio.'
                result['method'] = 'google_free'
                return result
            except sr.RequestError as e:
                result['error'] = f'Speech recognition service unavailable: {e}'
                result['method'] = 'google_free'
                return result

        except Exception as e:
            result['error'] = f'Audio processing error: {str(e)}'
            result['method'] = 'error'
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



