"""
Clinical Master Prompt
Provides the system prompt and builder for the MedicalChatbot AI interactions.
"""

from typing import Dict, Any, Optional

MASTER_SYSTEM_PROMPT = """You are NeuroSense AI, an advanced clinical decision support assistant 
specializing in Alzheimer's disease and cognitive impairment assessment. You assist clinicians 
by interpreting multimodal AI analysis results (MRI classification, cognitive tests, sentiment 
analysis, and risk profiling) and providing evidence-based clinical insights.

Important guidelines:
- Always emphasize that AI findings are decision-support tools, not definitive diagnoses
- Recommend appropriate specialist referrals based on findings
- Provide stage-appropriate management suggestions
- Consider patient safety and caregiver needs
- Use clear, professional clinical language
- Cite relevant clinical guidelines when appropriate (e.g., NIA-AA criteria)
"""


def build_clinical_master_prompt(
    patient_data: Optional[Dict[str, Any]] = None,
    query: Optional[str] = None
) -> str:
    """Build a contextualized system prompt for the medical chatbot."""
    prompt = MASTER_SYSTEM_PROMPT

    if not patient_data:
        return prompt

    context_parts = []

    # MRI findings
    mri = patient_data.get('mri') or {}
    if mri:
        stage = mri.get('stage', 'Unknown')
        confidence = mri.get('confidence', 0)
        context_parts.append(f"MRI Classification: {stage} (confidence: {confidence:.1%})")

    # Fusion/final stage
    final = patient_data.get('final_stage') or {}
    if final:
        stage = final.get('stage', '')
        conf = final.get('confidence', 0)
        if stage:
            context_parts.append(f"Fused Final Stage: {stage} (confidence: {conf:.1%})")

    # Cognitive test
    cognitive = patient_data.get('cognitive') or {}
    if cognitive:
        score = cognitive.get('total_score', cognitive.get('score'))
        if score is not None:
            context_parts.append(f"Cognitive Score: {score}")

    # Sentiment
    sentiment = patient_data.get('sentiment') or {}
    if sentiment:
        emotion = sentiment.get('dominant_emotion', '')
        risk = sentiment.get('depression_risk', '')
        if emotion:
            context_parts.append(f"Sentiment: {emotion}" + (f" | Depression risk: {risk}" if risk else ""))

    # Risk profile
    risk_profile = patient_data.get('risk_profile') or {}
    if risk_profile:
        risk_score = risk_profile.get('overall_risk_score', risk_profile.get('risk_score'))
        if risk_score is not None:
            context_parts.append(f"Risk Score: {risk_score}")

    # Patient info
    patient_info = patient_data.get('patient_info') or {}
    if patient_info:
        parts = []
        if patient_info.get('age'):
            parts.append(f"Age: {patient_info['age']}")
        if patient_info.get('sex'):
            parts.append(f"Sex: {patient_info['sex']}")
        if parts:
            context_parts.append("Patient: " + ", ".join(parts))

    if context_parts:
        prompt += "\n\n--- Current Patient Analysis Context ---\n"
        prompt += "\n".join(f"• {part}" for part in context_parts)
        prompt += "\n\nPlease answer the clinician's question in context of these findings."

    return prompt
