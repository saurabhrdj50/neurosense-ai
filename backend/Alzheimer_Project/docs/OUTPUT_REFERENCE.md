# NeuroSense AI — ADNI Alzheimer's Output Reference

## Overview
This reference guide details all generated files, metrics, schema structures, model weights, and visual outputs produced across the diagnostic audit, hardware profiler, and model training workflows.

---

## 1. Audit Deliverables (`backend/Alzheimer_Project/ADNI_Audit_Outputs/`)

### `project_audit.json`
Contains a complete inventory of project directories, files, scripts, metadata, and missing critical assets.
- **Key Schema Keys**:
  - `project_root`: Absolute string path to the project root.
  - `folder_tree`: List of relative directory paths discovered.
  - `python_modules`: List of `.py` script files found.
  - `notebooks`: List of `.ipynb` Jupyter Notebooks found.
  - `metadata_files`: List of CSV and text metadata files found.
  - `model_files`: List of PyTorch model weight files (`.pth`, `.pt`).
  - `missing_assets`: List of expected files/folders that were missing.

### `pipeline_report.json`
Validates the DataLoader implementation and MONAI pipeline execution.
- **Key Schema Keys**:
  - `dataloader_passed`: Boolean flag (`True` if DataLoader iterated successfully).
  - `batch_shape`: Dimensions of input batch tensor (e.g. `[2, 1, 64, 64, 64]`).
  - `tensor_dtype`: Data type string (e.g. `torch.float32`).
  - `nan_detected`: Boolean flag (`False` if no NaN values exist in batch).
  - `inf_detected`: Boolean flag (`False` if no Inf values exist in batch).
  - `sample_subject_ids`: List of Subject IDs included in the test batch.

### `dataset_statistics.csv`
Contains demographic breakdowns and scan counts per diagnostic class.
- **Columns**: `Group`, `Total_Scans`, `Unique_Subjects`, `Mean_Age`, `Std_Age`, `Male_Count`, `Female_Count`.

### `quality_summary.csv`
Contains intensity distribution metrics and slice quality checks for sampled NIfTI volumes.
- **Columns**: `filename`, `shape`, `min_intensity`, `max_intensity`, `p1_percentile`, `p99_percentile`, `zero_voxel_pct`, `blank_slice_count`, `total_axial_slices`.

### `audit_summary.pdf`
Single-page visual summary PDF aggregating dataset stats, leakage checks, and pipeline verification status.

---

## 2. Hardware Profiler Deliverables (`backend/Alzheimer_Project/ADNI_Profiler_Outputs/`)

### `hardware_report.json`
Profiles the system compute execution environment.
- **Key Schema Keys**:
  - `python_version`: Version string (e.g., `3.12.13`).
  - `pytorch_version`: Version string (e.g., `2.11.0+cu128`).
  - `monai_version`: Version string (e.g., `1.6.0`).
  - `timm_version`: Version string (e.g., `1.0.25`).
  - `cuda_available`: Boolean flag (`True` if CUDA GPU detected).
  - `gpu_name`: GPU model string (e.g., `Tesla T4`).
  - `gpu_vram_gb`: Total VRAM in Gigabytes (e.g., `15.64`).
  - `system_ram_gb`: System RAM in Gigabytes (e.g., `12.67`).
  - `cpu_count_logical`: Number of logical CPU cores (e.g., `2`).

### `model_report.json`
Benchmark metrics for evaluated neural network architectures.
- **Key Schema Keys** (List of Objects):
  - `model_name`: Architecture string (e.g. `MONAI_3D_ResNet18`).
  - `input_shape`: Dimensions of input tensor.
  - `total_parameters`: Total parameter count.
  - `trainable_parameters`: Count of trainable parameters.
  - `weight_size_mb`: Size of model weights in Megabytes.
  - `latency_ms_per_batch`: Forward pass execution time in milliseconds.
  - `throughput_fps`: Processed images per second.

### `training_readiness.json`
Calculated hyperparameter recommendations and bottleneck identification.
- **Key Schema Keys**:
  - `gpu_cuda_ready`: Boolean flag.
  - `amp_fp16_supported`: Boolean flag for Mixed Precision support.
  - `recommended_batch_size_3d`: Recommended batch size for 3D volumes (e.g. `4`).
  - `recommended_batch_size_2d`: Recommended batch size for 2D slices (e.g. `32`).
  - `recommended_num_workers`: Recommended DataLoader worker count.
  - `potential_bottlenecks`: List of human-readable bottleneck strings.
  - `recommendations`: List of optimization recommendations.

### `profiler_summary.pdf`
Single-page capacity planning PDF summarizing GPU hardware, model benchmarks, and recommended training configurations.

---

## 3. Model Weights & Training Deliverables (`backend/Alzheimer_Project/Models/` & `Training_Outputs/`)

### `Models/adni_alzheimer_model.pth`
Binary PyTorch state dictionary storing trained model weights.
- **Format**: PyTorch `torch.save(model.state_dict(), path)` binary blob.
- **Model Key Names**: Contains layer parameters for `backbone_swin`, `backbone_convnext`, `backbone_effnet`, and classification heads.

### `Training_Outputs/Figures/sample_mri_previews.png`
Grid plot image displaying preprocessed 2D axial slice previews with overlaid Subject IDs and ground-truth diagnosis labels.
