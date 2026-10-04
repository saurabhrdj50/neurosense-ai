"""Cognitive step of the analysis workflow (mirrors analysis/cognitive/)."""
from app.ml.contracts import AnalysisInput, AnalysisResult


def run_cognitive_step(orch, inputs: AnalysisInput, results: AnalysisResult) -> None:
    """Evaluate the cognitive screening payload. Mutates ``results``."""
    if inputs.get('cognitive_data') is not None:
        try:
            results['cognitive'] = orch.evaluate_cognitive(inputs['cognitive_data'])
        except Exception as e:
            results['cognitive_error'] = str(e)
