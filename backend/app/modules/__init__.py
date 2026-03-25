def __getattr__(name):
    if name == 'MRIClassifier':
        from .mri import MRIClassifier
        return MRIClassifier
    elif name == 'AlzheimerModel':
        from .mri import AlzheimerModel
        return AlzheimerModel
    elif name == 'STAGES':
        from .mri import STAGES
        return STAGES
    elif name == 'StageMapper':
        from .mri import StageMapper
        return StageMapper
    elif name == 'SentimentAnalyzer':
        from .nlp import SentimentAnalyzer
        return SentimentAnalyzer
    elif name == 'MarkerDetector':
        from .nlp import MarkerDetector
        return MarkerDetector
    elif name == 'CognitiveEvaluator':
        from .cognitive import CognitiveEvaluator
        return CognitiveEvaluator
    elif name == 'RiskProfiler':
        from .risk import RiskProfiler
        return RiskProfiler
    elif name == 'HandwritingAnalyzer':
        from .vision import HandwritingAnalyzer
        return HandwritingAnalyzer
    elif name == 'FacialEmotionAnalyzer':
        from .vision import FacialEmotionAnalyzer
        return FacialEmotionAnalyzer
    elif name == 'GenomicSequencer':
        from .genomics import GenomicSequencer
        return GenomicSequencer
    elif name == 'SpeechTranscriber':
        from .speech import SpeechTranscriber
        return SpeechTranscriber
    elif name == 'MultimodalFusion':
        from .fusion import MultimodalFusion
        return MultimodalFusion
    elif name == 'MusicRecommender':
        from .recommendation import MusicRecommender
        return MusicRecommender
    elif name == 'MedicalChatbot':
        from .recommendation import MedicalChatbot
        return MedicalChatbot
    raise AttributeError(f"module 'modules' has no attribute '{name}'")

__all__ = [
    'MRIClassifier',
    'AlzheimerModel',
    'STAGES',
    'StageMapper',
    'SentimentAnalyzer',
    'MarkerDetector',
    'CognitiveEvaluator',
    'RiskProfiler',
    'HandwritingAnalyzer',
    'FacialEmotionAnalyzer',
    'GenomicSequencer',
    'SpeechTranscriber',
    'MultimodalFusion',
    'MusicRecommender',
    'MedicalChatbot',
]
