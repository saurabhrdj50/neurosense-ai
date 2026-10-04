"""Production MRI inference smoke tests (no training, no ADNI dependency)."""
from app.config.settings import Config


class TestProductionMRIArtifact:
    def test_checkpoint_present(self):
        assert Config.MODEL_PATH.exists(), f"Missing production checkpoint at {Config.MODEL_PATH}"
        assert Config.MODEL_PATH.stat().st_size > 1_000_000

    def test_classifier_loads_without_training_code(self):
        from app.ml.mri.inference import MRIClassifier
        clf = MRIClassifier(model_path=str(Config.MODEL_PATH))
        assert clf.is_available, clf.load_error
        assert clf.model is not None

    def test_checkpoint_is_3_class_adni_lineage(self):
        """Active checkpoint must be the 3-class CN/MCI/AD ResNet18.

        Provenance (read-only training sources): train_mri.py saves
        app/models/alzheimer_model.pth with LABEL_MAP {CN:0, MCI:1, AD:2};
        finetuning notebooks and 5fold_subject_grouped_metadata.csv agree.
        """
        import torch
        from app.ml.mri.inference import MRIClassifier
        state = torch.load(str(Config.MODEL_PATH), map_location='cpu', weights_only=False)
        assert tuple(state['classifier.weight'].shape) == (3, 512)
        assert MRIClassifier._infer_num_classes(state) == 3

    def test_predict_returns_genuine_schema(self, tmp_path):
        from PIL import Image
        from app.ml.mri.inference import MRIClassifier
        img = tmp_path / "scan.png"
        Image.new("RGB", (64, 64), color=(128, 128, 128)).save(img)
        clf = MRIClassifier(model_path=str(Config.MODEL_PATH))
        out = clf.predict(str(img))
        assert out.get("stage") in ("Non-Demented", "Very Mild Demented", "Mild Demented", "Moderate Demented")
        assert 0 <= out.get("confidence", -1) <= 100
        assert isinstance(out.get("probabilities"), dict)
        # No fabricated clinical measurements in genuine inference output.
        for key in ("hippocampal_volume", "cortical_thickness", "brain_age", "segmentation", "quality_score"):
            assert key not in out
