import os
import glob
import pandas as pd
import numpy as np
import nibabel as nib
from typing import Dict, Any, List

def analyze_adni_dataset(base_dir: str):
    print("=========================================================")
    print("       ADNI DATASET DETAILED LOCAL STATISTICAL AUDIT     ")
    print("=========================================================\n")

    metadata_dir = os.path.join(base_dir, 'Metadata')
    labels_csv = os.path.join(metadata_dir, 'ADNI_labels.csv')
    inventory_csv = os.path.join(metadata_dir, 'ADNI_MRI_inventory.csv')

    if not os.path.exists(labels_csv) or not os.path.exists(inventory_csv):
        print(f"Error: Metadata CSVs not found in {metadata_dir}")
        return

    labels_df = pd.read_csv(labels_csv)
    inventory_df = pd.read_csv(inventory_csv)

    labels_df.columns = [c.replace(' ', '_') for c in labels_df.columns]
    inventory_df.columns = [c.replace(' ', '_') for c in inventory_df.columns]

    print(f"1. METADATA STATS:")
    print(f"   - Labels File Rows: {len(labels_df)}")
    print(f"   - Inventory File Rows: {len(inventory_df)}")
    print(f"   - Unique Subjects in Labels: {labels_df['Subject'].nunique()}")
    print(f"   - Unique Subjects in Inventory: {inventory_df['Subject'].nunique()}")

    # Merge inventory and labels
    if 'Group' in inventory_df.columns and 'MRI_Path' in inventory_df.columns:
        df = inventory_df.copy()
    else:
        df = pd.merge(inventory_df, labels_df[['Subject', 'Group', 'Age', 'Sex']], on='Subject', how='inner')

    df = df[df['Group'].isin(['CN', 'MCI', 'AD'])].copy()

    print("\n2. DIAGNOSTIC GROUP DISTRIBUTION & DEMOGRAPHICS:")
    for group_name in ['CN', 'MCI', 'AD']:
        sub_df = df[df['Group'] == group_name]
        n_scans = len(sub_df)
        n_subjs = sub_df['Subject'].nunique()

        # Age stats
        if 'Age' in sub_df.columns:
            sub_df['Age'] = pd.to_numeric(sub_df['Age'], errors='coerce')
            age_mean = sub_df['Age'].mean()
            age_std = sub_df['Age'].std()
        else:
            age_mean, age_std = 0, 0

        # Sex stats
        if 'Sex' in sub_df.columns:
            m_count = (sub_df['Sex'] == 'M').sum()
            f_count = (sub_df['Sex'] == 'F').sum()
        else:
            m_count, f_count = 0, 0

        print(f"   [{group_name}]")
        print(f"     - MRI Scans: {n_scans} | Unique Subjects: {n_subjs}")
        print(f"     - Mean Age: {age_mean:.1f} ± {age_std:.1f} years")
        print(f"     - Sex Breakdown: Male: {m_count}, Female: {f_count}")

    # Class Weights for PyTorch
    class_counts = df['Group'].value_counts()
    cn_c = class_counts.get('CN', 1)
    mci_c = class_counts.get('MCI', 1)
    ad_c = class_counts.get('AD', 1)
    total_scans = len(df)

    # Balanced class weights: total / (num_classes * class_count)
    w_cn = total_scans / (3.0 * cn_c)
    w_mci = total_scans / (3.0 * mci_c)
    w_ad = total_scans / (3.0 * ad_c)

    print("\n3. CALCULATED PYTORCH LOSS & SAMPLER CLASS WEIGHTS:")
    print(f"   - CN  (Index 0): Weight = {w_cn:.4f}  (Count: {cn_c})")
    print(f"   - MCI (Index 1): Weight = {w_mci:.4f}  (Count: {mci_c})")
    print(f"   - AD  (Index 2): Weight = {w_ad:.4f}  (Count: {ad_c})")
    print(f"   - Normalized Class Weight Vector: [{w_cn:.4f}, {w_mci:.4f}, {w_ad:.4f}]")

    print("\n4. NIFTI VOLUME SPATIAL & INTENSITY SAMPLING AUDIT (Sample 30 scans):")
    sample_paths = df['MRI_Path'].dropna().tolist()[:30]

    shapes = []
    zooms = []
    min_vals = []
    max_vals = []
    p1_vals = []
    p99_vals = []
    valid_count = 0

    for path in sample_paths:
        if not os.path.exists(path):
            # Try resolving filename inside Dataset/ADNI
            fname = os.path.basename(path)
            matches = glob.glob(os.path.join(base_dir, 'Dataset', 'ADNI', '**', fname), recursive=True)
            if matches:
                path = matches[0]
            else:
                continue

        try:
            nii = nib.load(path)
            data = nii.get_fdata()
            shapes.append(data.shape)
            zooms.append(nii.header.get_zooms()[:3])
            min_vals.append(np.min(data))
            max_vals.append(np.max(data))
            p1, p99 = np.percentile(data, (1, 99))
            p1_vals.append(p1)
            p99_vals.append(p99)
            valid_count += 1
        except Exception as e:
            continue

    if valid_count > 0:
        print(f"   - Successfully inspected {valid_count} NIfTI MRI volumes.")
        print(f"   - Sample Volume Shapes (D1, D2, D3): {set(shapes)}")
        print(f"   - Sample Voxel Spacings (mm): {set(zooms)}")
        print(f"   - Mean Raw Min Intensity: {np.mean(min_vals):.2f}")
        print(f"   - Mean Raw Max Intensity: {np.mean(max_vals):.2f}")
        print(f"   - Mean 1st Percentile: {np.mean(p1_vals):.2f}")
        print(f"   - Mean 99th Percentile: {np.mean(p99_vals):.2f}")
        print("   - Recommended Normalization: Min-Max Scaling clipped at [1st Percentile, 99th Percentile]")
    else:
        print("   - Could not access raw NIfTI files locally (using standard MRI normalization parameters).")

    print("\n=========================================================")
    print("               AUDIT COMPLETED SUCCESSFULLY              ")
    print("=========================================================")

if __name__ == '__main__':
    project_dir = os.path.dirname(os.path.abspath(__file__))
    analyze_adni_dataset(project_dir)
