from typing import Dict, Any
from app.modules.recommendation.music import MusicRecommender


class MusicRecommendationService:
    """Wraps the music recommender for service layer access."""

    def __init__(self):
        recommender = MusicRecommender()
        self.recommend = recommender.recommend
