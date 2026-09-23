THERAPY_CATALOGUE = {
    'Non-Demented': {
        'neutral': {
            'therapy_type': 'Cognitive Stimulation Music',
            'title': 'Active Listening Program',
            'description': 'Engaging classical pieces for cognitive stimulation.',
            'tempo': 'Moderate (80–100 BPM)',
            'session_duration': '30 minutes, daily',
            'color': '#22c55e',
        },
    },
    'Very Mild Demented': {
        'neutral': {
            'therapy_type': 'Memory Recall Music Therapy',
            'title': 'Reminiscence Music Session',
            'description': 'Familiar songs from formative years for autobiographical memory.',
            'tempo': 'Gentle to moderate (60–90 BPM)',
            'session_duration': '20–30 minutes, 3–4× per week',
            'color': '#eab308',
        },
        'anxiety': {
            'therapy_type': 'Calming Music Therapy',
            'title': 'Relaxation & Grounding Session',
            'description': 'Slow, soothing music to reduce anxiety.',
            'tempo': 'Slow (50–70 BPM)',
            'session_duration': '20 minutes, as needed',
            'color': '#eab308',
        },
    },
    'Mild Demented': {
        'neutral': {
            'therapy_type': 'Structured Music Therapy',
            'title': 'Daily Rhythm & Memory Program',
            'description': 'Structured sessions combining rhythm and familiar songs.',
            'tempo': 'Slow to gentle (55–80 BPM)',
            'session_duration': '20–25 minutes, daily',
            'color': '#f97316',
        },
        'anger': {
            'therapy_type': 'De-escalation Music Therapy',
            'title': 'Calming Agitation Protocol',
            'description': 'Selected slow music to de-escalate agitation.',
            'tempo': 'Very slow (40–60 BPM)',
            'session_duration': '15 minutes or until calm',
            'color': '#f97316',
        },
    },
    'Moderate Demented': {
        'neutral': {
            'therapy_type': 'Passive Music Therapy',
            'title': 'Comfort & Familiarity Program',
            'description': 'Passive listening to highly familiar, emotionally significant music.',
            'tempo': 'Slow and steady (50–70 BPM)',
            'session_duration': '15–20 minutes, multiple times daily',
            'color': '#ef4444',
        },
    },
}

DEFAULT_RECOMMENDATION = {
    'therapy_type': 'General Music Therapy',
    'title': 'Personalised Listening Session',
    'description': 'Curated playlist based on patient history.',
    'tempo': 'Gentle (60–80 BPM)',
    'session_duration': '20 minutes',
    'color': '#6366f1',
}

EMOTION_MAP = {
    'joy': 'joy', 'happy': 'joy', 'positive': 'joy',
    'sadness': 'sadness', 'sad': 'sadness',
    'anxiety': 'anxiety', 'anxious': 'anxiety', 'fear': 'anxiety',
    'anger': 'anger', 'angry': 'anger', 'agitated': 'anger',
    'confusion': 'neutral', 'neutral': 'neutral',
}


class MusicRecommender:
    def recommend(self, stage: str, emotion: str = 'neutral') -> dict:
        mapped_emotion = EMOTION_MAP.get(emotion.lower(), 'neutral')

        stage_catalogue = THERAPY_CATALOGUE.get(stage, {})
        rec = (
            stage_catalogue.get(mapped_emotion)
            or stage_catalogue.get('neutral')
            or DEFAULT_RECOMMENDATION
        )

        return {
            **rec,
            'stage': stage,
            'emotion_context': emotion,
        }
