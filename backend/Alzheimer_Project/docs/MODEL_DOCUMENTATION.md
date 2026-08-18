# NeuroSense AI — ADNI Alzheimer's Model Documentation

## Overview
The `AlzheimerModel` class located in `backend/app/modules/mri/model.py` provides a research-grade, flexible neural network architecture for 3-class Alzheimer's disease diagnosis (`CN`, `MCI`, `AD`). It supports 5 backbone configurations:
1. **ResNet-18 (2D)** (`torchvision.models.resnet18`)
2. **Swin Transformer** (`timm.create_model('swin_base_patch4_window7_224')`)
3. **ConvNeXt V2** (`timm.create_model('convnextv2_tiny')`)
4. **EfficientNet-B4 / V2** (`timm.create_model('efficientnet_b4')`)
5. **Soft-Voting Ensemble** (Swin + ConvNeXt V2 + EfficientNet-B4)

In addition, MONAI 3D ResNet-18 (`monai.networks.nets.resnet18`) is supported for direct 3D volumetric tensor inputs.

---

## 1. Supported Neural Architectures

### Architecture 1: ResNet-18 (2D Baseline)
- **Source**: `torchvision.models.resnet18`
- **Input Shape**: `(B, 3, 224, 224)`
- **Feature Layer**: Replaces original FC layer with a classification head:
  - `Linear(512, 256)`
  - `ReLU()`
  - `Dropout(p=0.4)`
  - `Linear(256, num_classes)`
- **Parameters**: ~11.3M parameters
- **Use Case**: Lightweight, fast baseline model for rapid local debugging.

### Architecture 2: Swin Transformer (`swin`)
- **Source**: `timm.create_model('swin_base_patch4_window7_224')`
- **Input Shape**: `(B, 3, 224, 224)`
- **Mechanism**: Shifted Window self-attention mechanism capturing non-local relationships and global spatial dependencies across MRI slices.
- **Parameters**: ~88M parameters

### Architecture 3: ConvNeXt V2 (`convnext`)
- **Source**: `timm.create_model('convnextv2_tiny')`
- **Input Shape**: `(B, 3, 224, 224)`
- **Mechanism**: Modern pure-convolutional architecture using depthwise separable convolutions, inverted bottlenecks, and Fully Convolutional Masked Autoencoder pretraining.
- **Parameters**: ~28M parameters

### Architecture 4: EfficientNet-B4 (`efficientnet`)
- **Source**: `timm.create_model('efficientnet_b4')`
- **Input Shape**: `(B, 3, 224, 224)`
- **Mechanism**: Compound scaling balancing network depth, width, and resolution with MBConv blocks and Squeeze-and-Excitation (SE) attention.
- **Parameters**: ~19M parameters

### Architecture 5: Soft-Voting Ensemble (`ensemble` — Default)
- **Composition**: Combines Swin Transformer, ConvNeXt V2, and EfficientNet-B4 in parallel.
- **Forward Logic**:
  $$z_{\text{swin}} = \text{Backbone}_{\text{swin}}(X)$$
  $$z_{\text{conv}} = \text{Backbone}_{\text{convnext}}(X)$$
  $$z_{\text{eff}} = \text{Backbone}_{\text{effnet}}(X)$$
  $$\text{Logits} = \frac{z_{\text{swin}} + z_{\text{conv}} + z_{\text{eff}}}{3.0}$$
- **Robustness & Fallback**: If an error occurs during ensemble forward pass, the model gracefully falls back to `EfficientNet-B4` single-stream prediction or linear feature projection.

---

## 2. Model Latency & Memory Footprint

Based on non-training benchmark results from `ADNI_Model_Profiler.ipynb` (run on NVIDIA Tesla T4 GPU with PyTorch 2.11.0 + MONAI 1.6.0):

| Model Name | Input Dimension | Parameter Count | Weight Size (MB) | Latency (ms/batch) | Throughput (FPS) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **MONAI 3D ResNet-18** | `(2, 1, 64, 64, 64)` | 33,171,971 | 126.54 MB | 14.86 ms | 134.62 FPS |
| **TorchVision 2D ResNet-18** | `(4, 3, 224, 224)` | 11,278,083 | 43.02 MB | 6.84 ms | 584.80 FPS |
| **timm EfficientNet-B4** | `(4, 3, 224, 224)` | 17,552,211 | 66.96 MB | 16.59 ms | 241.11 FPS |
| **Ensemble (Swin+ConvNeXt+Eff)** | `(4, 3, 224, 224)` | ~135,000,000 | ~515 MB | ~45.00 ms | ~88.89 FPS |

---

## 3. Loss Functions & Optimizers

### Loss Function: Cross-Entropy Loss
For a batch of size $B$ with 3 diagnostic classes (`CN`: 0, `MCI`: 1, `AD`: 2):
$$\mathcal{L}_{CE} = -\frac{1}{B} \sum_{i=1}^B \log \left( \frac{e^{z_{i, y_i}}}{\sum_{j=0}^2 e^{z_{i, j}}} \right)$$

### Class Weighting Strategy
To handle cohort class imbalance without manual oversampling, sample weights are supplied to PyTorch's `WeightedRandomSampler`:
$$w_c = \frac{1}{\text{Count}(c)}$$
Sample $i$ receives weight $w_{y_i}$. The DataLoader samples with replacement based on these probabilities, ensuring each batch contains balanced proportions of `CN`, `MCI`, and `AD` subjects.

### Optimizer: AdamW
- **Learning Rate ($\eta$)**: `1e-4`
- **Weight Decay ($\lambda$)**: `1e-2` (L2 regularization to prevent overfitting on small sMRI cohorts)
- **Betas ($\beta_1, \beta_2$)**: `(0.9, 0.999)`
- **Epsilon ($\epsilon$)**: `1e-8`

---

## 4. Checkpoint Serialization Format
Model state dictionary is saved using PyTorch serialization:
- **Output File**: `backend/Alzheimer_Project/Models/adni_alzheimer_model.pth`
- **Saving Condition**: State dictionary is overwritten only when epoch validation accuracy exceeds historical `best_acc`:
```python
if val_acc >= best_acc:
    best_acc = val_acc
    torch.save(model.state_dict(), output_path)
```
- **Loading State Dict**:
```python
model = AlzheimerModel(num_classes=3, architecture='ensemble')
model.load_state_dict(torch.load('Models/adni_alzheimer_model.pth', map_location=device))
model.eval()
```
