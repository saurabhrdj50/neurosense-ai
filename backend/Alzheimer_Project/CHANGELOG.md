# Changelog — ADNI MRI Diagnostic Classifier Pipeline

## [Unreleased] - 2026-08-16

### Fixed
- **Root Cause Fix for CrossEntropyLoss Weight Tensor Shape Mismatch (`[2]` vs `[3]`)**:
  - **Issue**: When `SMOKE_TEST = True` was enabled, the pipeline executed naive `.head(8)` / `.head(4)` truncation on dataset splits. Because `.head()` selected top rows sequentially without stratification, all AD scans were discarded from `train_df` (leaving 4 CN, 4 MCI, and 0 AD scans). Consequently, `compute_class_weight` returned a 2-element array (`[2]`), causing PyTorch's `nn.CrossEntropyLoss(weight=class_weights_tensor)` to crash with a `RuntimeError` during model execution because the logits tensor had shape `[batch_size, 3]`.
  - **Fix 1 (Stratified SMOKE_TEST Subsampling)**:
    - Replaced naive `.head(N)` truncation in Cell 7 (`build_full_notebook.py` / `ADNI_MRI_Classifier_Training.ipynb`) with `get_stratified_smoke_subset()`.
    - Samples $N$ scans per class (`min_per_class=3` for train, `min_per_class=2` for val and test) across all 3 classes (`CN`, `MCI`, `AD`).
    - Preserves 100% subject-level disjointness and zero data leakage.
  - **Fix 2 (Mandatory Post-Split Class Assertions)**:
    - Added explicit post-split validation assertions in Cell 7 immediately following split creation.
    - Asserts that all 3 diagnostic classes (`CN`, `MCI`, `AD`) exist in Train, Validation, and Test splits.
    - Raises a descriptive `RuntimeError` if any class is missing from any split before dataset construction proceeds.
  - **Fix 3 (Explicit Class Weights & Shape Validation)**:
    - Updated Cell 13 (`CLASS IMBALANCE LOSS WEIGHTING`) to calculate weights using explicit class indices `classes=np.arange(NUM_CLASSES)` (`[0, 1, 2]`) instead of `np.unique(train_labels)`.
    - Added validation check to ensure all `NUM_CLASSES` are present in `train_df`.
    - Added strict assertion `class_weights_tensor.shape[0] == NUM_CLASSES` to guarantee tensor length is always `[3]`.
  - **Fix 4 (Enhanced Pre-Training Diagnostics)**:
    - Added detailed dataset summary printouts in Cell 7, Cell 10, and Cell 13 detailing scan counts, subject counts, unique classes per split (`['CN', 'MCI', 'AD']`), computed class weights, and weight tensor shape (`[3]`).

### Deliverables Modified / Regenerated
- `backend/Alzheimer_Project/build_full_notebook.py`
- `backend/Alzheimer_Project/Notebooks/ADNI_MRI_Classifier_Training.ipynb`
- `backend/Alzheimer_Project/CHANGELOG.md`
