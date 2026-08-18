import os
import pytest
import numpy as np
import torch
from app.modules.mri.adni_dataset import ADNINiftiDataset
from train_mri import get_adni_datasets

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ADNI_DIR = os.path.join(BASE_DIR, 'Alzheimer_Project')

class TestADNINiftiDataset:
    def test_dataset_initialization_and_labels(self):
        labels_csv = os.path.join(ADNI_DIR, 'Metadata', 'ADNI_labels.csv')
        inventory_csv = os.path.join(ADNI_DIR, 'Metadata', 'ADNI_MRI_inventory.csv')

        assert os.path.exists(labels_csv), "ADNI_labels.csv missing"
        assert os.path.exists(inventory_csv), "ADNI_MRI_inventory.csv missing"

        ds = ADNINiftiDataset(labels_csv=labels_csv, inventory_csv=inventory_csv)
        assert len(ds) > 0, "Dataset should not be empty"

        subjects = ds.get_subjects()
        assert len(subjects) > 0, "Should have unique subjects"

        targets = ds.get_targets()
        assert set(targets).issubset({0, 1, 2}), "Targets must map to 0 (CN), 1 (MCI), 2 (AD)"

    def test_subject_level_split(self):
        train_ds, val_ds, label_map = get_adni_datasets(ADNI_DIR, train_ratio=0.8)
        assert len(train_ds) > 0
        assert len(val_ds) > 0

        train_subjects = set(train_ds.get_subjects())
        val_subjects = set(val_ds.get_subjects())

        # Subject-level split must prevent data leakage between train and val
        overlap = train_subjects.intersection(val_subjects)
        assert len(overlap) == 0, f"Data leakage detected! Overlapping subjects: {overlap}"

    def test_dataset_getitem(self):
        labels_csv = os.path.join(ADNI_DIR, 'Metadata', 'ADNI_labels.csv')
        inventory_csv = os.path.join(ADNI_DIR, 'Metadata', 'ADNI_MRI_inventory.csv')

        ds = ADNINiftiDataset(labels_csv=labels_csv, inventory_csv=inventory_csv)
        img_tensor, label = ds[0]

        assert isinstance(img_tensor, torch.Tensor)
        assert img_tensor.shape[0] == 3, "Output image should have 3 color channels"
        assert label in [0, 1, 2]
