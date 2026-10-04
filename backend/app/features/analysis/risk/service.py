"""Risk step of the analysis workflow (mirrors analysis/risk/ in frontend)."""
from app.ml.contracts import AnalysisInput, AnalysisResult


def run_risk_step(orch, inputs: AnalysisInput, results: AnalysisResult) -> None:
    """Assess clinical risk factors. Mutates ``results``."""
    if inputs.get('risk_data') is not None:
        try:
            results['risk_profile'] = orch.assess_risk(inputs['risk_data'])
        except Exception as e:
            results['risk_error'] = str(e)
