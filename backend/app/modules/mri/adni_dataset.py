import os
import pandas as pd
import numpy as np
import torch
from torch.utils.data import Dataset
from torchvision import transforms
import nibabel as nib
from typing import Tuple, List, Optional, Dict, Any

class ADNINiftiDataset(Dataset):
    """
    PyTorch Dataset for loading 3D ADNI NIfTI MRI volumes and extracting 2D slices
    or multi-slice representations for deep learning diagnostic models.
    """

    LABEL_MAP = {
        'CN': 0,
        'MCI': 1,
        'AD': 2
    }

    INV_LABEL_MAP = {v: k for k, v in LABEL_MAP.items()}

    def __init__(
        self,
        labels_csv: str,
        inventory_csv: str,
        dataset_base_dir: Optional[str] = None,
        transform: Optional[transforms.Compose] = None,
        slice_plane: str = 'axial',
        slice_fraction: float = 0.5,
        subject_filter: Optional[List[str]] = None
    ):
        """
        Args:
            labels_csv: Path to ADNI_labels.csv
            inventory_csv: Path to ADNI_MRI_inventory.csv
            dataset_base_dir: Override directory for NIfTI relative paths if needed
            transform: PyTorch vision transforms to apply to the extracted 2D slice
            slice_plane: Slice view ('axial', 'coronal', 'sagittal')
            slice_fraction: Relative slice index (0.5 = middle slice)
            subject_filter: Optional list of Subject IDs to include (for train/val splits)
        """
        self.labels_df = pd.read_csv(labels_csv)
        self.inventory_df = pd.read_csv(inventory_csv)

        # Standardize column names (spaces to underscores)
        self.labels_df.columns = [c.replace(' ', '_') for c in self.labels_df.columns]
        self.inventory_df.columns = [c.replace(' ', '_') for c in self.inventory_df.columns]

        self.transform = transform
        self.slice_plane = slice_plane.lower()
        self.slice_fraction = slice_fraction

        # If inventory already contains Group and MRI_Path, use it directly, else merge with labels
        if 'Group' in self.inventory_df.columns and 'MRI_Path' in self.inventory_df.columns:
            merged = self.inventory_df.copy()
        elif 'Image_Data_ID' in self.labels_df.columns and 'Image_Data_ID' in self.inventory_df.columns:
            merged = pd.merge(
                self.inventory_df,
                self.labels_df[['Subject', 'Image_Data_ID', 'Group', 'Age', 'Sex']],
                on=['Subject', 'Image_Data_ID'],
                how='inner'
            )
        else:
            merged = pd.merge(
                self.inventory_df,
                self.labels_df[['Subject', 'Group', 'Age', 'Sex']],
                on='Subject',
                how='inner'
            )

        # Remove missing files or unmapped groups
        merged = merged[merged['Group'].isin(self.LABEL_MAP.keys())].copy()

        if subject_filter is not None:
            merged = merged[merged['Subject'].isin(subject_filter)].copy()

        self.data = merged.reset_index(drop=True)
        self.dataset_base_dir = dataset_base_dir

    def __len__(self) -> int:
        return len(self.data)

    def _resolve_file_path(self, raw_path: str) -> str:
        if os.path.exists(raw_path):
            return raw_path
        
        # If relative to dataset base dir or backend project root
        if self.dataset_base_dir:
            basename = os.path.basename(raw_path)
            # Check recursive search or relative assembly
            candidate = os.path.join(self.dataset_base_dir, basename)
            if os.path.exists(candidate):
                return candidate
        
        return raw_path

    def extract_slice(self, volume: np.ndarray) -> np.ndarray:
        """Extract a 2D slice from a 3D NIfTI numpy array."""
        depth_x, depth_y, depth_z = volume.shape[:3]

        if self.slice_plane == 'axial':
            idx = int(depth_z * self.slice_fraction)
            slice_2d = volume[:, :, min(idx, depth_z - 1)]
        elif self.slice_plane == 'coronal':
            idx = int(depth_y * self.slice_fraction)
            slice_2d = volume[:, min(idx, depth_y - 1), :]
        elif self.slice_plane == 'sagittal':
            idx = int(depth_x * self.slice_fraction)
            slice_2d = volume[min(idx, depth_x - 1), :, :]
        else:
            idx = int(depth_z * self.slice_fraction)
            slice_2d = volume[:, :, min(idx, depth_z - 1)]

        # Min-max intensity normalization to [0, 255]
        p_min, p_max = np.percentile(slice_2d, (1, 99))
        if p_max > p_min:
            slice_2d = np.clip(slice_2d, p_min, p_max)
            slice_2d = (slice_2d - p_min) / (p_max - p_min) * 255.0
        else:
            slice_2d = np.zeros_like(slice_2d)

        slice_2d = slice_2d.astype(np.uint8)
        # Duplicate 1-channel grayscale into 3 channels for standard CNN backbones
        slice_3ch = np.stack([slice_2d] * 3, axis=-1)
        return slice_3ch

    def __getitem__(self, idx: int) -> Tuple[torch.Tensor, int]:
        row = self.data.iloc[idx]
        file_path = self._resolve_file_path(str(row['MRI_Path']))

        try:
            nii = nib.load(file_path)
            volume = nii.get_fdata()
            slice_np = self.extract_slice(volume)
        except Exception:
            # Fallback to zero volume if load fails
            slice_np = np.zeros((224, 224, 3), dtype=np.uint8)

        # Convert numpy slice to PIL / Tensor via transforms
        from PIL import Image
        img = Image.fromarray(slice_np)

        if self.transform:
            img_tensor = self.transform(img)
        else:
            img_tensor = transforms.ToTensor()(img)

        group_label = str(row['Group'])
        target = self.LABEL_MAP.get(group_label, 0)

        return img_tensor, target

    def get_subjects(self) -> List[str]:
        return self.data['Subject'].unique().tolist()

    def get_targets(self) -> List[int]:
        return [self.LABEL_MAP[g] for g in self.data['Group']]
