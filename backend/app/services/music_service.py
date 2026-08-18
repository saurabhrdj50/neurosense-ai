from typing import Dict, Any
from app.modules.recommendation.music import MusicRecommender


class MusicRecommendationService:
    """Wraps the music recommender for service layer access."""
    
    def __init__(self):
        recommender = MusicRecommender()
        self.recommend = recommender.recommend
    
    def get_recommendation(self, stage: str, emotion: str = 'neutral') -> Dict[str, Any]:
        return self.recommend(stage, emotion)


_music_service = MusicRecommendationService()


def get_music_service() -> MusicRecommendationService:
    """Get singleton music service instance."""
    return _music_service
