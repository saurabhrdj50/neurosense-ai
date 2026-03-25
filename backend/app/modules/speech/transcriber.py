import logging

logger = logging.getLogger(__name__)

try:
    import speech_recognition as sr
    HAS_SR = True
except ImportError:
    HAS_SR = False
    logger.warning("SpeechRecognition not installed.")


class SpeechTranscriber:
    def __init__(self):
        if HAS_SR:
            self.recognizer = sr.Recognizer()
            logger.info("SpeechRecognition loaded.")
        else:
            self.recognizer = None

    def transcribe_file(self, audio_path: str, language: str = 'en-US') -> dict:
        if not HAS_SR:
            return {
                'text': '',
                'confidence': 0,
                'method': 'unavailable',
                'error': 'SpeechRecognition not installed.',
            }

        try:
            with sr.AudioFile(audio_path) as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.record(source)

            try:
                text = self.recognizer.recognize_google(audio, language=language)
                return {
                    'text': text,
                    'confidence': 85,
                    'method': 'google_free',
                    'error': None,
                }
            except sr.UnknownValueError:
                return {
                    'text': '',
                    'confidence': 0,
                    'method': 'google_free',
                    'error': 'Could not understand the audio.',
                }
            except sr.RequestError as e:
                return {
                    'text': '',
                    'confidence': 0,
                    'method': 'google_free',
                    'error': f'Speech recognition service unavailable: {e}',
                }

        except Exception as e:
            return {
                'text': '',
                'confidence': 0,
                'method': 'error',
                'error': f'Audio processing error: {str(e)}',
            }
