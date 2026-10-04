"""Internal result contracts for the ML domains and analysis pipeline.

These TypedDicts document the dictionary shapes passed between
``app/ml/*`` domains, ``app/services``, and ``app/api``. They are typing-only:
at runtime they are plain dicts, and the frontend JSON contract is unchanged.
Field names here must stay in sync with what the frontend consumes.
"""
from typing import Any, Dict, List, Optional, TypedDict


class MRIProbabilities(Dict[str, float]):
    """stage name -> percentage, e.g. {'Non-Demented': 99.99}."""


class MRIResult(TypedDict, total=False):
    stage: str
    stage_index: int  # 0=CN, 1=MCI, 2=AD per verified training lineage
    confidence: float  # 0-100, probability of the selected class
    model: str
    probabilities: Dict[str, float]
    decision_summary: str
    gradcam_image: str  # base64 PNG overlay (absent when unavailable)
    gradcam_image_base64: str
    heatmap_explanation: str
    success: bool  # False only on the explicit model-unavailable error result
    model_available: bool
    error: str


class TranscriptionResult(TypedDict, total=False):
    text: str
    method: str  # e.g. 'whisper_turbo', 'google_free', 'unavailable', 'error'
    error: Optional[str]
    acoustic_features: Dict[str, Any]
    linguistic_biomarkers: Dict[str, Any]


class SpeechSummary(TypedDict, total=False):
    """Frontend-facing 'sentiment' object built from the speech pipeline.

    Display-only: intentionally carries no severity score, so the fusion
    engine ignores it (see app/ml/fusion/engine.py).
    """

    dominant_emotion: Optional[str]
    lexical_density: Optional[str]
    filler_word_count: Optional[int]
    pause_frequency: Optional[str]
    pitch_variation: Optional[str]
    clinical_summary: str


class CognitiveResult(TypedDict, total=False):
    composite_score: float  # 0-100 rule-based screening composite
    impairment_level: str
    memory_recall: float
    profile: Optional[Dict[str, Any]]
    domains: Dict[str, Any]
    total_questions: int
    questions_completed: int
    tests_completed: int
    test_results: Dict[str, Any]
    risk_label: str


class RiskResult(TypedDict, total=False):
    overall_risk_score: float  # 0-100 weighted mean of supplied factors
    risk_category: str
    risk_label: str
    contributing_factors: List[str]
    factors_assessed: int
    category_scores: Dict[str, float]
    modifiable_risk: float
    non_modifiable_risk: float


class FusionResult(TypedDict, total=False):
    stage: Optional[str]
    stage_index: Optional[int]
    confidence: float
    summary: str
    explanation: str
    method: str
    modality_contributions: Dict[str, float]
    modality_agreement: str
    evidence_summary: List[str]
    active_modalities: List[str]
    missing_modalities: List[str]
    uncertainty_factors: List[str]
    epistemic_uncertainty: float


class AnalysisInput(TypedDict, total=False):
    """Parsed inputs for one full analysis run (no Flask objects except files)."""

    patient_info: Dict[str, Any]
    patient_notes: str
    mri_file: Any  # werkzeug FileStorage or None
    audio_file: Any  # werkzeug FileStorage or None
    audio_text: str
    cognitive_data: Optional[Dict[str, Any]]
    risk_data: Optional[Dict[str, Any]]
    gradcam: bool


class AnalysisResult(TypedDict, total=False):
    """Full /api/analysis/analyze response shape (frontend contract)."""

    patient_info: Dict[str, Any]
    mri: MRIResult
    mri_error: str
    clinical_notes_nlp: Dict[str, Any]
    clinical_notes_error: str
    audio_transcription: TranscriptionResult
    audio_error: str
    sentiment: SpeechSummary
    cognitive: CognitiveResult
    cognitive_error: str
    risk_profile: RiskResult
    risk_error: str
    final_stage: FusionResult
    fusion_error: str
    ai_explanation: Dict[str, Any]
    explanation_error: str
    recommendations: Dict[str, Any]
    recommendations_error: str
    session_id: int
    history_error: str
