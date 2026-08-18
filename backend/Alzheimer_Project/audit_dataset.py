import os
import glob
import pandas as pd
import numpy as np
import nibabel as nib
import json

base_dir = r"d:\neurosense-ai\backend\Alzheimer_Project"
dataset_dir = os.path.join(base_dir, "Dataset", "ADNI")
labels_csv = os.path.join(base_dir, "Metadata", "ADNI_labels.csv")
inventory_csv = os.path.join(base_dir, "Metadata", "ADNI_MRI_inventory.csv")
inspection_csv = os.path.join(base_dir, "Results", "MRI_Inspection", "ADNI_MRI_complete_inspection.csv")

print("==========================================")
print("     ADNI DATASET COMPREHENSIVE AUDIT     ")
print("==========================================")

# 1. Metadata Files Inspection
print("\n--- 1. METADATA FILES ---")
if os.path.exists(labels_csv):
    df_labels = pd.read_csv(labels_csv)
    print(f"ADNI_labels.csv shape: {df_labels.shape}")
    print(f"Columns: {list(df_labels.columns)}")
    print(df_labels.head(3))
else:
    print("ADNI_labels.csv NOT found!")
    df_labels = None

if os.path.exists(inventory_csv):
    df_inv = pd.read_csv(inventory_csv)
    print(f"\nADNI_MRI_inventory.csv shape: {df_inv.shape}")
    print(f"Columns: {list(df_inv.columns)}")
    print(df_inv.head(3))
else:
    print("ADNI_MRI_inventory.csv NOT found!")
    df_inv = None

if os.path.exists(inspection_csv):
    df_insp = pd.read_csv(inspection_csv)
    print(f"\nADNI_MRI_complete_inspection.csv shape: {df_insp.shape}")
    print(f"Columns: {list(df_insp.columns)}")
else:
    print("ADNI_MRI_complete_inspection.csv NOT found!")
    df_insp = None

# 2. File System Scan of NIfTI files
print("\n--- 2. NIFTI FILES DISCOVERY ---")
nii_files = glob.glob(os.path.join(dataset_dir, "**", "*.nii"), recursive=True)
niigz_files = glob.glob(os.path.join(dataset_dir, "**", "*.nii.gz"), recursive=True)
all_nifti = nii_files + niigz_files
print(f"Found {len(nii_files)} .nii files")
print(f"Found {len(niigz_files)} .nii.gz files")
print(f"Total NIfTI files: {len(all_nifti)}")

# 3. Label matching & Subject Extraction
subjects = []
scans_info = []

corrupt_files = []
shapes = []
zooms = [] # Voxel spacing
orientations = []

for filepath in all_nifti:
    rel_path = os.path.relpath(filepath, dataset_dir)
    filename = os.path.basename(filepath)
    
    # Extract subject ID (ADNI pattern e.g. 005_S_0546)
    parts = rel_path.replace("\\", "/").split("/")
    subj_id = parts[0] if len(parts) > 0 else "UNKNOWN"
    
    # Try reading NIfTI header
    is_corrupt = False
    shape = None
    zoom = None
    orientation = None
    
    try:
        img = nib.load(filepath)
        hdr = img.header
        shape = img.shape
        zoom = hdr.get_zooms()
        axcodes = nib.aff2axcodes(img.affine)
        orientation = "".join(axcodes)
        shapes.append(shape)
        zooms.append(zoom)
        orientations.append(orientation)
    except Exception as e:
        is_corrupt = True
        corrupt_files.append((filepath, str(e)))
        
    scans_info.append({
        'filepath': filepath,
        'rel_path': rel_path,
        'filename': filename,
        'subject_id': subj_id,
        'is_corrupt': is_corrupt,
        'shape': str(shape) if shape else None,
        'zoom': str(zoom) if zoom else None,
        'orientation': orientation
    })

df_scans = pd.DataFrame(scans_info)
print(f"\nExtracted Scans DataFrame: {df_scans.shape}")
print(f"Unique Subject IDs found in directory structure: {df_scans['subject_id'].nunique()}")
print(f"Corrupt NIfTI files count: {len(corrupt_files)}")

# Label mapping from metadata CSV
if df_labels is not None:
    # Check common columns for subject ID and diagnosis
    subj_col = None
    diag_col = None
    for c in df_labels.columns:
        if 'subject' in c.lower() or 'ptid' in c.lower() or 'id' in c.lower():
            subj_col = c
        if 'dx' in c.lower() or 'diag' in c.lower() or 'group' in c.lower() or 'class' in c.lower():
            diag_col = c
            
    print(f"\nDerived Subject Col: {subj_col}, Diagnosis Col: {diag_col}")
    if subj_col and diag_col:
        # Merge scans with labels
        df_labels_clean = df_labels.drop_duplicates(subset=[subj_col]).copy()
        df_merged = pd.merge(df_scans, df_labels_clean, left_on='subject_id', right_on=subj_col, how='left')
        print("\nLabel Distribution across discovered NIfTI files:")
        print(df_merged[diag_col].value_counts(dropna=False))
        
        # Unique subjects per class
        print("\nUnique Subjects per Class:")
        print(df_merged.groupby(diag_col)[subj_col].nunique())

# Summary of Shapes, Zooms, Orientations
print("\n--- 3. SPATIAL & ORIENTATION AUDIT ---")
print("Top 5 Image Shapes:")
print(pd.Series(shapes).value_counts().head(5))
print("\nTop 5 Voxel Spacings (Zooms):")
print(pd.Series(zooms).value_counts().head(5))
print("\nTop Orientations:")
print(pd.Series(orientations).value_counts().head(5))
