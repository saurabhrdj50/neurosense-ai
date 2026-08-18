import os
import pandas as pd
import numpy as np
from sklearn.model_selection import StratifiedKFold, train_test_split

base_dir = r"d:\neurosense-ai\backend\Alzheimer_Project"
labels_csv = os.path.join(base_dir, "Metadata", "ADNI_labels.csv")
df_labels = pd.read_csv(labels_csv)

# Subject-level grouping
df_subjects = df_labels.groupby('Subject').first().reset_index()

print(f"Total Unique Subjects for Split: {len(df_subjects)}")
print(df_subjects['Group'].value_counts())

# Stratified Split at Subject Level (70% Train, 15% Val, 15% Test)
SEED = 42

# First split into train (70%) and temp (30%)
train_subjs, temp_subjs = train_test_split(
    df_subjects,
    test_size=0.30,
    stratify=df_subjects['Group'],
    random_state=SEED
)

# Then split temp into val (15%) and test (15%)
val_subjs, test_subjs = train_test_split(
    temp_subjs,
    test_size=0.50,
    stratify=temp_subjs['Group'],
    random_state=SEED
)

train_subj_ids = set(train_subjs['Subject'])
val_subj_ids = set(val_subjs['Subject'])
test_subj_ids = set(test_subjs['Subject'])

# Mathematical disjointness assertions
assert train_subj_ids.isdisjoint(val_subj_ids), "LEAKAGE: Train and Val overlap!"
assert train_subj_ids.isdisjoint(test_subj_ids), "LEAKAGE: Train and Test overlap!"
assert val_subj_ids.isdisjoint(test_subj_ids), "LEAKAGE: Val and Test overlap!"

print("\n✓ Subject Disjointness Assertions PASSED!")

# Map back to scans
train_scans = df_labels[df_labels['Subject'].isin(train_subj_ids)]
val_scans = df_labels[df_labels['Subject'].isin(val_subj_ids)]
test_scans = df_labels[df_labels['Subject'].isin(test_subj_ids)]

print(f"\nTRAIN: {len(train_scans)} scans / {len(train_subj_ids)} subjects")
print(train_scans['Group'].value_counts())

print(f"\nVAL:   {len(val_scans)} scans / {len(val_subj_ids)} subjects")
print(val_scans['Group'].value_counts())

print(f"\nTEST:  {len(test_scans)} scans / {len(test_subj_ids)} subjects")
print(test_scans['Group'].value_counts())

# Check class imbalance weights on TRAIN only
train_class_counts = train_scans['Group'].value_counts()[['CN', 'MCI', 'AD']].values
total_train = len(train_scans)
num_classes = 3
class_weights = total_train / (num_classes * train_class_counts)

print("\n--- TRAIN Class Weights (Computed Strictly on Train Set) ---")
print(f"Class Counts [CN, MCI, AD]: {train_class_counts}")
print(f"Class Weights [CN, MCI, AD]: {class_weights.round(4)}")
