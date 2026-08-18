# NeuroSense AI — ADNI Alzheimer's Medical & Technical Knowledge Base

## Overview
This document synthesizes core medical imaging domain knowledge, neuroimaging data specifications, coordinate orientation conventions, intensity normalization mechanics, and clinical diagnostic staging relevant to the ADNI Alzheimer's MRI Classification project.

---

## 1. Medical Domain: ADNI Cohort & Clinical Classification

### What is ADNI?
The **Alzheimer's Disease Neuroimaging Initiative (ADNI)** is a multisite longitudinal study tracking clinical, imaging, genetic, and biochemical biomarkers to detect and measure the progression of Alzheimer's disease.

### Diagnostic Groups (Tri-Class Taxonomy):
1. **CN (Cognitively Normal)**: Control subjects exhibiting no memory impairment or cognitive decline. Brain MRI displays normal age-matched cortical thickness and hippocampal volume.
2. **MCI (Mild Cognitive Impairment)**: Transitional state between healthy aging and dementia. Subjects exhibit measurable memory loss without severe impairment in daily functional activities. Brain MRI often shows early structural atrophy in the medial temporal lobe and hippocampus.
3. **AD (Alzheimer's Disease)**: Diagnosed clinical dementia. Brain MRI demonstrates widespread cortical atrophy, severe hippocampal shrinking, and ventricular enlargement.

---

## 2. Medical Neuroimaging Specifications: NIfTI File Format

### What is NIfTI (`.nii` / `.nii.gz`)?
The **Neuroimaging Informatics Technology Initiative (NIfTI)** format is the standard binary format for storing 3D and 4D volumetric medical images (sMRI, fMRI, DTI).

### Structure of a NIfTI File:
- **Header (348 bytes)**: Contains image dimensions $(D_x, D_y, D_z)$, data type (e.g. `float32`, `int16`), voxel spacing dimensions in millimeters $(q_{x}, q_{y}, q_{z})$, and 4x4 spatial affine transformation matrix.
- **Voxel Data Array**: 3D numerical numpy array representing spatial intensity values at each 3D coordinate $(x, y, z)$.

### Affine Matrix & Coordinate Systems:
The affine matrix maps voxel indices $(i, j, k)$ to real-world scanner physical space coordinates $(x, y, z)$ in millimeters:
$$\begin{bmatrix} x \\ y \\ z \\ 1 \end{bmatrix} = \begin{bmatrix} a_{11} & a_{12} & a_{13} & t_x \\ a_{21} & a_{22} & a_{23} & t_y \\ a_{31} & a_{32} & a_{33} & t_z \\ 0 & 0 & 0 & 1 \end{bmatrix} \begin{bmatrix} i \\ j \\ k \\ 1 \end{bmatrix}$$

### Anatomical Orientation Codes (RAS Standard):
- **R / L**: Right $\leftrightarrow$ Left
- **A / P**: Anterior $\leftrightarrow$ Posterior
- **S / I**: Superior $\leftrightarrow$ Inferior

MONAI's `Orientationd(keys=["image"], axcodes="RAS")` re-orients arbitrary scanner orientation codes into standard RAS alignment.

---

## 3. Anatomical Slice Planes

```
              Superior (S)
                  ▲
                  │
  Coronal Plane   │   Sagittal Plane
   (Front View)   │   (Side View)
  ◄───────────────┼───────────────►
  Left (L)        │        Right (R)
                  │
                  ▼
              Inferior (I)

   Axial Plane: Horizontal slice (Top vs Bottom)
```

1. **Axial (Transverse) Plane**: Horizontal cross-section cutting top to bottom. Slices parallel to the ground. Center slice ($z = D_z \times 0.5$) displays ventricles, hippocampus, and cortical cross-section.
2. **Coronal Plane**: Vertical cross-section cutting front to back. Slices parallel to the face. Ideal for viewing hippocampal cross-sectional atrophy.
3. **Sagittal Plane**: Vertical cross-section cutting left to right. Slices parallel to the profile of the head.

---

## 4. Intensity Normalization Mechanics

Unlike standardized Hounsfield Units (HU) in Computed Tomography (CT), sMRI raw voxel intensities do not have absolute physical units. Signal intensity varies across scanner field strengths (1.5T vs 3.0T), coil calibration, and manufacturer protocols.

### 1st & 99th Percentile Normalization:
Raw MRI volumes often contain intense hyper-intense artifacts (e.g. fat, bone marrow signal, exterior noise). Min-max scaling raw voxel values directly results in compressed brain signal near zero.

**Solution**:
1. Calculate $P_1 = \text{percentile}(X, 1.0)$ and $P_{99} = \text{percentile}(X, 99.0)$.
2. Clip array values outside $[P_1, P_{99}]$.
3. Rescale linearly:
   $$X_{\text{norm}} = \frac{X_{\text{clipped}} - P_1}{P_{99} - P_1} \times 255.0$$
