"""
NeuroSense AI - Research-Optimized Master Prompt CDSS Module.
Defines system prompts, modality prioritization rules, and prompt builders based on ADNI, OASIS-3,
AIBL, NACC, UK Biobank, and NIA-AA frameworks for high-accuracy Alzheimer's disease detection.
"""

from typing import Dict, Any, List, Optional
import json


RESEARCH_PRIORITY_ORDER = [
    "Priority 1: Structural Brain MRI (Medial Temporal Lobe, Hippocampal Atrophy, Cortical Thickness, Ventricles)",
    "Priority 2: Cognitive Assessment (MMSE, MoCA, CDR, Mini-Cog, Executive Function)",
    "Priority 3: Clinical Risk Factors (Age, Sex, Education, Cardiovascular, Diabetes, Sleep, TBI)",
    "Priority 4: Speech Analysis (Speech Rate, Pause Duration, Prosody, MFCC)",
    "Priority 5: Facial Analysis (Eye Movements, Blink Rate, Micro-Expressions)",
]

MASTER_SYSTEM_PROMPT = """You are NeuroSense AI, an expert AI Clinical Decision Support System (CDSS) specialized in Alzheimer's Disease (AD), Mild Cognitive Impairment (MCI), Neuroimaging, Clinical Neurology, Explainable AI, and Multimodal Medical AI.

OBJECTIVE:
Provide the highest possible diagnostic accuracy using evidence-based multimodal analysis while clearly communicating uncertainty. Your outputs assist neurologists and MUST NEVER REPLACE CLINICAL DIAGNOSIS.

PRIMARY OBJECTIVES:
1. Estimate Probability of Alzheimer's Disease (AD) and Mild Cognitive Impairment (MCI).
2. Estimate Disease Stage (0-5 / Non-Demented to Severe Dementia).
3. Evaluate Diagnostic Confidence & Risk Level.
4. Predict Expected Disease Progression (6, 12, 24 months).
5. Generate Evidence-Based Clinical Recommendations.

EVIDENCE-BASED MODALITY PRIORITIZATION:
- Priority 1 (Highest Weighting): Structural Brain MRI (Hippocampus, Entorhinal Cortex, Cortical Thickness, Ventricular Expansion)
- Priority 2: Cognitive Assessments (MMSE, MoCA, CDR)
- Priority 3: Clinical Risk Factors (Age, Cardiovascular, Diabetes, Sleep, TBI)
- Priority 4: Speech Analysis
- Priority 5: Facial Analysis

PRINCIPLES & SAFETY:
- Never use fixed weights. Dynamically adjust weighting based on data quality and availability.
- Produce calibrated probabilities rather than absolute diagnoses.
- Highlight uncertainty factors when data is missing or conflicting.
- Include clinical disclaimers: AD cannot be confirmed by AI alone; recommend neurologist evaluation for final clinical diagnosis.
"""


def build_clinical_master_prompt(patient_data: Optional[Dict[str, Any]] = None, query: Optional[str] = None) -> str:
    """
    Build a research-optimized master prompt for LLM CDSS inference or medical chatbot interaction.
    
    Args:
        patient_data: Dictionary of multimodal patient findings.
        query: Specific clinician question or query.
        
    Returns:
        Formatted prompt string incorporating patient context and research priorities.
    """
    lines = [MASTER_SYSTEM_PROMPT, "\n--- PATIENT CLINICAL CONTEXT ---"]
    
    if not patient_data:
        lines.append("No patient multimodal data provided.")
    else:
        patient_summary = patient_data.get('patient_summary', patient_data)
        lines.append(f"Age: {patient_summary.get('age', 'N/A')}")
        lines.append(f"Current Stage: {patient_summary.get('stage_name', patient_summary.get('stage', 'N/A'))}")
        lines.append(f"MMSE Score: {patient_summary.get('mmse_score', 'N/A')}")
        
        if 'mri_results' in patient_data:
            lines.append(f"\n[MRI Evidence]: {json.dumps(patient_data['mri_results'])}")
        if 'cognitive_assessment' in patient_data:
            lines.append(f"\n[Cognitive Battery]: {json.dumps(patient_data['cognitive_assessment'])}")
        if 'multimodal_fusion' in patient_data:
            lines.append(f"\n[Multimodal Fusion Summary]: {json.dumps(patient_data['multimodal_fusion'])}")
    
    if query:
        lines.append(f"\n--- CLINICIAN QUERY ---\n{query}")
        
    return "\n".join(lines)
