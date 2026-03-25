"""
MLflow configuration for NeuroSense AI model tracking.
"""
import os
import mlflow
from mlflow.tracking import MlflowClient

MLFLOW_TRACKING_URI = os.environ.get('MLFLOW_TRACKING_URI', 'http://localhost:5001')
MLFLOW_EXPERIMENT_NAME = 'neurosense-alzheimer-detection'
MLFLOW_MODEL_STAGES = ['staging', 'production']


def setup_mlflow():
    """Initialize MLflow tracking with configured URI."""
    mlflow.set_tracking_uri(MLFLOW_TRACKING_URI)
    mlflow.set_experiment(MLFLOW_EXPERIMENT_NAME)
    
    experiment = mlflow.get_experiment_by_name(MLFLOW_EXPERIMENT_NAME)
    if experiment is None:
        mlflow.create_experiment(
            MLFLOW_EXPERIMENT_NAME,
            artifact_location=f"{MLFLOW_TRACKING_URI}/artifacts"
        )
    
    mlflow.pytorch.autolog()
    
    return mlflow


def log_model_metrics(model_name: str, metrics: dict, stage: str = None):
    """
    Log metrics for a specific model.
    
    Args:
        model_name: Name of the model (e.g., 'mri_classifier', 'fusion_model')
        metrics: Dictionary of metric names and values
        stage: Model stage if applicable (staging, production)
    """
    with mlflow.start_run(run_name=f"{model_name}_{stage or 'evaluation'}"):
        for name, value in metrics.items():
            mlflow.log_metric(name, value)
        
        if stage:
            mlflow.set_tag('model_stage', stage)
        
        mlflow.set_tag('model_name', model_name)


def register_model(model_path: str, model_name: str, description: str = None, stage: str = 'staging'):
    """
    Register a model in MLflow Model Registry.
    
    Args:
        model_path: Path to the saved model
        model_name: Name for the model in registry
        description: Optional model description
        stage: Initial stage (staging, production)
    
    Returns:
        Model version info
    """
    model_uri = f"runs:/{mlflow.active_run().info.run_id}/{model_path}"
    
    model_version = mlflow.register_model(model_uri, model_name)
    
    client = MlflowClient()
    if description:
        client.update_model_version(
            name=model_name,
            version=model_version.version,
            description=description
        )
    
    if stage in MLFLOW_MODEL_STAGES:
        client.transition_model_version_stage(
            name=model_name,
            version=model_version.version,
            stage=stage
        )
    
    return model_version


def get_production_model(model_name: str):
    """Get the production version of a registered model."""
    client = MlflowClient()
    versions = client.get_latest_versions(model_name, stages=['production'])
    
    if versions:
        return versions[0]
    return None


def load_production_model(model_name: str):
    """Load the production model from MLflow Model Registry."""
    version = get_production_model(model_name)
    
    if version:
        return mlflow.pytorch.load_model(version.source)
    
    raise ValueError(f"No production model found for {model_name}")
