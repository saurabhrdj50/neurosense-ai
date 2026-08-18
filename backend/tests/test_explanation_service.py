from app.services.explanation_service import ExplanationService


class TestExplanationService:
    def test_mri_explanation_includes_heatmap_metadata(self):
        service = ExplanationService()

        results = {
            'mri': {
                'stage': 'Mild Demented',
                'confidence': 82.4,
                'decision_summary': (
                    'The model selected Mild Demented because it had the highest probability.'
                ),
                'gradcam_image': 'fake-base64-image',
                'heatmap_explanation': 'Warmer colors indicate stronger influence.',
            },
            'final_stage': {
                'stage': 'Mild Demented',
                'confidence': 82.4,
            },
        }

        explanation = service.generate_explanation(results)

        assert explanation['mri_explanation']['heatmap_available'] is True
        assert explanation['mri_explanation']['decision_summary'] == results['mri']['decision_summary']
        assert explanation['mri_explanation']['heatmap_explanation'] == results['mri']['heatmap_explanation']
        assert 'Grad-CAM heatmap' in explanation['overall_explanation']

    def test_feature_attribution_ranks_top_risk_drivers(self):
        service = ExplanationService()

        results = {
            'mri': {
                'stage': 'Mild Demented',
                'confidence': 82.4,
            },
            'cognitive': {
                'test_results': {
                    'mini_cog': {
                        'name': 'Mini-Cog',
                        'raw_score': 1,
                        'max_score': 5,
                        'percentage': 20,
                        'interpretation': 'High Risk',
                    }
                }
            },
            'risk_profile': {
                'factor_details': {
                    'hypertension': {
                        'label': 'Hypertension',
                        'category': 'Medical',
                        'value': True,
                        'risk_score': 80,
                        'weight': 0.9,
                    }
                }
            },
            'sentiment': {
                'cognitive_marker_count': 3,
                'vocabulary_richness': 38,
                'dominant_emotion': 'confusion',
            },
            'final_stage': {
                'stage': 'Mild Demented',
                'confidence': 82.4,
            },
        }

        explanation = service.generate_explanation(results)
        attribution = explanation['feature_attribution']

        assert attribution['method'] == 'Deterministic SHAP-style local attribution'
        assert len(attribution['factors']) > 0
        assert attribution['factors'][0]['importance'] >= attribution['factors'][-1]['importance']
        assert any(factor['feature'] == 'Mini-Cog' for factor in attribution['factors'])
