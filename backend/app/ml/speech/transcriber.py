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
    Research-grade Speech Analysis Module using OpenAI Whisper Large-v3 / Turbo.
    Extracts transcript, speech rate, pause frequency, pitch variation, and acoustic biomarkers.
    """
    def __init__(self, model_size: str = 'turbo') -> None:
        self.whisper_model = None
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

    def _extract_acoustic_biomarkers(self, audio_path: str) -> dict:
        """Extract raw acoustic summaries when audio decoding and librosa succeed."""
        features = {}

        if not HAS_LIBROSA or librosa is None:
            return features

        converted_path = None
        try:
            y, sr_rate, converted_path = self._try_load_audio(audio_path)
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
        finally:
            if converted_path:
                try:
                    os.remove(converted_path)
                except OSError:
                    pass

        return features


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
            try:
                res = self.whisper_model.transcribe(audio_path)
                text = res.get('text', '').strip()
                words = text.split()
                linguistic = self._extract_linguistic_biomarkers(text, words)
                acoustic = self._extract_acoustic_biomarkers(audio_path)

                return {
                    'text': text,
                    'method': f'whisper_{self.model_size}',
                    'error': None,
                    'acoustic_features': acoustic,
                    'linguistic_biomarkers': linguistic,
                }
            except Exception as e:
                logger.error("Whisper transcription error: %s", e)


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



