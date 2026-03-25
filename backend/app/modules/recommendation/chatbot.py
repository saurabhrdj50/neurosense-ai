import os
import json
from typing import Optional, List, Dict, Any

try:
    from google import genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False
    genai = None

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
        if not api_key:
            if provider == 'gemini':
                api_key = self.gemini_key
            else:
                api_key = self.groq_key

        if not api_key:
            return "Please provide an API key (Gemini or Groq) in the chat settings."

        context = "No previous patient history available."
        if patient_history:
            history = sorted(patient_history, key=lambda x: x.get('timestamp', ''))
            ctx_lines = []
            for s in history:
                date = s.get('timestamp', '').split('T')[0]
                results = s.get('results', {})
                if isinstance(results, str):
                    try:
                        results = json.loads(results)
                    except (json.JSONDecodeError, TypeError):
                        results = {}
                stage = results.get('final_stage', {}).get('stage', 'Unknown') if isinstance(results, dict) else 'Unknown'
                ctx_lines.append(f"[{date}] Stage: {stage}")
            context = "\n".join(ctx_lines)

        system_prompt = (
            "You are an expert AI Medical Assistant specializing in Alzheimer's Disease tracking. "
            f"Patient history:\n{context}\n\n"
            "Answer the clinician's question concisely based ONLY on the provided history."
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
        if not HAS_GEMINI or genai is None:
            return "google-genai package not installed."

        try:
            client = genai.Client(api_key=api_key)
            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=f"{system_prompt}\n\nQuery: {query}",
            )
            return str(response.text) if response.text else ""
        except Exception as e:
            return f"Gemini API Error: {str(e)}"

    def _ask_groq(self, query: str, system_prompt: str, api_key: str) -> str:
        headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
        data = {
            "model": "llama3-8b-8192",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": query}
            ],
            "temperature": 0.2
        }
        try:
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", headers=headers, json=data, timeout=30)
            if resp.status_code == 200:
                return resp.json()['choices'][0]['message']['content']
            else:
                return f"Groq API Error: {resp.text}"
        except requests.RequestException as e:
            return f"Groq API Error: {str(e)}"
