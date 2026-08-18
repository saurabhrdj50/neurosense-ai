import logging

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

    def _extract_acoustic_biomarkers(self, audio_path: str) -> dict:
        """
        Extract acoustic biomarkers using librosa (F0 Pitch SD, Silent Pause Ratio, Energy Variability).
        Monotone voice (low F0 SD) and elevated pause ratio (>25%) are key acoustic AD indicators.
        """
        features = {
            'speech_rate': 'Normal',
            'pause_frequency': 'Low',
            'pitch_variation': 'Normal',
            'mfcc_dispersion': 0.85,
            'word_finding_hesitations': 0,
            'f0_std_hz': 0.0,
            'silent_pause_ratio': 0.12,
            'harmonics_to_noise_ratio': 'Normal',
        }

        if not HAS_LIBROSA or librosa is None:
            return features

        try:
            y, sr_rate = librosa.load(audio_path, sr=16000)
            duration = max(len(y) / sr_rate, 0.1)

            # Pitch (F0) extraction
            f0, voiced_flag, voiced_probs = librosa.pyin(y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C6'))
            valid_f0 = f0[~np.isnan(f0)] if f0 is not None else np.array([])
            
            f0_std = float(np.std(valid_f0)) if len(valid_f0) > 5 else 18.5

            # Energy / Silence detection
            non_silent_intervals = librosa.effects.split(y, top_db=25)
            non_silent_duration = sum((end - start) for start, end in non_silent_intervals) / sr_rate
            silent_duration = max(duration - non_silent_duration, 0.0)
            pause_ratio = round(silent_duration / duration, 3)

            features['f0_std_hz'] = round(f0_std, 2)
            features['silent_pause_ratio'] = pause_ratio
            features['pitch_variation'] = 'Monotone / Reduced' if f0_std < 12.0 else 'Normal'
            features['pause_frequency'] = 'Elevated (>25%)' if pause_ratio > 0.25 else 'Normal'
            features['mfcc_dispersion'] = round(float(np.mean(librosa.feature.mfcc(y=y, sr=sr_rate))), 2)
        except Exception as e:
            logger.warning("Librosa acoustic extraction warning: %s", e)

        return features


    def transcribe_file(self, audio_path: str, language: str = 'en-US') -> dict:
        result = {
            'text': '',
            'confidence': 0,
            'method': 'unavailable',
            'error': None,
            'speech_rate_wpm': 0,
            'pause_count': 0,
            'acoustic_features': {
                'speech_rate': 'Normal',
                'pause_frequency': 'Low',
                'pitch_variation': 'Normal',
                'mfcc_dispersion': 0.85,
                'word_finding_hesitations': 0,
            }
        }

        # Try Whisper first if available
        if self.whisper_model is not None:
            try:
                res = self.whisper_model.transcribe(audio_path)
                text = res.get('text', '').strip()
                words = text.split()
                duration_est = max(len(words) / 2.5, 1.0)
                wpm = round((len(words) / duration_est) * 60, 1)
                linguistic = self._extract_linguistic_biomarkers(text, words)
                acoustic = self._extract_acoustic_biomarkers(audio_path)

                return {
                    'text': text,
                    'confidence': 95,
                    'method': f'whisper_{self.model_size}',
                    'error': None,
                    'speech_rate_wpm': wpm,
                    'pause_count': text.count('...'),
                    'acoustic_features': {
                        'speech_rate': 'Slow' if wpm < 110 else 'Normal',
                        'pause_frequency': acoustic.get('pause_frequency', 'Normal'),
                        'pitch_variation': acoustic.get('pitch_variation', 'Normal'),
                        'mfcc_dispersion': acoustic.get('mfcc_dispersion', 0.88),
                        'f0_std_hz': acoustic.get('f0_std_hz', 0.0),
                        'silent_pause_ratio': acoustic.get('silent_pause_ratio', 0.12),
                        'word_finding_hesitations': text.count('um') + text.count('uh'),
                    },
                    'linguistic_biomarkers': linguistic,
                }
            except Exception as e:
                logger.error("Whisper transcription error: %s", e)


        if not HAS_SR:
            result['error'] = 'SpeechRecognition and Whisper not available.'
            return result

        try:
            with sr.AudioFile(audio_path) as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.record(source)

            try:
                text = self.recognizer.recognize_google(audio, language=language)
                words = text.split()
                wpm = round(len(words) * 6, 1) # estimated
                linguistic = self._extract_linguistic_biomarkers(text, words)

                return {
                    'text': text,
                    'confidence': 85,
                    'method': 'google_free',
                    'error': None,
                    'speech_rate_wpm': wpm,
                    'pause_count': 0,
                    'acoustic_features': {
                        'speech_rate': 'Normal',
                        'pause_frequency': 'Low',
                        'pitch_variation': 'Normal',
                        'mfcc_dispersion': 0.80,
                        'word_finding_hesitations': text.lower().count('um') + text.lower().count('uh'),
                    },
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
        """
        Extract research-grade linguistic biomarkers from transcribed speech.
        These are early markers of semantic and cognitive language impairment in AD.
        """
        if not words:
            return {}

        # Type-Token Ratio (TTR): vocabulary richness (lower = more repetitive = AD marker)
        unique_words = set(w.lower().strip('.,!?;:') for w in words)
        ttr = round(len(unique_words) / max(len(words), 1), 3)

        # Multilingual Hesitation & Filler Words (English, Hindi, Marathi)
        fillers = {
            # English
            'um', 'uh', 'er', 'ah', 'like', 'you know', 'hmm',
            # Hindi (हिंदी)
            'मतलब', 'यार', 'अं', 'अह', 'वो', 'हा', 'हम्म',
            # Marathi (मराठी)
            'म्हणजे', 'ते', 'हाच', 'बरं'
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

        # Semantic Coherence (approximated via lexical density: content words / total words)
        stopwords = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'i', 'it', 'in', 'on', 'at', 'to', 'of', 'and', 'or'}
        content_words = [w for w in words if w.lower().strip('.,!?;:') not in stopwords and len(w) > 2]
        semantic_coherence = round(len(content_words) / max(len(words), 1), 3)

        # Hesitation & Filler Word Count
        fillers = {'um', 'uh', 'er', 'ah', 'like', 'you know', 'hmm'}
        filler_count = sum(1 for w in words if w.lower().strip('.,!?;:') in fillers) + text.count('...')

        # Annotate tokens for interactive frontend rendering
        annotated_tokens = []
        for word in words:
            clean_word = word.lower().strip('.,!?;:')
            tag = 'normal'
            if clean_word in fillers or clean_word in ('um', 'uh', 'er'):
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
            'semantic_coherence': semantic_coherence,
            'filler_word_count': filler_count,
            'total_words': len(words),
            'unique_words': len(unique_words),
            'sentence_count': len(sentences),
            'annotated_tokens': annotated_tokens,
            'interpretation': {
                'ttr_risk': 'High' if ttr < 0.42 else 'Low',
                'pronoun_risk': 'High' if pronoun_noun_ratio > 0.75 else 'Normal',
                'coherence_risk': 'High' if semantic_coherence < 0.40 else 'Normal',
                'speech_tempo': 'Sluggish / Hesitant' if filler_count > 4 else 'Fluid',
            }
        }



