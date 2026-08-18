import os
import json
import logging

logger = logging.getLogger(__name__)

# Free / External AI Provider imports with graceful fallbacks
try:
    import google.generativeai as genai
    HAS_GEMINI = True
except ImportError:
    HAS_GEMINI = False

try:
    from groq import Groq
    HAS_GROQ = True
except ImportError:
    HAS_GROQ = False

try:
    import openai
    HAS_OPENAI = True
except ImportError:
    HAS_OPENAI = False


class MultiProviderAIRecommender:
    """
    Multi-Provider AI Clinical Recommendation Engine with automatic rate-limit failover.
    Attempts:
    1. Google Gemini Pro / Flash (GEMINI_API_KEY)
    2. Groq Llama3-70B / 8B (GROQ_API_KEY)
    3. OpenAI GPT-4o / GPT-3.5-Turbo (OPENAI_API_KEY)
    4. Deterministic Clinical Rule Engine (Fallback)
    """

    def __init__(self):
        self.gemini_key = os.getenv('GEMINI_API_KEY', '')
        self.groq_key = os.getenv('GROQ_API_KEY', '')
        self.openai_key = os.getenv('OPENAI_API_KEY', '')

        if HAS_GEMINI and self.gemini_key:
            genai.configure(api_key=self.gemini_key)

    def generate_recommendations(self, patient_data: dict) -> dict:
        """
        Generates clinical referrals, lifestyle interventions, and music therapy tailored to patient stage.
        """
        # Try Provider 1: Gemini
        if HAS_GEMINI and self.gemini_key:
            try:
                logger.info("Attempting AI Generation via Google Gemini...")
                res = self._call_gemini(patient_data)
                if res:
                    res['ai_provider_used'] = 'Google Gemini AI (Active)'
                    return res
            except Exception as e:
                logger.warning("Gemini API call failed or rate-limited: %s. Falling back to Groq...", e)

        # Try Provider 2: Groq (Llama 3 - High speed free tier)
        if HAS_GROQ and self.groq_key:
            try:
                logger.info("Attempting AI Generation via Groq Llama3...")
                res = self._call_groq(patient_data)
                if res:
                    res['ai_provider_used'] = 'Groq Llama 3 AI (Fallback)'
                    return res
            except Exception as e:
                logger.warning("Groq API call failed: %s. Falling back to OpenAI...", e)

        # Try Provider 3: OpenAI
        if HAS_OPENAI and self.openai_key:
            try:
                logger.info("Attempting AI Generation via OpenAI...")
                res = self._call_openai(patient_data)
                if res:
                    res['ai_provider_used'] = 'OpenAI GPT-4o (Fallback)'
                    return res
            except Exception as e:
                logger.warning("OpenAI API call failed: %s. Falling back to Rule Engine...", e)

        # Fallback Provider 4: Deterministic Clinical Rule Engine
        logger.info("All LLM providers unavailable. Using Deterministic Clinical CDSS Rules.")
        res = self._rule_based_fallback(patient_data)
        res['ai_provider_used'] = 'NeuroSense Deterministic CDSS Rule Engine'
        return res

    def _build_prompt(self, patient_data: dict) -> str:
        stage = patient_data.get('final_stage', {}).get('stage', 'Mild Demented')
        conf = patient_data.get('final_stage', {}).get('confidence', 75)
        genomics = patient_data.get('genomics', {})
        fluid = patient_data.get('fluid_biomarkers', {})
        risk = patient_data.get('risk_profile', {})

        return f"""
You are an expert Senior Neurologist Clinical Decision Support Assistant.
Analyze this 8-modality patient diagnostic report:
- Diagnosis Stage: {stage} (Confidence: {conf}%)
- APOE Genotype: {genomics.get('apoe_allele', 'e3/e4')} (PRS: {genomics.get('prs_percentile', 65)}th percentile)
- AT(N) Fluid Status: {fluid.get('atn_classification', 'A+ T+ N-')}
- Lancet Modifiable Risk Score: {risk.get('lancet_score', 35)}%

Return ONLY valid JSON matching this structure:
{{
  "urgency_level": "High | Moderate | Routine",
  "follow_up": "Within 2-4 weeks",
  "medical_recommendations": {{
    "referrals": [
      {{"specialist": "Memory Disorders Neurologist", "urgency": "urgent", "reason": "Detailed diagnostic evaluation for AD pathology.", "note": "Priority referral"}}
    ]
  }},
  "lifestyle_recommendations": {{
    "tips": [
      {{"category": "Cognitive", "tip": "Engage in dual-task cognitive exercises 30 mins daily.", "priority": "high"}},
      {{"category": "Diet", "tip": "Adopt Mediterranean-DASH Intervention for Neurodegenerative Delay (MIND diet).", "priority": "high"}}
    ]
  }},
  "music_therapy": [
    {{"title": "Clair de Lune (Debussy)", "artist": "Nostalgic Acoustic Recall", "tempo": "60 BPM", "type": "Memory Stimulant", "url": "https://open.spotify.com/search/Clair%20de%20Lune"}},
    {{"title": "528 Hz Deep Alpha Wave Soundscape", "artist": "NeuroSense Ambient", "tempo": "Calming", "type": "Sundowning Reduction", "url": "https://open.spotify.com/search/528Hz%20Alpha"}}
  ]
}}
"""

    def _call_gemini(self, patient_data: dict) -> dict:
        model = genai.GenerativeModel('gemini-1.5-flash')
        prompt = self._build_prompt(patient_data)
        response = model.generate_content(prompt)
        text = response.text.strip()
        if text.startswith('```json'):
            text = text[7:-3].strip()
        return json.loads(text)

    def _call_groq(self, patient_data: dict) -> dict:
        client = Groq(api_key=self.groq_key)
        prompt = self._build_prompt(patient_data)
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model="llama3-70b-8192",
            response_format={"type": "json_object"}
        )
        return json.loads(chat_completion.choices[0].message.content)

    def _call_openai(self, patient_data: dict) -> dict:
        client = openai.OpenAI(api_key=self.openai_key)
        prompt = self._build_prompt(patient_data)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        return json.loads(response.choices[0].message.content)

    def _rule_based_fallback(self, patient_data: dict) -> dict:
        stage = patient_data.get('final_stage', {}).get('stage', 'Mild Demented')
        is_high = 'Mild' in stage or 'Moderate' in stage

        return {
            "urgency_level": "High" if is_high else "Routine",
            "follow_up": "Within 2 to 4 weeks for specialized cognitive review",
            "medical_recommendations": {
                "referrals": [
                    {"specialist": "Cognitive Neurologist Specialist", "urgency": "urgent" if is_high else "recommended", "reason": "Evaluate volumetric temporal lobe atrophy and biomarker profile.", "note": "Priority Referral"},
                    {"specialist": "Audiologist / ENT", "urgency": "recommended", "reason": "Correct midlife hearing loss to reduce cognitive load.", "note": "Lancet Recommendation"}
                ]
            },
            "lifestyle_recommendations": {
                "tips": [
                  {"category": "Diet", "tip": "Adopt MIND diet rich in green leafy vegetables, berries, and omega-3 fatty acids.", "priority": "high"},
                  {"category": "Physical", "tip": "Perform 150 minutes weekly of moderate aerobic exercise (brisk walking).", "priority": "high"},
                  {"category": "Cognitive", "tip": "Engage in daily dual-task cognitive activities or regional language reading.", "priority": "high"}
                ]
            },
            "music_therapy": [
                {"title": "Clair de Lune (Debussy)", "artist": "Acoustic Piano (60 BPM)", "tempo": "60 BPM", "type": "Memory Recall", "url": "https://open.spotify.com/search/Clair%20de%20Lune"},
                {"title": "528 Hz Healing Alpha Tone", "artist": "NeuroSense Ambient", "tempo": "Calming", "type": "Sundowning Reduction", "url": "https://open.spotify.com/search/528Hz%20Alpha"},
                {"title": "Vivaldi - Four Seasons (Spring)", "artist": "Classical Orchestral", "tempo": "72 BPM", "type": "Cognitive Stimulation", "url": "https://open.spotify.com/search/Vivaldi%20Four%20Seasons"}
            ]
        }


ai_recommender = MultiProviderAIRecommender()
