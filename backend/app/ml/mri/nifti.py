import logging

import numpy as np
from scipy.ndimage import zoom

logger = logging.getLogger(__name__)

TARGET_SIZE = 224
NUM_SLICES = 32
BRAIN_THRESHOLD = 0.40
BG_THRESHOLD_PERCENTILE = 50


def _get_nibabel():
    try:
        import nibabel as nib
        return nib
    except ImportError:
        raise RuntimeError(
            "NIfTI reader (nibabel) is not installed. "
            "Run: pip install nibabel"
        )


def load_volume(path: str) -> np.ndarray:
    """
    Load a NIfTI volume and return a 3D float32 array in (H, W, slices)
    ordering, i.e. axial slices along the LAST axis.
    """
    nib = _get_nibabel()

    img = nib.load(path)
    img = nib.as_closest_canonical(img)
    data = np.asanyarray(img.dataobj, dtype=np.float32)

    if data.ndim == 4:
        data = _pick_middle_series(data)
    elif data.ndim != 3:
        raise ValueError(
            f"Unsupported MRI volume dimensions: {data.shape}"
        )

    if data.size == 0:
        raise ValueError("Loaded MRI volume is empty.")

    return _move_slice_axis_to_last(data)


def _pick_middle_series(data4: np.ndarray) -> np.ndarray:
    """Collapse a 4D volume (x,y,z,t) by keeping the most informative frame."""
    volumes = [data4[..., i] for i in range(data4.shape[3])]
    scores = []
    for vol in volumes:
        lo, hi = np.percentile(vol, [1, 99])
        scores.append(float(hi - lo))
    return volumes[int(np.argmax(scores))]


def _move_slice_axis_to_last(data3: np.ndarray) -> np.ndarray:
    """Move the through-plane (usually smallest) axis to the last position."""
    axis = int(np.argmin(data3.shape))
    return np.moveaxis(data3, axis, -1)


def estimate_brain_mask(data: np.ndarray) -> np.ndarray:
    """
    Approximate skull-stripping with an intensity threshold.
    This is a lightweight stand-in for SynthStrip used during training.
    """
    nonzero = data[data > 0]
    if nonzero.size == 0:
        nonzero = data.ravel()

    lower = float(np.percentile(nonzero, BG_THRESHOLD_PERCENTILE))
    floor = 0.05 * float(data.max())
    return data > max(lower, floor)


def zscore_brain(data: np.ndarray, mask: np.ndarray) -> np.ndarray:
    """Clip to brain 1-99 percentile then Z-score using brain voxels only."""
    brain = data[mask]
    if len(brain) == 0:
        raise ValueError("No brain voxels detected in MRI volume.")

    p1, p99 = np.percentile(brain, [1, 99])
    clipped = np.clip(data, p1, p99)

    clipped_brain = clipped[mask]
    mean = float(clipped_brain.mean())
    std = float(clipped_brain.std())
    if std < 1e-8:
        raise ValueError("MRI intensity standard deviation is zero.")

    normalized = (clipped - mean) / (std + 1e-8)
    normalized[~mask] = 0.0
    return normalized.astype(np.float32)


def resize_preserve_aspect(slice_2d: np.ndarray, target_size: int = TARGET_SIZE) -> np.ndarray:
    h, w = slice_2d.shape
    if h == 0 or w == 0:
        return np.zeros((target_size, target_size), dtype=np.float32)

    scale = min(target_size / h, target_size / w)
    new_h = max(int(round(h * scale)), 1)
    new_w = max(int(round(w * scale)), 1)

    resized = zoom(slice_2d, (scale, scale), order=1)

    canvas = np.zeros((target_size, target_size), dtype=np.float32)
    top = (target_size - new_h) // 2
    left = (target_size - new_w) // 2
    canvas[top:top + new_h, left:left + new_w] = resized[:new_h, :new_w]
    return canvas


def select_informative_slices(mask: np.ndarray, num_slices: int = NUM_SLICES) -> np.ndarray:
    """
    Pick slices whose brain area is at least 40% of the largest slice,
    then sample `num_slices` evenly spaced positions among them
    (mirrors the training notebook).
    """
    brain_area = np.sum(mask, axis=(0, 1))
    max_area = brain_area.max()
    if max_area <= 0:
        raise ValueError("No foreground voxels detected in the MRI volume.")

    informative = np.where(brain_area >= BRAIN_THRESHOLD * max_area)[0]
    if len(informative) < num_slices:
        informative = np.where(brain_area > 0)[0]
    if len(informative) < num_slices:
        raise ValueError(
            f"Only {len(informative)} informative slices found in the MRI volume."
        )

    positions = np.linspace(0, len(informative) - 1, num_slices).round().astype(int)
    return informative[positions]


def create_2_5d_samples(normalized: np.ndarray, selected_slices: np.ndarray) -> np.ndarray:
    """
    Build (num_slices, 224, 224, 3) samples where each channel is the
    previous / center / next axial slice (2.5D, as in training).
    """
    depth = normalized.shape[2]
    samples = []

    for center_slice in selected_slices:
        idx = int(center_slice)
        previous_slice = max(0, idx - 1)
        next_slice = min(depth - 1, idx + 1)

        channels = [
            resize_preserve_aspect(normalized[:, :, s])
            for s in (previous_slice, idx, next_slice)
        ]
        samples.append(np.stack(channels, axis=-1).astype(np.float32))

    volume = np.array(samples, dtype=np.float32)
    if volume.shape != (len(selected_slices), TARGET_SIZE, TARGET_SIZE, 3):
        raise ValueError(f"Unexpected processed volume shape: {volume.shape}")
    return volume


def preprocess_volume(path: str):
    data = load_volume(path)
    mask = estimate_brain_mask(data)
    normalized = zscore_brain(data, mask)
    selected_slices = select_informative_slices(mask)
    samples = create_2_5d_samples(normalized, selected_slices)
    return samples, selected_slices


def render_volume_preview(path: str, size: int = 256) -> np.ndarray:
    """
    Render a single uint8 axial slice (the middle informative one) for
    Grad-CAM heatmap overlays.
    """
    data = load_volume(path)
    mask = estimate_brain_mask(data)
    normalized = zscore_brain(data, mask)
    selected_slices = select_informative_slices(mask)

    center_index = int(selected_slices[len(selected_slices) // 2])
    slice_2d = resize_preserve_aspect(normalized[:, :, center_index], size)

    mn, mx = float(slice_2d.min()), float(slice_2d.max())
    if mx - mn > 1e-6:
        return ((slice_2d - mn) / (mx - mn) * 255.0).astype(np.uint8)
    return np.zeros((size, size), dtype=np.uint8)