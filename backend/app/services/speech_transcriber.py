"""
Speech Transcriber Module
Handles audio-to-text conversion for speech analysis.

Primary: Browser Web Speech API (handled client-side, no server cost)
Fallback: Python SpeechRecognition library with Google free tier

The transcribed text feeds into the existing SentimentAnalyzer.
"""

import os
import logging
import tempfile

logger = logging.getLogger(__name__)

try:
    import speech_recognition as sr
    HAS_SR = True
except ImportError:
    HAS_SR = False
    logger.warning("SpeechRecognition not installed — server-side transcription disabled.")


class SpeechTranscriber:
    """
    Server-side audio transcription fallback.
    Primary transcription happens client-side via Web Speech API.
    """

    def __init__(self):
        if HAS_SR:
            self.recognizer = sr.Recognizer()
            logger.info("SpeechRecognition loaded (Google free tier).")
        else:
            self.recognizer = None

    def transcribe_file(self, audio_path: str, language: str = 'en-US') -> dict:
        """
        Transcribe an audio file to text.

        Parameters
        ----------
        audio_path : str — path to audio file (.wav, .mp3, .flac, .webm)
        language : str — BCP-47 language code

        Returns
        -------
        dict with 'text', 'confidence', 'method', 'error'
        """
        if not HAS_SR:
            return {
                'text': '',
                'confidence': 0,
                'method': 'unavailable',
                'error': 'SpeechRecognition not installed. Use browser Web Speech API instead.',
            }

        try:
            with sr.AudioFile(audio_path) as source:
                self.recognizer.adjust_for_ambient_noise(source, duration=0.5)
                audio = self.recognizer.record(source)

            # Try Google free tier first
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
                    'error': 'Could not understand the audio. Please speak clearly and try again.',
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
