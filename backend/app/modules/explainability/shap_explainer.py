"""
Explainability Module for AI Model Interpretability.
Provides SHAP, LIME, and attention visualization.
"""
import logging
from typing import Dict, Any, List, Optional, Tuple
import numpy as np

logger = logging.getLogger(__name__)

try:
    import shap
    HAS_SHAP = True
except ImportError:
    HAS_SHAP = False
    logger.warning("SHAP not installed. Install with: pip install shap")


class SHAPExplainer:
    """
    SHAP-based model explainability.
    """
    
    def __init__(self, model=None):
        self.model = model
        self.explainer = None
        self.expected_value = None
        self._initialized = False
    
    def init_explainer(self, model, X_background: np.ndarray = None):
        """Initialize SHAP explainer."""
        if not HAS_SHAP:
            raise ImportError("SHAP not installed. Run: pip install shap")
        
        self.model = model
        
        try:
            if hasattr(model, 'predict_proba'):
                self.explainer = shap.Explainer(model.predict_proba, X_background)
            else:
                self.explainer = shap.Explainer(model.predict, X_background)
            
            self._initialized = True
            logger.info("SHAP explainer initialized")
        except Exception as e:
            logger.error("Failed to initialize SHAP explainer: %s", e)
            self._initialized = False
    
    def explain(self, X: np.ndarray, feature_names: List[str] = None) -> Dict[str, Any]:
        """
        Generate SHAP values for prediction.
        
        Args:
            X: Input features (single sample or array)
            feature_names: Names of features
            
        Returns:
            SHAP explanation with values, base values, and visualization data
        """
        if not self._initialized or self.explainer is None:
            return {'error': 'Explainer not initialized', 'shap_values': None}
        
        try:
            shap_values = self.explainer(X)
            
            result = {
                'shap_values': shap_values.values.tolist() if len(X.shape) > 1 else shap_values.values.tolist(),
                'base_values': float(shap_values.base_values) if hasattr(shap_values, 'base_values') else None,
                'feature_names': feature_names or [f'feature_{i}' for i in range(len(shap_values.values[0]))],
                'num_features': len(shap_values.values[0]) if len(X.shape) > 1 else len(shap_values.values),
                'method': 'SHAP',
                'feature_importance': self._rank_features(shap_values.values, feature_names),
            }
            
            return result
            
        except Exception as e:
            logger.error("SHAP explanation failed: %s", e)
            return {'error': str(e), 'shap_values': None}
    
    def _rank_features(self, shap_values: np.ndarray, names: List[str]) -> List[Dict]:
        """Rank features by absolute SHAP value."""
        if len(shap_values.shape) > 1:
            mean_abs = np.abs(shap_values).mean(axis=0)
        else:
            mean_abs = np.abs(shap_values)
        
        indices = np.argsort(mean_abs)[::-1]
        
        return [
            {
                'rank': i + 1,
                'feature': names[idx] if names else f'feature_{idx}',
                'importance': float(mean_abs[idx]),
                'contribution': 'positive' if shap_values[0][idx] > 0 else 'negative'
            }
            for i, idx in enumerate(indices[:10])
        ]
    
    def plot_summary(self, X: np.ndarray, feature_names: List[str] = None) -> Dict[str, Any]:
        """Generate summary plot data."""
        if not self._initialized:
            return {'error': 'Explainer not initialized'}
        
        try:
            shap_values = self.explainer(X)
            
            return {
                'beeswarm_data': self._beeswarm_data(shap_values, feature_names),
                'bar_data': self._bar_data(shap_values, feature_names),
            }
        except Exception as e:
            return {'error': str(e)}
    
    def _beeswarm_data(self, shap_values, names) -> List[Dict]:
        """Generate beeswarm plot data."""
        data = []
        values = shap_values.values if len(shap_values.values.shape) > 1 else [shap_values.values]
        X = shap_values.data if hasattr(shap_values, 'data') else None
        default_row = [0] * len(values[0]) if values else []
        
        for i, (val, row) in enumerate(zip(values, (X if X is not None else [default_row]))):
            for j, v in enumerate(val):
                data.append({
                    'sample': i,
                    'feature': names[j] if names else f'f{j}',
                    'shap_value': float(v),
                    'feature_value': float(row[j]) if X is not None else 0
                })
        
        return data
    
    def _bar_data(self, shap_values, names) -> List[Dict]:
        """Generate bar chart data."""
        mean_abs = np.abs(shap_values.values).mean(axis=0)
        indices = np.argsort(mean_abs)[::-1]
        
        return [
            {
                'feature': names[idx] if names else f'f{idx}',
                'mean_abs_shap': float(mean_abs[idx])
            }
            for idx in indices
        ]


class LIMEExplainer:
    """
    LIME-based model explainability for tabular and image data.
    """
    
    def __init__(self):
        self.explainer = None
        self._initialized = False
    
    def init_explainer(self, mode: str = 'tabular'):
        """Initialize LIME explainer."""
        try:
            from lime.lime_tabular import LimeTabularExplainer
            from lime.lime_image import LimeImageExplainer
            
            if mode == 'tabular':
                self._mode = 'tabular'
            elif mode == 'image':
                self._mode = 'image'
            else:
                raise ValueError(f"Unknown mode: {mode}")
            
            self._initialized = True
            logger.info("LIME explainer initialized for %s", mode)
            
        except ImportError:
            logger.warning("LIME not installed. Install with: pip install lime")
            self._initialized = False
    
    def explain(self, model, X: np.ndarray, 
                feature_names: List[str] = None,
                class_names: List[str] = None) -> Dict[str, Any]:
        """
        Generate LIME explanation.
        
        Args:
            model: Trained model with predict_proba
            X: Input features (single sample)
            feature_names: Names of features
            class_names: Names of output classes
            
        Returns:
            LIME explanation with local model weights
        """
        if not self._initialized:
            return {'error': 'Explainer not initialized'}
        
        try:
            from lime.lime_tabular import LimeTabularExplainer
            
            self.explainer = LimeTabularExplainer(
                training_data=X if len(X) > 100 else np.random.randn(100, X.shape[1]),
                feature_names=feature_names,
                class_names=class_names or ['Class_0', 'Class_1', 'Class_2', 'Class_3'],
                mode='classification'
            )
            
            if len(X.shape) > 1:
                X_sample = X[0] if len(X) > 0 else X
            else:
                X_sample = X
            
            explanation = self.explainer.explain_instance(
                X_sample, 
                model.predict_proba,
                num_features=len(feature_names) if feature_names else 10,
                num_samples=1000
            )
            
            weights = dict(explanation.as_list())
            
            return {
                'lime_weights': [{'feature': k, 'weight': float(v)} for k, v in weights.items()],
                'local_r2': explanation.score,
                'method': 'LIME',
                'feature_importance': sorted(
                    [{'feature': k, 'importance': abs(v)} for k, v in weights.items()],
                    key=lambda x: x['importance'],
                    reverse=True
                )[:10]
            }
            
        except Exception as e:
            logger.error("LIME explanation failed: %s", e)
            return {'error': str(e)}
    
    def plot_local_explanation(self, explanation) -> Dict[str, Any]:
        """Generate visualization data for local explanation."""
        try:
            return {
                'as_list': [{'feature': f, 'weight': w} for f, w in explanation.as_list()],
                'as_map': {int(k): v for k, v in explanation.as_map().items()},
                'score': explanation.score,
            }
        except Exception as e:
            return {'error': str(e)}


class AttentionExplainer:
    """
    Attention-based model explainability for transformer models.
    """
    
    def __init__(self):
        self.attention_weights = []
    
    def capture_attention(self, model, X: np.ndarray) -> List[np.ndarray]:
        """Capture attention weights from model layers."""
        self.attention_weights = []
        
        def hook_fn(module, input, output):
            if isinstance(output, tuple) and len(output) > 1:
                attn = output[1]
            else:
                attn = output
            self.attention_weights.append(attn.detach().cpu().numpy())
        
        hooks = []
        for name, module in model.named_modules():
            if 'attention' in name.lower() or 'attn' in name.lower():
                hooks.append(module.register_forward_hook(hook_fn))
        
        try:
            with torch.no_grad():
                model(X)
        finally:
            for hook in hooks:
                hook.remove()
        
        return self.attention_weights
    
    def analyze_attention(self, layer_idx: int = 0) -> Dict[str, Any]:
        """Analyze attention patterns."""
        if not self.attention_weights or layer_idx >= len(self.attention_weights):
            return {'error': 'No attention weights captured'}
        
        attn = self.attention_weights[layer_idx]
        
        mean_attention = np.mean(attn, axis=0)
        max_attention = np.max(attn, axis=0)
        
        return {
            'layer': layer_idx,
            'shape': attn.shape,
            'mean_attention': mean_attention.tolist(),
            'max_attention': max_attention.tolist(),
            'num_heads': attn.shape[1] if len(attn.shape) > 1 else 1,
        }
    
    def visualize_attention_flow(self) -> List[Dict]:
        """Generate attention flow visualization data."""
        flows = []
        
        for i, attn in enumerate(self.attention_weights):
            attn_matrix = np.mean(attn, axis=0)
            
            flows.append({
                'layer': i,
                'matrix': attn_matrix.tolist(),
                'max_idx': int(np.unravel_index(np.argmax(attn_matrix), attn_matrix.shape)),
                'sparsity': float(np.mean(attn_matrix < 0.1)),
            })
        
        return flows


class CounterfactualExplainer:
    """
    Counterfactual explanation generation.
    Answers "What if?" questions.
    """
    
    def __init__(self):
        self.model = None
    
    def find_counterfactuals(self, model, X: np.ndarray, 
                           target_class: int,
                           num_cf: int = 5,
                           max_changes: int = 3) -> List[Dict[str, Any]]:
        """
        Find counterfactual examples.
        
        Args:
            model: Trained classifier
            X: Input sample
            target_class: Desired outcome class
            num_cf: Number of counterfactuals to find
            max_changes: Maximum feature changes allowed
            
        Returns:
            List of counterfactual examples
        """
        self.model = model
        
        if len(X.shape) > 1:
            X_sample = X[0]
        else:
            X_sample = X
        
        counterfactuals = []
        original_pred = np.argmax(model.predict_proba(X_sample.reshape(1, -1)))
        
        for _ in range(num_cf * 10):
            if len(counterfactuals) >= num_cf:
                break
            
            cf = X_sample.copy()
            num_changed = np.random.randint(1, max_changes + 1)
            change_indices = np.random.choice(len(cf), num_changed, replace=False)
            
            for idx in change_indices:
                cf[idx] = cf[idx] + np.random.uniform(-0.5, 0.5)
            
            cf_pred = np.argmax(model.predict_proba(cf.reshape(1, -1)))
            
            if cf_pred == target_class and cf_pred != original_pred:
                changes = [
                    {'index': int(idx), 'original': float(X_sample[idx]), 'new': float(cf[idx])}
                    for idx in change_indices
                ]
                
                counterfactuals.append({
                    'changes': changes,
                    'prediction': int(cf_pred),
                    'probability': float(model.predict_proba(cf.reshape(1, -1))[0][cf_pred]),
                    'distance': float(np.linalg.norm(cf - X_sample)),
                })
        
        return sorted(counterfactuals, key=lambda x: x['distance'])
    
    def generate_textual_cf(self, original: Dict, cf: Dict) -> str:
        """Generate textual counterfactual explanation."""
        changes = []
        
        for key in original:
            if key in cf and original[key] != cf[key]:
                if isinstance(original[key], (int, float)):
                    diff = cf[key] - original[key]
                    direction = 'increased' if diff > 0 else 'decreased'
                    changes.append(
                        f"{key} {direction} from {original[key]:.2f} to {cf[key]:.2f}"
                    )
                else:
                    changes.append(f"{key} changed from '{original[key]}' to '{cf[key]}'")
        
        if changes:
            return "If " + ", and ".join(changes) + ", then the prediction would change."
        return "No significant changes found that would change the prediction."


class FeatureImportanceAnalyzer:
    """
    Comprehensive feature importance analysis.
    """
    
    def __init__(self, model=None):
        self.model = model
    
    def permutation_importance(self, model, X: np.ndarray, y: np.ndarray,
                             n_repeats: int = 10) -> Dict[str, Any]:
        """Calculate permutation importance."""
        from sklearn.inspection import permutation_importance
        
        result = permutation_importance(
            model, X, y, 
            n_repeats=n_repeats,
            random_state=42,
            n_jobs=-1
        )
        
        return {
            'importances_mean': result.importances_mean.tolist(),
            'importances_std': result.importances_std.tolist(),
            'importances': result.importances.tolist(),
        }
    
    def partial_dependence(self, model, X: np.ndarray, 
                         feature_idx: int,
                         feature_values: np.ndarray = None) -> Dict[str, Any]:
        """Calculate partial dependence for a feature."""
        from sklearn.inspection import PartialDependenceDisplay
        
        if feature_values is None:
            feature_values = np.linspace(X[:, feature_idx].min(), 
                                        X[:, feature_idx].max(), 50)
        
        pd_results = []
        for val in feature_values:
            X_temp = X.copy()
            X_temp[:, feature_idx] = val
            preds = model.predict_proba(X_temp)
            pd_results.append({
                'feature_value': float(val),
                'mean_prediction': float(preds.mean(axis=0)[1])
            })
        
        return {
            'feature_idx': feature_idx,
            'values': pd_results,
        }
    
    def interaction_strength(self, model, X: np.ndarray,
                            feature_pairs: List[Tuple[int, int]]) -> Dict[str, Any]:
        """Analyze feature interaction strengths."""
        results = []
        
        for f1, f2 in feature_pairs:
            interaction = self._compute_interaction(X[:, f1], X[:, f2])
            results.append({
                'feature_pair': (f1, f2),
                'interaction_strength': float(interaction),
            })
        
        return {
            'interactions': sorted(results, key=lambda x: x['interaction_strength'], reverse=True),
        }
    
    def _compute_interaction(self, x1: np.ndarray, x2: np.ndarray) -> float:
        """Compute simple interaction strength using correlation."""
        return float(np.abs(np.corrcoef(x1, x2)[0, 1]))


class ModelExplainer:
    """
    Unified explainability interface.
    Combines SHAP, LIME, and custom explanations.
    """
    
    def __init__(self):
        self.shap = SHAPExplainer()
        self.lime = LIMEExplainer()
        self.attention = AttentionExplainer()
        self.counterfactual = CounterfactualExplainer()
        self.feature_importance = FeatureImportanceAnalyzer()
        self._initialized = False
    
    def init(self, model=None, X_train: np.ndarray = None, mode: str = 'auto'):
        """Initialize all explainers."""
        if model and X_train is not None and HAS_SHAP:
            try:
                self.shap.init_explainer(model, X_train)
            except Exception as e:
                logger.warning("SHAP initialization failed: %s", e)
        
        self.lime.init_explainer(mode='tabular')
        self._initialized = True
    
    def explain(self, model, X: np.ndarray, 
               feature_names: List[str] = None,
               methods: List[str] = None) -> Dict[str, Any]:
        """
        Generate comprehensive explanation using multiple methods.
        
        Args:
            model: Trained model
            X: Input features
            feature_names: Feature names
            methods: List of methods to use ('shap', 'lime', 'counterfactual', 'all')
            
        Returns:
            Combined explanation from all requested methods
        """
        if methods is None or 'all' in methods:
            methods = ['shap', 'lime', 'counterfactual']
        
        results = {'methods_used': methods}
        
        if 'shap' in methods:
            results['shap'] = self.shap.explain(X, feature_names)
        
        if 'lime' in methods:
            results['lime'] = self.lime.explain(model, X, feature_names)
        
        if 'counterfactual' in methods:
            results['counterfactual'] = self.counterfactual.find_counterfactuals(
                model, X, target_class=0
            )
        
        return results
    
    def generate_report(self, model, X: np.ndarray, y: np.ndarray,
                      feature_names: List[str] = None) -> Dict[str, Any]:
        """Generate comprehensive explanation report."""
        return {
            'global_explanation': self.shap.explain(X, feature_names),
            'feature_importance': self.feature_importance.permutation_importance(
                model, X, y
            ),
            'counterfactuals': self.counterfactual.find_counterfactuals(model, X, 0),
        }


import torch
