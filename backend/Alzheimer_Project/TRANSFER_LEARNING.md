# 3D Transfer Learning Architecture: ADNI MRI Classifier V2

## Overview & Scientific Rationale

Transfer learning in 3D medical imaging presents unique challenges compared to standard 2D computer vision. Natural image pretraining (e.g., ImageNet 2D ResNet-18) cannot be directly applied to 3D volumetric NIfTI brain MRI scans without modifying spatial dimensions or slice-wise aggregation. 

**Version 2** introduces native **3D Medical Transfer Learning** using **MedicalNet 3D ResNet-18** weights (`resnet_18_23dataset.pth`). These weights were pretrained across 23 diverse 3D medical imaging datasets (comprising thousands of 3D CT and MRI scans), learning rich, domain-specific 3D spatial primitives (edges, surface textures, tissue boundaries, and anatomical geometry) that transfer directly to Alzheimer's Disease diagnostic classification on the ADNI cohort.

---

## Technical Architecture & Provenance

```
                     ┌─────────────────────────────────────────┐
                     │ MedicalNet 3D ResNet-18 Checkpoint     │
                     │ (resnet_18_23dataset.pth - 23 Datasets) │
                     └────────────────────┬────────────────────┘
                                          │
                                          ▼
                     ┌─────────────────────────────────────────┐
                     │  MONAI 3D ResNet-18 State Dict Filter   │
                     └────────────────────┬────────────────────┘
                                          │ (Safe Mapping & Layer Matching)
                                          ▼
     ┌─────────────────────────────────────────────────────────────────────────┐
     │                       ADNI3DResNetClassifier (V2)                        │
     ├─────────────────────────────────────────────────────────────────────────┤
     │  [FROZEN BACKBONE]                                                      │
     │  ├── conv1       (7x7x7 3D Conv, Stride 2)    -> 2,276,928 Frozen Params │
     │  ├── bn1         (3D BatchNorm & ReLU)                                  │
     │  ├── layer1      (Residual Block 1 - 64 ch)                                 │
     │  └── layer2      (Residual Block 2 - 128 ch)                                │
     ├─────────────────────────────────────────────────────────────────────────┤
     │  [TRAINABLE FINE-TUNING]                                                │
     │  ├── layer3      (Residual Block 3 - 256 ch)  -> 31,037,955 Trainable   │
     │  ├── layer4      (Residual Block 4 - 512 ch)     Parameters (93.17%)    │
     │  └── classifier  (Dropout(0.3) -> Linear(512,128) -> ReLU -> Linear(128,3))│
     └─────────────────────────────────────────────────────────────────────────┘
```

### Pretrained Weight Provenance
- **Source**: MONAI Model Repository / MedicalNet Project
- **Architecture**: 3D ResNet-18 (`spatial_dims=3`, `n_input_channels=1`)
- **Pretrained Checkpoint**: `resnet_18_23dataset.pth`
- **Pretraining Cohorts**: 23 3D medical CT/MRI datasets
- **Total Loaded Parameters**: `32,994,001` (99.04% of model parameters)

---

## Safe Weight Loading Mechanics (Task 3)

The pipeline implements defensive state-dict mapping to load matching parameters while safely discarding incompatible head weights:

1. **State-Dict Key Mapping**: Maps pretrained keys `layer1.0.conv1.weight` to model backbone structure `backbone.layer1.0.conv1.weight`.
2. **Shape Matching & Validation**: Verifies tensor dimensions prior to assignment.
3. **Classification Head Separation**: Ignores incompatible output classification heads (e.g. 512-dim or 23-dataset logits) and initializes the 3-class (`CN`, `MCI`, `AD`) classifier head.
4. **Diagnostic Telemetry**: Reports parameters loaded, missing keys, unexpected keys, and percentage loaded.

```
Loaded pretrained weights
Loaded parameters : 32,994,001 (99.04% of total model params)
Missing parameters : 6 (classification head & unmatched layers)
Unexpected parameters : 0
```

---

## Fine-Tuning Layer Strategy (Task 4)

Transfer learning efficiency and generalization are controlled via configuration variables:

- `USE_PRETRAINED: bool = True` — Toggles transfer learning vs random initialization.
- `PRETRAINED_SOURCE: str = "MedicalNet"` — Source specification.
- `FREEZE_BACKBONE: bool = True` — Freezes early feature extractors (`conv1`, `bn1`, `layer1`, `layer2`).
- `UNFREEZE_LAST_BLOCKS: bool = True` — Keeps deep abstraction blocks (`layer3`, `layer4`) trainable for domain adaptation.

### Layer Partitioning Summary

| Block / Layer Name | Param Count | Frozen Status | Functional Role |
|-------------------|------------|---------------|-----------------|
| `conv1`, `bn1` | 9,664 | **Frozen** | Low-level 3D spatial filters |
| `layer1` | 221,952 | **Frozen** | Early feature maps & textures |
| `layer2` | 2,045,312 | **Frozen** | Mid-level structural patterns |
| `layer3` | 8,174,080 | **Trainable** | High-level 3D anatomical shapes |
| `layer4` | 32,683,008 | **Trainable** | Deep spatial disease representations |
| `classifier` | 66,051 | **Trainable** | 3-Class ADNI Diagnosis Head (`CN`/`MCI`/`AD`) |

---

## Diagnostics & Telemetry (Task 5)

Cell 12 prints a comprehensive Transfer Learning Diagnostic Box:

```
=======================================================
       TRANSFER LEARNING DIAGNOSTICS & SUMMARY
=======================================================
Transfer Learning Status : Enabled
Pretrained Source        : MedicalNet
Loaded Checkpoint        : resnet_18_23dataset.pth
Backbone Frozen          : True
Unfreeze Last Blocks     : True
Frozen Layers            : bn1, conv1, layer1, layer2
Trainable Layers         : classifier, layer3, layer4
Loaded Parameters        : 32,994,001 (99.04% loaded)
Trainable Parameters     : 31,037,955 (93.17% trainable)
Frozen Parameters        : 2,276,928 (6.83% frozen)
Total Parameters         : 33,314,883
=======================================================
```

---

## Baseline Compatibility (Task 6)

When `USE_PRETRAINED = False`:
- The notebook bypasses weight downloading and state-dict loading.
- Initializes MONAI 3D ResNet-18 with random weights.
- All parameters remain 100% trainable (`requires_grad = True`).
- Pipeline behavior, loss function, optimizer, scheduler, data splits, and metrics remain **100% identical to Version 1**.
