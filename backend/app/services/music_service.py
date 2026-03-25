from typing import Dict, Any
from app.modules.recommendation.music import MusicRecommender


class MusicRecommendationService:
    """Wraps the music recommender for service layer access."""
    
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._recommender = MusicRecommender()
        return cls._instance
    
    def recommend(self, stage: str, emotion: str = 'neutral') -> Dict[str, Any]:
        return self._recommender.recommend(stage, emotion)
