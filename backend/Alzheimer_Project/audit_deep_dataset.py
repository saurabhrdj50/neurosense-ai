import os
import pandas as pd
import numpy as np

base_dir = r"d:\neurosense-ai\backend\Alzheimer_Project"
labels_csv = os.path.join(base_dir, "Metadata", "ADNI_labels.csv")

df_labels = pd.read_csv(labels_csv)

print("--- DEMOGRAPHICS & DIAGNOSIS BREAKDOWN ---")
print("Total rows in ADNI_labels.csv:", len(df_labels))
print("Unique Subject IDs in ADNI_labels.csv:", df_labels['Subject'].nunique())

# Check subject diagnosis consistency
subj_diag_counts = df_labels.groupby('Subject')['Group'].nunique()
multi_diag_subjs = subj_diag_counts[subj_diag_counts > 1]
print(f"Subjects with multiple different diagnoses in dataset: {len(multi_diag_subjs)}")
if len(multi_diag_subjs) > 0:
    print(multi_diag_subjs)

# Age statistics per class
print("\n--- Age Statistics per Class ---")
print(df_labels.groupby('Group')['Age'].describe())

# Sex statistics per class
print("\n--- Sex Statistics per Class ---")
print(pd.crosstab(df_labels['Group'], df_labels['Sex'], margins=True))

# Longitudinal scan breakdown
scans_per_subj = df_labels['Subject'].value_counts()
print("\nScans per subject distribution:")
print(scans_per_subj.value_counts())

multi_scan_subjs = scans_per_subj[scans_per_subj > 1].index
print(f"Number of subjects with >1 scan: {len(multi_scan_subjs)}")

# Detailed per-class scan vs subject counts
for grp, df_grp in df_labels.groupby('Group'):
    n_scans = len(df_grp)
    n_subjs = df_grp['Subject'].nunique()
    print(f"Class {grp:3s}: {n_scans:3d} scans / {n_subjs:3d} unique subjects")
