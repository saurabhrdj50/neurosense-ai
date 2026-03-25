# NeuroSense AI - New Features Guide

## Overview

This guide covers the new analysis features implemented in NeuroSense AI.

---

## 1. Blood Biomarker Analysis

### Supported Biomarkers

| Biomarker | Normal Range | AD Pattern |
|-----------|-------------|------------|
| Amyloid Beta 42 | 500-1000 pg/mL | Decreased |
| Total Tau | 0-300 pg/mL | Increased |
| Phosphorylated Tau 181 | 0-60 pg/mL | Increased |
| Neurofilament Light | 0-200 pg/mL | Increased |
| GFAP | 0-120 ng/mL | Increased |
| Homocysteine | 5-15 μmol/L | Increased |
| Vitamin B12 | 150-600 pmol/L | Decreased |
| Folate | 7-45 nmol/L | Decreased |

### API Usage

```bash
curl -X POST http://localhost:5000/api/analysis/biomarkers \
  -H "Content-Type: application/json" \
  -d '{
    "results": {
      "amyloid_beta_42": 350,
      "total_tau": 450,
      "phosphorylated_tau_181": 85,
      "neurofilament_light": 250
    }
  }'
```

### Response Example

```json
{
  "success": true,
  "results": {
    "biomarkers": {
      "total": 4,
      "critical": [...],
      "risk_factors": [...],
      "protective_factors": [...]
    },
    "risk_assessment": {
      "blood_biomarker_score": 65.5,
      "ad_probability_from_blood": 72.3,
      "interpretation": "High risk - Multiple abnormal biomarkers detected"
    },
    "clinical_notes": [...],
    "recommendations": [...]
  }
}
```

---

## 2. Neuropsychological Assessments

### MMSE (Mini-Mental State Examination)

```bash
curl -X POST http://localhost:5000/api/analysis/mmse \
  -H "Content-Type: application/json" \
  -d '{
    "orientation": 8,
    "registration": 3,
    "attention": 4,
    "recall": 2,
    "language": 7,
    "education_level": "secondary"
  }'
```

### MoCA (Montreal Cognitive Assessment)

```bash
curl -X POST http://localhost:5000/api/analysis/moca \
  -H "Content-Type: application/json" \
  -d '{
    "visuospatial": 3,
    "executive": 2,
    "attention": 5,
    "language": 4,
    "abstract": 1,
    "delayed_recall": 3,
    "orientation": 5,
    "education_years": 12
  }'
```

### CDR (Clinical Dementia Rating)

```bash
curl -X POST http://localhost:5000/api/analysis/cdr \
  -H "Content-Type: application/json" \
  -d '{
    "memory": 1,
    "orientation": 1,
    "judgment": 1,
    "community_affairs": 0,
    "home_hobbies": 0,
    "personal_care": 0
  }'
```

### Complete Battery

```bash
curl -X POST http://localhost:5000/api/analysis/neuropsychological \
  -H "Content-Type: application/json" \
  -d '{
    "mmse": {"orientation": 8, "registration": 3, "attention": 4, "recall": 2, "language": 7},
    "moca": {"visuospatial": 3, "executive": 2, "attention": 5, "language": 4},
    "cdr": {"memory": 1, "orientation": 1, "judgment": 1}
  }'
```

---

## 3. Clinical Decision Support

### Treatment Recommendations

```bash
curl -X POST http://localhost:5000/api/analysis/clinical-decision-support \
  -H "Content-Type: application/json" \
  -d '{
    "stage": 2,
    "age": 72,
    "mmse_score": 22,
    "comorbidities": ["diabetes", "hypertension"],
    "current_medications": ["Metformin"]
  }'
```

### Get Prognosis

```bash
curl -X POST http://localhost:5000/api/analysis/prognosis \
  -H "Content-Type: application/json" \
  -d '{
    "current_stage": 1,
    "age": 68,
    "biomarkers": {"high_tau": true},
    "comorbidities": ["cardiovascular"]
  }'
```

### Find Clinical Trials

```bash
curl -X POST http://localhost:5000/api/analysis/clinical-trials \
  -H "Content-Type: application/json" \
  -d '{
    "age": 68,
    "stage": 1,
    "biomarkers": {"amyloid_positive": true}
  }'
```

---

## 4. Report Generation

### Generate HTML Report

```bash
curl -X POST http://localhost:5000/api/analysis/report \
  -H "Content-Type: application/json" \
  -d '{
    "patient_info": {
      "name": "John Doe",
      "age": 72,
      "patient_id": "P001"
    },
    "analysis_results": {
      "final_stage": "Mild Demented",
      "final_confidence": 85.5,
      "mri": {"stage": "Mild Demented", "confidence": 87.2},
      "cognitive": {"mmse": {"score": 22}, "moca": {"score": 20}}
    },
    "format": "html"
  }'
```

### Generate PDF Report

```bash
curl -X POST http://localhost:5000/api/analysis/report \
  -H "Content-Type: application/json" \
  -d '{
    "patient_info": {...},
    "analysis_results": {...},
    "format": "pdf"
  }' \
  --output report.pdf
```

---

## 5. Comprehensive Analysis

Run all analysis tools at once:

```bash
curl -X POST http://localhost:5000/api/analysis/comprehensive \
  -H "Content-Type: application/json" \
  -d '{
    "patient_info": {
      "name": "Jane Smith",
      "age": 70,
      "patient_id": "P002"
    },
    "mri_results": {
      "stage": "Very Mild Demented",
      "confidence": 82.5
    },
    "cognitive_results": {
      "mmse": {"score": 24},
      "moca": {"score": 22}
    },
    "biomarkers": {
      "amyloid_beta_42": 420,
      "total_tau": 350
    }
  }'
```

---

## 6. Quality Monitoring

### Get Quality Report

```bash
curl -X GET http://localhost:5000/api/analysis/quality-report
```

### Log Human Feedback

```bash
curl -X POST http://localhost:5000/api/analysis/log-feedback \
  -H "Content-Type: application/json" \
  -d '{
    "prediction_idx": 123,
    "human_outcome": 1
  }'
```

---

## Frontend Components

New React components available in `frontend/src/components/`:

- `BloodBiomarkerForm.jsx` - Blood biomarker input form
- `ClinicalDecisionSupport.jsx` - Clinical CDS form and results
- `NeuropsychologicalAssessment.jsx` - MMSE, MoCA, CDR forms
- `ComprehensiveAnalysis.jsx` - Complete analysis page

### Usage Example

```jsx
import { ComprehensiveAnalysis } from './components/ComprehensiveAnalysis';

function App() {
  return (
    <div>
      <ComprehensiveAnalysis />
    </div>
  );
}
```

---

## Treatment Options Reference

### Cholinesterase Inhibitors

| Drug | Starting Dose | Target Dose | Stages |
|------|-------------|------------|--------|
| Donepezil | 5mg | 10-23mg | 1-3 |
| Rivastigmine | 1.5mg | 6-12mg | 1-3 |
| Galantamine | 4mg | 12-24mg | 1-2 |

### NMDA Receptor Antagonists

| Drug | Starting Dose | Target Dose | Stages |
|------|-------------|------------|--------|
| Memantine | 5mg | 20mg | 2-4 |
| Donepezil+Memantine | Combined | Standard | 2-3 |

### Disease-Modifying Therapies

| Drug | Type | Approval Status |
|------|------|-----------------|
| Lecanemab | Anti-amyloid | Approved |
| Donanemab | Anti-amyloid | Approved |
| Aducanumab | Anti-amyloid | Conditional |

---

## Disclaimer

All treatment recommendations are generated by an AI system and should be reviewed by qualified healthcare professionals. The system is a decision support tool, not a replacement for clinical judgment.
