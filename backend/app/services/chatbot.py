"""
AI Medical Assistant (Chatbot) Module
Uses Retrieval-Augmented Generation (RAG) to answer questions about a patient's history.
Supports Google Gemini and Groq via API.
"""

import os
import json
from typing import Optional, List, Dict, Any

try:
    from google import genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    genai = None  # type: ignore[assignment]

import requests


class MedicalChatbot:
    def __init__(self) -> None:
        self.gemini_key: Optional[str] = os.environ.get('GEMINI_API_KEY')
        self.groq_key: Optional[str] = os.environ.get('GROQ_API_KEY')

    def ask(
        self,
        query: str,
        patient_history: List[Dict[str, Any]],
        api_key: Optional[str] = None,
        provider: str = 'gemini'
    ) -> str:
        """
        Ask a question based on patient history context.
        
        Args:
            query: The user's question
            patient_history: List of patient session records
            api_key: Optional API key override
            provider: 'gemini' or 'groq'
        
        Returns:
            str: The response from the AI model
        """
        # Determine which API key to use
        if not api_key:
            if provider == 'gemini':
                api_key = self.gemini_key
            else:
                api_key = self.groq_key
            
        if not api_key:
            return "Please provide an API key (Gemini or Groq) in the chat settings to use the Medical Assistant."

        # Build context from history
        context = "No previous patient history available."
        if patient_history:
            history = sorted(patient_history, key=lambda x: x.get('timestamp', ''))
            
            ctx_lines: List[str] = []
            for s in history:
                date = s.get('timestamp', '').split('T')[0]
                results = s.get('results', {})
                if isinstance(results, str):
                    try:
                        results = json.loads(results)
                    except (json.JSONDecodeError, TypeError):
                        results = {}
                
                stage = results.get('final_stage', {}).get('stage', 'Unknown') if isinstance(results, dict) else 'Unknown'
                cog = results.get('cognitive', {}).get('composite_score', 'N/A') if isinstance(results, dict) else 'N/A'
                risk = results.get('risk_profile', {}).get('overall_risk_score', 'N/A') if isinstance(results, dict) else 'N/A'
                ctx_lines.append(f"[{date}] Stage: {stage}, Cognitive Score: {cog}/100, Risk Score: {risk}/100")
            
            context = "\n".join(ctx_lines)

        system_prompt = (
            "You are an expert AI Medical Assistant specializing in Alzheimer's Disease tracking. "
            "You are assisting a clinician taking care of a patient. "
            "Here is the patient's longitudinal progression history:\n"
            f"{context}\n\n"
            "Answer the clinician's question concisely based ONLY on the provided history. "
            "If the history doesn't contain the answer, say so. Do not invent medical data."
        )

        try:
            if provider == 'gemini':
                return self._ask_gemini(query, system_prompt, api_key)
            elif provider == 'groq':
                return self._ask_groq(query, system_prompt, api_key)
            else:
                return "Unsupported provider selected."
        except Exception as e:
            return f"Error contacting AI service: {str(e)}"

    def _ask_gemini(self, query: str, system_prompt: str, api_key: str) -> str:
        """Query Gemini API for response."""
        if not HAS_GEMINI or genai is None:
            return "google-genai package not installed."
        
        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"{system_prompt}\n\nUser Context Query: {query}",
            )
            return str(response.text) if response.text else ""
        except Exception as e:
            return f"Gemini API Error: {str(e)}"

    def _ask_groq(self, query: str, system_prompt: str, api_key: str) -> str:
        """Query Groq API for response."""
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        data = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            "temperature": 0.2
        }
        try:
            resp = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers=headers,
                json=data,
                timeout=30
            )
            if resp.status_code == 200:
                return resp.json()['choices'][0]['message']['content']
            else:
                return f"Groq API Error: {resp.text}"
        except requests.RequestException as e:
            return f"Groq API Error: {str(e)}"
