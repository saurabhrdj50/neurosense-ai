"""Explainability domain: human-readable explanations of analysis outputs."""
from app.ml.explainability.explanation import ExplanationService, generate_explanation

__all__ = ['ExplanationService', 'generate_explanation']
