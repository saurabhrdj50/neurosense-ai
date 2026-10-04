from typing import Any, Dict, Callable

# Aligning exactly with frontend 18 keys + patient demographics

FACTOR_CONFIG: Dict[str, Dict[str, Any]] = {
    # Lifestyle
    'physical_inactivity': {'category': 'Lifestyle', 'label': 'Lack of Daily Exercise', 'weight': 8, 'scoring': lambda v: 70 if v else 10},
    'sleep_issues': {'category': 'Lifestyle', 'label': 'Poor Sleep', 'weight': 5, 'scoring': lambda v: 65 if v else 10},
    'smoking': {'category': 'Lifestyle', 'label': 'Smoking History', 'weight': 6, 'scoring': lambda v: 75 if v else 10},
    'social_isolation': {'category': 'Lifestyle', 'label': 'Low Social Contact', 'weight': 4, 'scoring': lambda v: 60 if v else 10},
    'alcohol_excess': {'category': 'Lifestyle', 'label': 'Heavy Alcohol Use', 'weight': 5, 'scoring': lambda v: 70 if v else 10},
    
    # Medical
    'hypertension': {'category': 'Medical', 'label': 'High Blood Pressure', 'weight': 7, 'scoring': lambda v: 75 if v else 10},
    'diabetes': {'category': 'Medical', 'label': 'High Blood Sugar', 'weight': 7, 'scoring': lambda v: 70 if v else 10},
    'heart_disease': {'category': 'Medical', 'label': 'Heart Problems', 'weight': 6, 'scoring': lambda v: 75 if v else 10},
    'hearing_loss': {'category': 'Medical', 'label': 'Hearing Trouble', 'weight': 5, 'scoring': lambda v: 60 if v else 10},
    'obesity': {'category': 'Medical', 'label': 'Obesity', 'weight': 6, 'scoring': lambda v: 65 if v else 10},
    'depression': {'category': 'Medical', 'label': 'Depression', 'weight': 6, 'scoring': lambda v: 65 if v else 10},
    
    # Genetics
    'family_history': {'category': 'Genetics', 'label': 'Family History of Memory Loss', 'weight': 8, 'scoring': lambda v: 80 if v else 10},
    'apoe4_allele': {'category': 'Genetics', 'label': 'APOE-4 Gene', 'weight': 10, 'scoring': lambda v: 90 if v else 10},
    'early_onset_family': {'category': 'Genetics', 'label': 'Early Memory Loss in Family', 'weight': 7, 'scoring': lambda v: 85 if v else 10},
    
    # Medications
    'anticholinergic_load': {'category': 'Medications', 'label': 'Meds Causing Confusion', 'weight': 5, 'scoring': lambda v: 75 if v else 10},
    'benzodiazepines': {'category': 'Medications', 'label': 'Sleeping Pills', 'weight': 5, 'scoring': lambda v: 70 if v else 10},
    'polypharmacy': {'category': 'Medications', 'label': 'Taking 5+ Medicines', 'weight': 4, 'scoring': lambda v: 65 if v else 10},
    'medication_noncompliance': {'category': 'Medications', 'label': 'Forgetting Doses', 'weight': 4, 'scoring': lambda v: 60 if v else 10},
}
