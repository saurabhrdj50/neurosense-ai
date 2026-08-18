from typing import Dict, List


COGNITIVE_MARKERS: Dict[str, List[str]] = {
    'memory_loss': [
        "forgot", "can't remember", "don't remember", "i forget",
        "lost my", "where did i put", "what was i saying",
        "i don't know", "confused", "lost", "misplace",
    ],
    'repetition': [
        "i already said", "as i mentioned", "like i said",
        "i told you", "i keep saying",
    ],
    'disorientation': [
        "don't know where", "where am i", "what day", "what time",
        "who are you", "don't recognise", "strange place",
    ],
    'word_finding': [
        "what's the word", "i can't think of", "the thing",
        "you know what i mean", "whatchamacallit", "thingamajig",
    ],
    'emotional_distress': [
        "scared", "frightened", "worried", "anxious", "depressed",
        "sad", "hopeless", "helpless", "frustrated", "angry", "upset",
        "crying", "tears", "lonely", "alone",
    ],
    'positive_affect': [
        "happy", "good", "great", "wonderful", "fine", "okay",
        "better", "improving", "hopeful", "grateful", "thankful",
        "love", "enjoy", "glad", "pleased",
    ],
}


EMOTION_LABELS: Dict[str, List[str]] = {
    'joy': ['happy', 'joy', 'excited', 'pleased', 'delighted', 'glad', 'wonderful'],
    'sadness': ['sad', 'unhappy', 'depressed', 'miserable', 'hopeless', 'crying', 'tears'],
    'anxiety': ['worried', 'anxious', 'nervous', 'scared', 'frightened', 'fear', 'panic'],
    'anger': ['angry', 'frustrated', 'irritated', 'annoyed', 'furious', 'mad'],
    'confusion': ['confused', 'lost', "don't know", 'unsure', 'uncertain', 'puzzled'],
    'neutral': [],
}


class MarkerDetector:
    @staticmethod
    def detect(text: str) -> Dict[str, List[str]]:
        lower = text.lower()
        found: Dict[str, List[str]] = {}
        for category, keywords in COGNITIVE_MARKERS.items():
            matches = [kw for kw in keywords if kw in lower]
            if matches:
                found[category] = matches
        return found

    @staticmethod
    def count(found_markers: Dict[str, List[str]]) -> int:
        return sum(len(v) for v in found_markers.values())
