"""
Music Therapy Recommendation Module
Recommends personalised music therapy based on Alzheimer's stage
and the patient's current emotional state.

Research basis:
- Music therapy improves mood, reduces agitation, and supports
  memory recall in Alzheimer's patients (Thaut et al., 2015).
- Familiar music activates autobiographical memory networks
  preserved longer than other memory systems.
"""


# ── Therapy catalogue ─────────────────────────────────────────────────────────
# Each entry: {type, title, description, tempo, benefits, examples}
THERAPY_CATALOGUE = {

    # ── Non-Demented ──────────────────────────────────────────────────────────
    'Non-Demented': {
        'neutral': {
            'therapy_type': 'Cognitive Stimulation Music',
            'title': 'Active Listening Program',
            'description': (
                'Engaging classical or jazz pieces designed to stimulate '
                'cognitive activity and maintain mental sharpness.'
            ),
            'tempo': 'Moderate (80–100 BPM)',
            'session_duration': '30 minutes, daily',
            'benefits': [
                'Maintains cognitive engagement',
                'Supports neural pathway reinforcement',
                'Promotes emotional well-being',
            ],
            'examples': [
                'Mozart — Piano Sonata No. 16',
                'Bach — Goldberg Variations',
                'Miles Davis — Kind of Blue',
                'Vivaldi — The Four Seasons',
            ],
            'color': '#22c55e',
            'icon': '🎵',
        },
        'joy': {
            'therapy_type': 'Celebratory Music Engagement',
            'title': 'Uplifting Melodies Session',
            'description': 'Joyful, upbeat music to reinforce positive emotional states.',
            'tempo': 'Upbeat (100–120 BPM)',
            'session_duration': '20–30 minutes',
            'benefits': ['Reinforces positive mood', 'Encourages social engagement'],
            'examples': [
                'Louis Armstrong — What a Wonderful World',
                'Ella Fitzgerald — Summertime',
                'The Beatles — Here Comes the Sun',
            ],
            'color': '#22c55e', 'icon': '🌟',
        },
    },

    # ── Very Mild Demented ────────────────────────────────────────────────────
    'Very Mild Demented': {
        'neutral': {
            'therapy_type': 'Memory Recall Music Therapy',
            'title': 'Reminiscence Music Session',
            'description': (
                'Familiar songs from the patient\'s formative years (teens–30s) '
                'to activate autobiographical memory networks.'
            ),
            'tempo': 'Gentle to moderate (60–90 BPM)',
            'session_duration': '20–30 minutes, 3–4× per week',
            'benefits': [
                'Stimulates autobiographical memory recall',
                'Reduces early anxiety and confusion',
                'Encourages verbal communication',
            ],
            'examples': [
                'Classic Bollywood songs from 1970s–1990s',
                'Old Hindi film songs (Lata Mangeshkar, Kishore Kumar)',
                'Familiar devotional or folk music',
                'Patient\'s favourite songs from youth',
            ],
            'color': '#eab308', 'icon': '🎶',
        },
        'anxiety': {
            'therapy_type': 'Calming Music Therapy',
            'title': 'Relaxation & Grounding Session',
            'description': 'Slow, soothing music to reduce anxiety and promote calm.',
            'tempo': 'Slow (50–70 BPM)',
            'session_duration': '20 minutes, as needed',
            'benefits': ['Reduces anxiety', 'Lowers cortisol levels', 'Promotes sleep'],
            'examples': [
                'Raga Bhairavi (morning calm)',
                'Soft classical sitar compositions',
                'Brian Eno — Ambient 1: Music for Airports',
            ],
            'color': '#eab308', 'icon': '🕊️',
        },
        'sadness': {
            'therapy_type': 'Mood Elevation Music',
            'title': 'Gentle Uplift Session',
            'description': 'Start with validating gentle music, gradually moving to uplifting pieces.',
            'tempo': 'Slow to moderate (60–90 BPM)',
            'session_duration': '25 minutes',
            'benefits': ['Validates emotions', 'Gently elevates mood', 'Reduces isolation'],
            'examples': [
                'Ravi Shankar — Morning Raga',
                'Yanni — In the Mirror',
                'Asha Bhosle — soft classical selections',
            ],
            'color': '#eab308', 'icon': '🌸',
        },
    },

    # ── Mild Demented ─────────────────────────────────────────────────────────
    'Mild Demented': {
        'neutral': {
            'therapy_type': 'Structured Music Therapy',
            'title': 'Daily Rhythm & Memory Program',
            'description': (
                'Structured sessions combining rhythm activities and familiar songs '
                'to support daily routine and reduce confusion.'
            ),
            'tempo': 'Slow to gentle (55–80 BPM)',
            'session_duration': '20–25 minutes, daily',
            'benefits': [
                'Improves daily routine adherence',
                'Reduces agitation and wandering',
                'Maintains emotional connection',
                'Supports caregiver interaction',
            ],
            'examples': [
                'Instrumental versions of favourite childhood songs',
                'Simple rhythmic folk music (tabla, dholak)',
                'Soft devotional music (bhajans)',
                'Nature sounds with gentle melody overlay',
            ],
            'color': '#f97316', 'icon': '🎼',
        },
        'anger': {
            'therapy_type': 'De-escalation Music Therapy',
            'title': 'Calming Agitation Protocol',
            'description': 'Carefully selected slow music to de-escalate agitation safely.',
            'tempo': 'Very slow (40–60 BPM)',
            'session_duration': '15 minutes or until calm',
            'benefits': ['Reduces agitation', 'Prevents escalation', 'Calms nervous system'],
            'examples': [
                'Om chanting / Tibetan singing bowls',
                'Raga Yaman (evening raga, deeply calming)',
                'Soft piano instrumentals',
            ],
            'color': '#f97316', 'icon': '🌊',
        },
        'anxiety': {
            'therapy_type': 'Anxiety Reduction Protocol',
            'title': 'Grounding Music Session',
            'description': 'Repetitive, predictable musical patterns to provide emotional grounding.',
            'tempo': 'Slow (50–65 BPM)',
            'session_duration': '20 minutes',
            'benefits': ['Reduces anxiety', 'Creates sense of safety', 'Promotes present awareness'],
            'examples': [
                'Soft instrumental ragas',
                'Gentle harp music',
                'Flute-based classical compositions',
            ],
            'color': '#f97316', 'icon': '🎋',
        },
    },

    # ── Moderate Demented ─────────────────────────────────────────────────────
    'Moderate Demented': {
        'neutral': {
            'therapy_type': 'Passive Music Therapy',
            'title': 'Comfort & Familiarity Program',
            'description': (
                'Passive listening to highly familiar, emotionally significant music. '
                'Focus on comfort, presence, and non-verbal emotional connection.'
            ),
            'tempo': 'Slow and steady (50–70 BPM)',
            'session_duration': '15–20 minutes, multiple times daily',
            'benefits': [
                'Maintains emotional responsiveness',
                'Reduces agitation and restlessness',
                'Provides comfort and familiarity',
                'Supports caregiver bonding moments',
            ],
            'examples': [
                'Patient\'s most beloved songs from youth',
                'Religious / devotional music of patient\'s faith',
                'Lullabies and simple folk songs',
                'Instrumental renditions of familiar tunes',
            ],
            'color': '#ef4444', 'icon': '💝',
        },
        'anger': {
            'therapy_type': 'Crisis Calming Protocol',
            'title': 'Intensive De-escalation Session',
            'description': 'Very slow, repetitive, and familiar music for acute agitation management.',
            'tempo': 'Very slow (40–55 BPM)',
            'session_duration': '10–15 minutes, repeated as needed',
            'benefits': ['Manages acute agitation', 'Reduces physical distress', 'Supports caregiver safety'],
            'examples': [
                'Om chanting',
                'Simple percussion at very slow tempo',
                'Highly familiar religious hymns / bhajans',
            ],
            'color': '#ef4444', 'icon': '🏮',
        },
        'sadness': {
            'therapy_type': 'Emotional Presence Music',
            'title': 'Comfort & Connection Session',
            'description': 'Gentle, familiar, and comforting music to provide emotional presence.',
            'tempo': 'Slow (50–65 BPM)',
            'session_duration': '15–20 minutes',
            'benefits': ['Reduces emotional distress', 'Provides companionship', 'Supports dignity'],
            'examples': [
                'Soft devotional music',
                'Gentle instrumental lullabies',
                'Simple melodic patterns',
            ],
            'color': '#ef4444', 'icon': '🕯️',
        },
    },
}

# Fallback for unmapped stage/emotion combinations
DEFAULT_RECOMMENDATION = {
    'therapy_type': 'General Music Therapy',
    'title': 'Personalised Listening Session',
    'description': 'A curated playlist based on the patient\'s personal music history and current emotional state.',
    'tempo': 'Gentle (60–80 BPM)',
    'session_duration': '20 minutes',
    'benefits': [
        'Promotes emotional well-being',
        'Reduces stress and anxiety',
        'Encourages positive engagement',
    ],
    'examples': [
        'Personalised playlist of favourite songs',
        'Soft instrumental music',
        'Calming nature sounds with melody',
    ],
    'color': '#6366f1', 'icon': '🎵',
}

EMOTION_MAP = {
    'joy': 'joy', 'happy': 'joy', 'positive': 'joy',
    'sadness': 'sadness', 'sad': 'sadness', 'depression': 'sadness',
    'anxiety': 'anxiety', 'anxious': 'anxiety', 'fear': 'anxiety', 'worried': 'anxiety',
    'anger': 'anger', 'angry': 'anger', 'agitated': 'anger', 'frustrated': 'anger',
    'confusion': 'neutral', 'confused': 'neutral', 'neutral': 'neutral',
}


class MusicRecommender:
    """Returns a personalised music therapy recommendation."""

    def recommend(self, stage: str, emotion: str = 'neutral') -> dict:
        """
        Parameters
        ----------
        stage   : Alzheimer's stage name (e.g., 'Mild Demented')
        emotion : Dominant emotion from sentiment analysis

        Returns
        -------
        Full recommendation dict with therapy type, examples, benefits, etc.
        """
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
            'general_guidelines': self._general_guidelines(stage),
        }

    def _general_guidelines(self, stage: str) -> list:
        guidelines = [
            'Always play music at a comfortable, non-startling volume.',
            'Observe patient response — stop if distress increases.',
            'Avoid sudden changes in tempo or volume.',
        ]
        if stage in ('Moderate Demented',):
            guidelines += [
                'Use headphones only if patient tolerates them.',
                'Have caregiver present during all sessions.',
                'Keep sessions short (15–20 min) to avoid fatigue.',
            ]
        elif stage in ('Mild Demented',):
            guidelines += [
                'Encourage gentle movement (clapping, tapping) if comfortable.',
                'Use music to signal daily routines (wake-up song, mealtime music).',
            ]
        else:
            guidelines += [
                'Encourage active engagement — singing along is beneficial.',
                'Use music as a social activity with family when possible.',
            ]
        return guidelines
