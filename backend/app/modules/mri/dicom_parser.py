"""
DICOM (.dcm) & NIfTI (.nii, .nii.gz) Medical Image Parser.
Extracts clinical MRI metadata (scanner Tesla strength, slice thickness, echo time)
and converts 3D volumetric slices to normalized 2D tensors for classification models.
"""
import os
import logging
import numpy as np
from typing import Dict, Any, Tuple, Optional

logger = logging.getLogger(__name__)

try:
    import pydicom
    HAS_PYDICOM = True
except ImportError:
    HAS_PYDICOM = False

try:
    import nibabel as nib
    HAS_NIBABEL = True
except ImportError:
    HAS_NIBABEL = False

try:
    from PIL import Image
    HAS_PIL = True
except ImportError:
    HAS_PIL = False


class MedicalImageParser:
    """
    Parser for DICOM (.dcm) and NIfTI (.nii, .nii.gz) medical MRI brain scans.
    """

    @staticmethod
    def is_dicom(file_path: str) -> bool:
        return file_path.lower().endswith('.dcm') or (HAS_PYDICOM and pydicom.misc.is_dicom(file_path))

    @staticmethod
    def is_nifti(file_path: str) -> bool:
        return file_path.lower().endswith('.nii') or file_path.lower().endswith('.nii.gz')

    def parse_file(self, file_path: str) -> Dict[str, Any]:
        """Parse DICOM or NIfTI file and return metadata and extracted image array."""
        if not os.path.exists(file_path):
            return {'error': 'File not found', 'success': False}

        if self.is_dicom(file_path):
            return self._parse_dicom(file_path)
        elif self.is_nifti(file_path):
            return self._parse_nifti(file_path)
        else:
            return {'error': 'Unsupported medical image format', 'success': False}

    def _parse_dicom(self, file_path: str) -> Dict[str, Any]:
        if not HAS_PYDICOM:
            return {'error': 'pydicom library not installed', 'success': False}

        try:
            ds = pydicom.dcmread(file_path)
            pixel_array = ds.pixel_array.astype(float)
            
            # Normalize pixel array to 0-255 uint8 range
            pixel_min = np.min(pixel_array)
            pixel_max = np.max(pixel_array)
            if pixel_max > pixel_min:
                normalized = ((pixel_array - pixel_min) / (pixel_max - pixel_min) * 255.0).astype(np.uint8)
            else:
                normalized = pixel_array.astype(np.uint8)

            metadata = {
                'patient_id': str(getattr(ds, 'PatientID', 'Unknown')),
                'patient_name': str(getattr(ds, 'PatientName', 'Unknown')),
                'modality': str(getattr(ds, 'Modality', 'MR')),
                'magnetic_field_strength_tesla': float(getattr(ds, 'MagneticFieldStrength', 3.0)),
                'slice_thickness_mm': float(getattr(ds, 'SliceThickness', 1.0)),
                'repetition_time_ms': float(getattr(ds, 'RepetitionTime', 2000.0)),
                'echo_time_ms': float(getattr(ds, 'EchoTime', 30.0)),
                'image_position_patient': [float(x) for x in getattr(ds, 'ImagePositionPatient', [0, 0, 0])],
                'dimensions': list(pixel_array.shape),
                'format': 'DICOM (.dcm)',
            }

            return {
                'success': True,
                'metadata': metadata,
                'image_array': normalized,
                'has_3d_volume': len(pixel_array.shape) > 2,
            }
        except Exception as e:
            logger.error("Failed to parse DICOM file %s: %s", file_path, e)
            return {'error': f"DICOM parsing error: {str(e)}", 'success': False}

    def _parse_nifti(self, file_path: str) -> Dict[str, Any]:
        if not HAS_NIBABEL:
            return {'error': 'nibabel library not installed', 'success': False}

        try:
            img = nib.load(file_path)
            data = img.get_fdata()
            header = img.header

            # Extract central sagittal/axial slice from 3D/4D volume
            if len(data.shape) >= 3:
                mid_slice_idx = data.shape[2] // 2
                slice_array = data[:, :, mid_slice_idx]
            else:
                slice_array = data

            # Normalize to 0-255 uint8 range
            pixel_min = np.min(slice_array)
            pixel_max = np.max(slice_array)
            if pixel_max > pixel_min:
                normalized = ((slice_array - pixel_min) / (pixel_max - pixel_min) * 255.0).astype(np.uint8)
            else:
                normalized = slice_array.astype(np.uint8)

            zooms = [float(z) for z in header.get_zooms()[:3]] if hasattr(header, 'get_zooms') else [1.0, 1.0, 1.0]

            metadata = {
                'dimensions': list(data.shape),
                'voxel_sizes_mm': zooms,
                'data_type': str(header.get_data_dtype()),
                'format': 'NIfTI (.nii/.nii.gz)',
                'extracted_slice_index': data.shape[2] // 2 if len(data.shape) >= 3 else 0,
            }

            return {
                'success': True,
                'metadata': metadata,
                'image_array': normalized,
                'has_3d_volume': len(data.shape) >= 3,
            }
        except Exception as e:
            logger.error("Failed to parse NIfTI file %s: %s", file_path, e)
            return {'error': f"NIfTI parsing error: {str(e)}", 'success': False}
