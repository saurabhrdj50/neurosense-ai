import os
import sys
import time
import argparse
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import DataLoader
from torchvision import transforms, datasets
from torch.utils.data.sampler import WeightedRandomSampler

# Ensure root path is in sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.modules.mri.model import AlzheimerModel
from app.modules.mri.adni_dataset import ADNINiftiDataset

def get_adni_datasets(base_dir: str, train_ratio: float = 0.8):
    """
    Load ADNI dataset with subject-level splitting to prevent data leakage across longitudinal scans.
    """
    labels_csv = os.path.join(base_dir, 'Metadata', 'ADNI_labels.csv')
    inventory_csv = os.path.join(base_dir, 'Metadata', 'ADNI_MRI_inventory.csv')

    if not os.path.exists(labels_csv) or not os.path.exists(inventory_csv):
        raise FileNotFoundError(f"ADNI metadata CSVs not found in {os.path.join(base_dir, 'Metadata')}")

    full_ds = ADNINiftiDataset(labels_csv=labels_csv, inventory_csv=inventory_csv)
    all_subjects = np.array(full_ds.get_subjects())

    # Random subject-level split
    np.random.seed(42)
    shuffled_subjects = np.random.permutation(all_subjects)
    split_idx = int(len(shuffled_subjects) * train_ratio)
    train_subjects = shuffled_subjects[:split_idx].tolist()
    val_subjects = shuffled_subjects[split_idx:].tolist()

    mean = [0.2682, 0.2682, 0.2682]
    std = [0.3008, 0.3008, 0.3008]

    train_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.RandomHorizontalFlip(),
        transforms.RandomRotation(15),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std)
    ])

    val_transforms = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=mean, std=std)
    ])

    train_ds = ADNINiftiDataset(
        labels_csv=labels_csv,
        inventory_csv=inventory_csv,
        transform=train_transforms,
        subject_filter=train_subjects
    )

    val_ds = ADNINiftiDataset(
        labels_csv=labels_csv,
        inventory_csv=inventory_csv,
        transform=val_transforms,
        subject_filter=val_subjects
    )

    return train_ds, val_ds, ADNINiftiDataset.LABEL_MAP

def train_mri(cohort: str = 'adni', epochs: int = 5, batch_size: int = 32, architecture: str = 'ensemble'):
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
    print(f"Using device: {device} | Cohort: {cohort.upper()} | Arch: {architecture}")

    base_dir = os.path.dirname(__file__)

    if cohort.lower() == 'adni':
        adni_dir = os.path.join(base_dir, 'Alzheimer_Project')
        train_dataset, val_dataset, label_map = get_adni_datasets(adni_dir)
        class_names = [label_map[k] for k in sorted(label_map, key=label_map.get)]
    else:
        data_dir = os.path.join(base_dir, 'data', 'oasis_mri')
        train_dir = os.path.join(data_dir, 'train')
        test_dir = os.path.join(data_dir, 'test')

        if not os.path.exists(train_dir) or not os.path.exists(test_dir):
            raise FileNotFoundError(f"Dataset folders not found in {data_dir}")

        mean = [0.2682, 0.2682, 0.2682]
        std = [0.3008, 0.3008, 0.3008]

        train_transforms = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.RandomHorizontalFlip(),
            transforms.RandomRotation(15),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])

        val_transforms = transforms.Compose([
            transforms.Resize((224, 224)),
            transforms.ToTensor(),
            transforms.Normalize(mean=mean, std=std)
        ])

        train_dataset = datasets.ImageFolder(train_dir, transform=train_transforms)
        val_dataset = datasets.ImageFolder(test_dir, transform=val_transforms)
        class_names = train_dataset.classes

    print(f"Classes ({len(class_names)}): {class_names}")
    print(f"Train samples: {len(train_dataset)}, Validation samples: {len(val_dataset)}")

    # Class weighting to address class imbalance
    targets = train_dataset.get_targets() if hasattr(train_dataset, 'get_targets') else train_dataset.targets
    class_counts = np.bincount(targets)
    print(f"Class counts in train: {dict(zip(range(len(class_counts)), class_counts))}")
    class_weights = 1.0 / np.maximum(class_counts, 1)
    sample_weights = [class_weights[t] for t in targets]
    sampler = WeightedRandomSampler(weights=sample_weights, num_samples=len(sample_weights), replacement=True)

    train_loader = DataLoader(train_dataset, batch_size=batch_size, sampler=sampler, num_workers=0)
    val_loader = DataLoader(val_dataset, batch_size=batch_size, shuffle=False, num_workers=0)

    # Initialize model
    model = AlzheimerModel(num_classes=len(class_names), architecture=architecture).to(device)

    criterion = nn.CrossEntropyLoss()
    optimizer = torch.optim.AdamW(model.parameters(), lr=1e-4, weight_decay=1e-2)

    if cohort.lower() == 'adni':
        output_path = os.path.join(base_dir, 'Alzheimer_Project', 'Models', 'adni_alzheimer_model.pth')
    else:
        output_path = os.path.join(base_dir, 'app', 'models', 'alzheimer_model.pth')
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    best_acc = 0.0

    print(f"\n--- Starting Model Retraining ({cohort.upper()}) ---")
    start_time = time.time()

    try:
        for epoch in range(epochs):
            model.train()
            running_loss = 0.0
            correct = 0
            total = 0

            for i, (images, labels) in enumerate(train_loader):
                images, labels = images.to(device), labels.to(device)

                optimizer.zero_grad()
                outputs = model(images)
                loss = criterion(outputs, labels)
                loss.backward()
                optimizer.step()

                running_loss += loss.item() * images.size(0)
                _, preds = torch.max(outputs, 1)
                correct += (preds == labels).sum().item()
                total += labels.size(0)

                if (i + 1) % 10 == 0 or (i + 1) == len(train_loader):
                    print(f"Epoch [{epoch+1}/{epochs}] Step [{i+1}/{len(train_loader)}] Loss: {loss.item():.4f}")

            epoch_loss = running_loss / max(total, 1)
            epoch_acc = correct / max(total, 1)

            # Evaluation
            model.eval()
            val_correct = 0
            val_total = 0
            with torch.no_grad():
                for images, labels in val_loader:
                    images, labels = images.to(device), labels.to(device)
                    outputs = model(images)
                    _, preds = torch.max(outputs, 1)
                    val_correct += (preds == labels).sum().item()
                    val_total += labels.size(0)

            val_acc = val_correct / max(val_total, 1)
            print(f"==> Epoch [{epoch+1}/{epochs}] Train Loss: {epoch_loss:.4f} | Train Acc: {epoch_acc*100:.2f}% | Val Acc: {val_acc*100:.2f}%")

            if val_acc >= best_acc:
                best_acc = val_acc
                torch.save(model.state_dict(), output_path)
                print(f" Saved new model weights to {output_path} (Val Acc: {best_acc*100:.2f}%)")

        elapsed = time.time() - start_time
        print(f"\nTraining completed in {elapsed/60:.2f} minutes. Best Validation Accuracy: {best_acc*100:.2f}%")
        print(f"Final model stored at: {output_path}")
    except Exception as e:
        import traceback
        print("EXCEPTION IN TRAIN:")
        traceback.print_exc()
        raise e

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Train MRI Diagnostic Model on ADNI or OASIS')
    parser.add_argument('--cohort', type=str, default='adni', choices=['adni', 'oasis'], help='Cohort dataset to train on')
    parser.add_argument('--epochs', type=int, default=5, help='Number of epochs')
    parser.add_argument('--batch_size', type=int, default=32, help='Batch size')
    parser.add_argument('--architecture', type=str, default='ensemble', choices=['resnet18', 'swin', 'convnext', 'efficientnet', 'ensemble'], help='Model architecture')
    args = parser.parse_args()

    train_mri(cohort=args.cohort, epochs=args.epochs, batch_size=args.batch_size, architecture=args.architecture)
