"""
Blood Biomarker Analysis Module for Alzheimer's Detection.
Analyzes blood test results for AD-related biomarkers.
"""
import logging
from typing import Dict, Any, List, Optional
from dataclasses import dataclass

logger = logging.getLogger(__name__)

ALZHEIMER_BIOMARKERS = {
    'amyloid_beta_42': {
        'name': 'Amyloid Beta 42',
        'unit': 'pg/mL',
        'normal_range': (500, 1000),
        'ad_pattern': 'decreased',
        'description': 'Lower levels in CSF associated with AD',
        'threshold_low': 500,
        'severity_impact': 0.3,
    },
    'amyloid_beta_40': {
        'name': 'Amyloid Beta 40',
        'unit': 'pg/mL',
        'normal_range': (5000, 15000),
        'ad_pattern': 'stable',
        'description': 'Control marker for Aβ42 analysis',
        'severity_impact': 0.1,
    },
    'total_tau': {
        'name': 'Total Tau Protein',
        'unit': 'pg/mL',
        'normal_range': (0, 300),
        'ad_pattern': 'increased',
        'description': 'Markers neuronal damage',
        'threshold_high': 300,
        'severity_impact': 0.35,
    },
    'phosphorylated_tau_181': {
        'name': 'Phosphorylated Tau 181',
        'unit': 'pg/mL',
        'normal_range': (0, 60),
        'ad_pattern': 'increased',
        'description': 'Highly specific for AD',
        'threshold_high': 60,
        'severity_impact': 0.4,
    },
    'neurofilament_light': {
        'name': 'Neurofilament Light Chain',
        'unit': 'pg/mL',
        'normal_range': (0, 200),
        'ad_pattern': 'increased',
        'description': 'Neurodegeneration marker',
        'threshold_high': 200,
        'severity_impact': 0.25,
    },
    'gfap': {
        'name': 'Glial Fibrillary Acidic Protein',
        'unit': 'ng/mL',
        'normal_range': (0, 120),
        'ad_pattern': 'increased',
        'description': 'Astrocyte activation marker',
        'threshold_high': 120,
        'severity_impact': 0.2,
    },
    'homocysteine': {
        'name': 'Homocysteine',
        'unit': 'μmol/L',
        'normal_range': (5, 15),
        'ad_pattern': 'increased',
        'description': 'Cardiovascular risk factor for dementia',
        'threshold_high': 15,
        'severity_impact': 0.15,
    },
    'vitamin_b12': {
        'name': 'Vitamin B12',
        'unit': 'pmol/L',
        'normal_range': (150, 600),
        'ad_pattern': 'decreased',
        'description': 'B12 deficiency can mimic dementia',
        'threshold_low': 150,
        'severity_impact': 0.1,
    },
    'folate': {
        'name': 'Folate',
        'unit': 'nmol/L',
        'normal_range': (7, 45),
        'ad_pattern': 'decreased',
        'description': 'Folate deficiency affects cognition',
        'threshold_low': 7,
        'severity_impact': 0.1,
    },
    'fasting_glucose': {
        'name': 'Fasting Glucose',
        'unit': 'mmol/L',
        'normal_range': (3.9, 5.6),
        'ad_pattern': 'increased',
        'description': 'Diabetes is AD risk factor',
        'threshold_high': 5.6,
        'severity_impact': 0.1,
    },
    'hba1c': {
        'name': 'HbA1c',
        'unit': '%',
        'normal_range': (4, 5.6),
        'ad_pattern': 'increased',
        'description': 'Long-term glucose control',
        'threshold_high': 5.6,
        'severity_impact': 0.1,
    },
    'cholesterol_ldl': {
        'name': 'LDL Cholesterol',
        'unit': 'mmol/L',
        'normal_range': (0, 3.4),
        'ad_pattern': 'increased',
        'description': 'Cardiovascular risk factor',
        'threshold_high': 3.4,
        'severity_impact': 0.1,
    },
    'crp': {
        'name': 'C-Reactive Protein',
        'unit': 'mg/L',
        'normal_range': (0, 3),
        'ad_pattern': 'increased',
        'description': 'Inflammation marker',
        'threshold_high': 3,
        'severity_impact': 0.1,
    },
}


@dataclass
class BiomarkerResult:
    biomarker: str
    value: float
    unit: str
    status: str
    deviation: float
    severity_contribution: float


class BloodBiomarkerAnalyzer:
    """
    Analyzes blood biomarker results for Alzheimer's risk assessment.
    """
    
    def __init__(self) -> None:
        self.biomarkers = ALZHEIMER_BIOMARKERS
        logger.info("BloodBiomarkerAnalyzer initialized with %d biomarkers", len(self.biomarkers))
    
    def analyze(self, results: Dict[str, float]) -> Dict[str, Any]:
        """
        Analyze blood test results.
        
        Args:
            results: Dict of biomarker_name -> value
            
        Returns:
            Comprehensive analysis results
        """
        analyzed = []
        risk_factors = []
        protective_factors = []
        critical_findings = []
        
        for biomarker_key, value in results.items():
            if biomarker_key not in self.biomarkers:
                continue
            
            marker_info = self.biomarkers[biomarker_key]
            result = self._analyze_single(biomarker_key, value, marker_info)
            analyzed.append(result)
            
            if result.status == 'critical':
                critical_findings.append({
                    'biomarker': biomarker_key,
                    'name': marker_info['name'],
                    'value': value,
                    'unit': marker_info['unit']
                })
            elif result.deviation > 0.3:
                risk_factors.append({
                    'biomarker': biomarker_key,
                    'name': marker_info['name'],
                    'deviation': round(result.deviation, 2)
                })
            elif result.deviation < -0.1:
                protective_factors.append({
                    'biomarker': biomarker_key,
                    'name': marker_info['name']
                })
        
        overall_score = self._calculate_risk_score(analyzed)
        ad_probability = self._estimate_ad_probability(analyzed)
        
        return {
            'biomarkers': {
                'total': len(analyzed),
                'analyzed': [self._format_biomarker(r) for r in analyzed],
                'critical': critical_findings,
                'risk_factors': risk_factors,
                'protective_factors': protective_factors,
            },
            'risk_assessment': {
                'blood_biomarker_score': round(overall_score, 2),
                'ad_probability_from_blood': round(ad_probability * 100, 1),
                'confidence': self._calculate_confidence(len(analyzed)),
                'interpretation': self._interpret_score(overall_score),
            },
            'clinical_notes': self._generate_clinical_notes(analyzed, critical_findings),
            'recommendations': self._generate_recommendations(analyzed, critical_findings),
        }
    
    def _analyze_single(self, key: str, value: float, info: Dict) -> BiomarkerResult:
        """Analyze a single biomarker."""
        normal_min, normal_max = info['normal_range']
        pattern = info['ad_pattern']
        
        if pattern == 'decreased':
            if value < info.get('threshold_low', normal_min):
                deviation = (normal_min - value) / normal_min if normal_min > 0 else 0
                status = 'critical' if deviation > 0.5 else 'abnormal'
            else:
                deviation = 0
                status = 'normal'
        else:
            threshold = info.get('threshold_high', normal_max)
            if value > threshold:
                deviation = (value - threshold) / threshold if threshold > 0 else 0
                status = 'critical' if deviation > 1.0 else 'abnormal'
            else:
                deviation = 0
                status = 'normal'
        
        severity_contribution = deviation * info['severity_impact']
        
        return BiomarkerResult(
            biomarker=key,
            value=value,
            unit=info['unit'],
            status=status,
            deviation=min(deviation, 2.0),
            severity_contribution=min(severity_contribution, 1.0)
        )
    
    def _calculate_risk_score(self, results: List[BiomarkerResult]) -> float:
        """Calculate overall blood biomarker risk score (0-100)."""
        if not results:
            return 0
        
        weighted_sum = sum(r.severity_contribution for r in results)
        base_score = weighted_sum * 50
        
        critical_count = sum(1 for r in results if r.status == 'critical')
        if critical_count >= 3:
            base_score *= 1.5
        
        return min(base_score, 100)
    
    def _estimate_ad_probability(self, results: List[BiomarkerResult]) -> float:
        """Estimate probability of AD from blood biomarkers."""
        if not results:
            return 0.3
        
        key_biomarkers = ['amyloid_beta_42', 'phosphorylated_tau_181', 'total_tau']
        present = [r for r in results if r.biomarker in key_biomarkers]
        
        if len(present) < 2:
            return 0.3
        
        abnormal_count = sum(1 for r in present if r.status != 'normal')
        base_prob = 0.1 + (abnormal_count / len(present)) * 0.6
        
        neurofilament = next((r for r in results if r.biomarker == 'neurofilament_light'), None)
        if neurofilament and neurofilament.status != 'normal':
            base_prob += 0.15
        
        return min(base_prob, 0.95)
    
    def _calculate_confidence(self, num_biomarkers: int) -> float:
        """Calculate analysis confidence based on biomarkers tested."""
        if num_biomarkers >= 8:
            return 0.9
        elif num_biomarkers >= 5:
            return 0.75
        elif num_biomarkers >= 3:
            return 0.6
        else:
            return 0.4
    
    def _interpret_score(self, score: float) -> str:
        """Interpret the risk score."""
        if score >= 60:
            return "High risk - Multiple abnormal biomarkers detected"
        elif score >= 40:
            return "Moderate risk - Some concerning values"
        elif score >= 20:
            return "Low risk - Minor deviations from normal"
        else:
            return "Minimal risk - Blood biomarkers within acceptable range"
    
    def _format_biomarker(self, result: BiomarkerResult) -> Dict[str, Any]:
        """Format biomarker result for output."""
        info = self.biomarkers.get(result.biomarker, {})
        return {
            'name': info.get('name', result.biomarker),
            'value': result.value,
            'unit': result.unit,
            'normal_range': f"{info.get('normal_range', (0, 0))[0]}-{info.get('normal_range', (0, 0))[1]}",
            'status': result.status,
            'interpretation': self._interpret_single(result, info),
        }
    
    def _interpret_single(self, result: BiomarkerResult, info: Dict) -> str:
        """Interpret a single biomarker result."""
        if result.status == 'normal':
            return "Within normal range"
        
        pattern = info.get('ad_pattern', 'unknown')
        if pattern == 'increased':
            if result.status == 'critical':
                return f"Significantly elevated - strongly associated with {info.get('name', 'AD')}"
            return f"Elevated - may indicate increased risk"
        else:
            if result.status == 'critical':
                return f"Significantly decreased - strongly associated with {info.get('name', 'AD')}"
            return f"Decreased - may indicate increased risk"
    
    def _generate_clinical_notes(self, results: List[BiomarkerResult], 
                                  critical: List) -> List[str]:
        """Generate clinical notes."""
        notes = []
        
        ab42 = next((r for r in results if r.biomarker == 'amyloid_beta_42'), None)
        tau = next((r for r in results if r.biomarker == 'phosphorylated_tau_181'), None)
        
        if ab42 and tau and ab42.status != 'normal' and tau.status != 'normal':
            notes.append("Simultaneous Aβ42 decrease with p-tau181 increase is highly suggestive of AD pathology.")
        
        if critical:
            notes.append(f"{len(critical)} critical finding(s) require immediate clinical correlation.")
        
        nfl = next((r for r in results if r.biomarker == 'neurofilament_light'), None)
        if nfl and nfl.status == 'critical':
            notes.append("Elevated NfL suggests active neurodegeneration.")
        
        return notes if notes else ["Blood biomarker profile within expected ranges."]
    
    def _generate_recommendations(self, results: List[BiomarkerResult],
                                   critical: List) -> List[str]:
        """Generate clinical recommendations."""
        recs = []
        
        b12 = next((r for r in results if r.biomarker == 'vitamin_b12'), None)
        if b12 and b12.value < 200:
            recs.append("Consider B12 supplementation and dietary assessment.")
        
        folate = next((r for r in results if r.biomarker == 'folate'), None)
        if folate and folate.value < 10:
            recs.append("Consider folate supplementation.")
        
        homocysteine = next((r for r in results if r.biomarker == 'homocysteine'), None)
        if homocysteine and homocysteine.value > 15:
            recs.append("Elevated homocysteine - consider B vitamins and lifestyle modifications.")
        
        glucose = next((r for r in results if r.biomarker == 'fasting_glucose'), None)
        if glucose and glucose.value > 5.6:
            recs.append("Fasting glucose elevated - recommend glucose tolerance testing.")
        
        if critical:
            recs.append("Critical biomarkers detected - recommend comprehensive neurological evaluation.")
        
        recs.append("Consider amyloid PET scan or CSF analysis for definitive AD diagnosis.")
        
        return recs
    
    def get_recommended_panel(self) -> List[str]:
        """Return recommended biomarker panel for AD screening."""
        return [
            'amyloid_beta_42',
            'phosphorylated_tau_181',
            'total_tau',
            'neurofilament_light',
            'gfap',
            'homocysteine',
            'vitamin_b12',
            'folate',
        ]


def analyze_blood_biomarkers(results: Dict[str, float]) -> Dict[str, Any]:
    """Convenience function for blood biomarker analysis."""
    analyzer = BloodBiomarkerAnalyzer()
    return analyzer.analyze(results)
