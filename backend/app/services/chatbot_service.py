import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)


class MedicalChatbotService:
    """Wraps the chatbot for service layer access."""
    
    def __init__(self):
        self._chatbot = None
    
    def _get_chatbot(self):
        if self._chatbot is None:
            from app.modules.recommendation.chatbot import MedicalChatbot
            self._chatbot = MedicalChatbot()
        return self._chatbot
    
    def ask(
        self,
        query: str,
        patient_history: List[Dict[str, Any]],
        api_key: Optional[str] = None,
        provider: str = 'gemini'
    ) -> str:
        return self._get_chatbot().ask(
            query=query,
            patient_history=patient_history,
            api_key=api_key,
            provider=provider,
        )
