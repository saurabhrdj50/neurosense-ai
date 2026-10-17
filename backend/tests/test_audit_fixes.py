"""Regression tests for the 2026-10 audit fixes.

Each test corresponds to an audited bug; if one of these fails, the bug is
back. Run the whole file with: pytest tests/test_audit_fixes.py -q
"""
import base64
import io
import os
import shutil

import pytest


# --------------------------------------------------------------------------- #
# Fusion gating: an unassessed modality must never vote                        #
# --------------------------------------------------------------------------- #

class TestFusionGating:
    def setup_method(self):
        from app.ml.fusion.engine import MultimodalFusion
        self.fusion = MultimodalFusion()

    def test_empty_cognitive_assessment_never_votes(self):
        """evaluate({}) → composite 0 ('Not Assessed') must not fuse to Moderate."""
        from app.ml.cognitive.evaluator import CognitiveEvaluator
        empty = CognitiveEvaluator().evaluate({})
        result = self.fusion.predict(cognitive_result=empty)
        assert result['stage'] is None, "empty cognitive assessment fabricated a stage vote"

    def test_empty_risk_profile_never_votes(self):
        """assess({}) → 'No Data' must not fuse to Non-Demented."""
        from app.ml.risk.profiler import RiskProfiler
        empty = RiskProfiler().assess({})
        result = self.fusion.predict(risk_result=empty)
        assert result['stage'] is None, "'No Data' risk profile fabricated a Non-Demented vote"

    def test_partially_answered_cognitive_still_votes(self):
        """A real partial assessment (some questions answered) must still count."""
        from app.ml.cognitive.evaluator import CognitiveEvaluator
        partial = CognitiveEvaluator().evaluate({'screening_breakdown': {'orient_date': 3}})
        result = self.fusion.predict(cognitive_result=partial)
        assert result['stage'] in (
            'Cognitively Normal (CN)', 'Mild Cognitive Impairment (MCI)', "Alzheimer's Disease (AD)"
        )

    def test_all_zero_answers_vote_severe_not_nothing(self):
        """Answering every question wrong is real evidence — it must vote."""
        from app.ml.cognitive.evaluator import CognitiveEvaluator
        answered = CognitiveEvaluator().evaluate({
            'screening_breakdown': {qid: 0 for qid in (
                'orient_date', 'orient_place', 'register_3words', 'delay_recall',
                'digit_span_fwd', 'serial_7', 'animal_fluency', 'object_naming',
                'sentence_compreh', 'multi_step_cmd', 'logical_reason', 'abstraction',
                'months_reverse', 'problem_solve', 'auto_memory')}
        })
        assert answered['tests_completed'] == 15
        result = self.fusion.predict(cognitive_result=answered)
        assert result['stage'] == "Alzheimer's Disease (AD)"

    def test_cognitive_scores_are_clamped(self):
        """Out-of-range answers can never inflate the composite."""
        from app.ml.cognitive.evaluator import CognitiveEvaluator
        crazy = CognitiveEvaluator().evaluate({
            'screening_breakdown': {'orient_date': 9999, 'serial_7': -50}
        })
        assert 0 <= crazy['composite_score'] <= 100


# --------------------------------------------------------------------------- #
# Recommendations fail loudly instead of defaulting to Non-Demented            #
# --------------------------------------------------------------------------- #

class TestRecommendationFailLoud:
    def test_missing_stage_withholds_recommendations(self):
        from app.features.analysis.recommendation import generate_recommendations
        recs = generate_recommendations({'final_stage': {}})
        assert recs.get('assessment_incomplete') is True
        assert recs['stage'] is None
        assert 'Non-Demented' not in (recs['summary'] or '')

    def test_risk_priority_keys_match_factor_keys(self):
        """category_priority keys must exist in the risk factor configs."""
        from app.features.analysis.recommendation import RecommendationService
        from app.ml.risk.profiler import FACTOR_CONFIG, LEGACY_FACTOR_CONFIG
        svc = RecommendationService()
        # Reach into a generated instance via a tiny analysis-less probe:
        tips = svc._prioritize_by_risk_factors(
            [{'category': 'Physical', 'tip': 'x'}],
            {k: {'risk_score': 90, 'modifiable': True} for k in
             list(FACTOR_CONFIG.keys()) + list(LEGACY_FACTOR_CONFIG.keys())},
        )
        high = [t for t in tips if t.get('priority') == 'high']
        assert high, "no risk factor key matched a priority category"


# --------------------------------------------------------------------------- #
# Auth hardening                                                               #
# --------------------------------------------------------------------------- #

class TestAuthHardening:
    def test_reset_token_not_in_response_by_default(self, client, monkeypatch):
        from app.config.settings import Config
        monkeypatch.setattr(Config, 'EXPOSE_RESET_TOKEN', False)
        resp = client.post('/api/auth/forgot-password', json={
            'email': 'doctor@neurosense.ai', 'date_of_birth': '1980-06-20'})
        assert resp.status_code == 200
        assert 'reset_token' not in resp.json()

    def test_forgot_password_response_identical_for_unknown_identity(self, client, monkeypatch):
        from app.config.settings import Config
        monkeypatch.setattr(Config, 'EXPOSE_RESET_TOKEN', False)
        known = client.post('/api/auth/forgot-password', json={
            'email': 'doctor@neurosense.ai', 'date_of_birth': '1980-06-20'})
        unknown = client.post('/api/auth/forgot-password', json={
            'email': 'nobody@nowhere.io', 'date_of_birth': '1980-06-20'})
        # Identical body so existence cannot be probed.
        assert known.json() == unknown.json()

    def test_registration_cannot_create_admin(self, client):
        resp = client.post('/api/auth/register', json={
            'username': 'eviladmin', 'email': 'evil@test.com',
            'password': 'Password123!', 'role': 'admin',
            'date_of_birth': '1990-05-05'})
        assert resp.status_code == 201
        from app.features.auth.repository import UserRepository
        user = UserRepository().get_by_username('eviladmin')
        assert user.role == 'doctor'
        assert user.date_of_birth == '1990-05-05'

    def test_lockout_uses_aware_utc_and_locks(self, client):
        for _ in range(5):
            client.post('/api/auth/login', json={'username': 'doctor', 'password': 'wrong-pass'})
        from app.features.auth.repository import UserRepository
        from app.shared.time_utils import parse_timestamp, utc_now
        user = UserRepository().get_by_username('doctor')
        assert user.failed_login_attempts >= 5
        locked_until = parse_timestamp(user.locked_until)
        assert locked_until is not None and locked_until > utc_now()
        resp = client.post('/api/auth/login', json={'username': 'doctor', 'password': 'Doctor@123'})
        assert resp.status_code == 429

    def test_user_dict_hides_security_fields(self, client):
        client.post('/api/auth/login', json={'username': 'doctor', 'password': 'Doctor@123'})
        me = client.get('/api/auth/current-user').json()
        for field in ('storage_key', 'failed_login_attempts', 'locked_until'):
            assert field not in me['user']

    def test_http_errors_keep_their_status_code(self, client):
        """A 405 must not be converted into a 500 by the global handler."""
        resp = client.post('/api/health')
        assert resp.status_code == 405


# --------------------------------------------------------------------------- #
# Multi-tenant safety                                                          #
# --------------------------------------------------------------------------- #

class TestOwnership:
    def test_analyze_rejects_other_doctors_patient(self, client):
        """A second doctor cannot analyze (and overwrite) doctor1's patient."""
        # doctor (id from seed) owns PAT-1001
        client.post('/api/auth/login', json={'username': 'doctor', 'password': 'Doctor@123'})
        resp = client.post('/api/auth/register', json={
            'username': 'doctor2', 'email': 'doc2@test.com',
            'password': 'Password123!', 'date_of_birth': '1990-05-05'})
        assert resp.status_code == 201
        client.post('/api/auth/logout')
        client.post('/api/auth/login', json={'username': 'doctor2', 'password': 'Password123!'})
        resp = client.post('/api/analysis/analyze', data={
            'patient_id': 'PAT-1001', 'name': 'Hijacked', 'age': '70',
        })
        assert resp.status_code == 403
        # The patient record is untouched.
        from app.features.patients.repository import PatientRepository
        pat = PatientRepository().get_by_patient_id('PAT-1001')
        assert pat['name'] == 'Ramesh Kumar'


# --------------------------------------------------------------------------- #
# Storage safety                                                               #
# --------------------------------------------------------------------------- #

class TestStorageSafety:
    def test_prefix_deletion_does_not_hit_other_patients(self, tmp_path, monkeypatch):
        from app.shared import storage
        upload_root = tmp_path / 'uploads'
        doc_dir = upload_root / 'doctors' / '1_doc' / 'patients'
        (doc_dir / 'PAT-100_mary').mkdir(parents=True)
        (doc_dir / 'PAT-10_john').mkdir(parents=True)
        (doc_dir / 'PAT-10_john' / 'keep.txt').write_text('x')
        monkeypatch.setattr(storage.Config, 'UPLOAD_FOLDER', upload_root)
        storage.StorageManager.delete_patient_directory(1, 'PAT-10')
        assert (doc_dir / 'PAT-100_mary').exists(), 'PAT-10 deletion destroyed PAT-100 files'
        assert not (doc_dir / 'PAT-10_john').exists()

    def test_avatar_rejects_non_image_payload(self, tmp_path, monkeypatch):
        from app.shared import storage
        monkeypatch.setattr(storage.Config, 'UPLOAD_FOLDER', tmp_path / 'uploads')
        evil = base64.b64encode(b'<html><script>alert(1)</script>').decode()
        with pytest.raises(ValueError):
            storage.StorageManager.save_base64_avatar(1, 'PAT-X', f'data:image/png;base64,{evil}')

    def test_avatar_accepts_real_image(self, tmp_path, monkeypatch):
        from app.shared import storage
        from PIL import Image
        monkeypatch.setattr(storage.Config, 'UPLOAD_FOLDER', tmp_path / 'uploads')
        buf = io.BytesIO()
        Image.new('RGB', (32, 32), color=(200, 10, 10)).save(buf, format='PNG')
        b64 = base64.b64encode(buf.getvalue()).decode()
        path = storage.StorageManager.save_base64_avatar(1, 'PAT-X', f'data:image/png;base64,{b64}')
        assert (storage.Config.UPLOAD_FOLDER / path).exists()

    def test_mri_upload_rejects_content_mismatch(self, client, authenticated_client):
        """A text payload with an image extension is rejected (magic-byte check)."""
        data = {'patient_id': 'PAT-CUSTOM-1', 'name': 'Test Patient'}
        files = {'mri_image': ('scan.png', io.BytesIO(b'<html>not an image</html>'), 'image/png')}
        resp = authenticated_client.post('/api/analysis/analyze', data=data, files=files)
        assert resp.status_code == 400
        assert 'does not match' in resp.json()['message']


# --------------------------------------------------------------------------- #
# Speech: silence gate (Whisper hallucinates on silence)                       #
# --------------------------------------------------------------------------- #

class TestSpeechSilenceGate:
    def _ratio(self, samples):
        import numpy as np
        import librosa
        from app.ml.speech.transcriber import SpeechTranscriber
        return SpeechTranscriber._voiced_ratio(
            np.asarray(samples, dtype=np.float32), 16000
        )

    def test_digital_silence_is_gated(self):
        import numpy as np
        assert self._ratio(np.zeros((32000,))) == 0.0

    def test_room_tone_is_gated(self):
        import numpy as np
        rng = np.random.default_rng(1)
        assert self._ratio(0.0005 * rng.standard_normal(32000)) == 0.0

    def test_speech_level_signal_is_not_gated(self):
        import numpy as np
        t = np.linspace(0, 2, 32000)
        assert self._ratio(0.05 * np.sin(2 * np.pi * 200 * t)) > 0.5

    def test_speech_with_pauses_is_not_gated(self):
        import numpy as np
        t = np.linspace(0, 2, 32000)
        sig = np.concatenate([0.05 * np.sin(2 * np.pi * 200 * t),
                              np.zeros(16000, dtype=np.float32)])
        ratio = self._ratio(sig)
        assert 0.3 < ratio < 1.0

    def test_whisper_model_defaults_to_base_on_cpu(self, monkeypatch):
        import torch
        from app.ml.speech.transcriber import SpeechTranscriber
        monkeypatch.delenv('WHISPER_MODEL', raising=False)
        if torch.cuda.is_available():
            pytest.skip('CUDA present; CPU default not applicable')
        st = SpeechTranscriber()
        assert st.model_size == 'base'


# --------------------------------------------------------------------------- #
# Background analysis jobs                                                     #
# --------------------------------------------------------------------------- #

class TestBackgroundJobs:
    def _minimal_form(self, pid='PAT-1003'):
        return {
            'patient_id': pid, 'name': 'Mohan Patel', 'age': '75',
            'cognitive_tests': '{"screening_breakdown": {"orient_date": 3, "serial_7": 2}}',
            'risk_factors': '{"hypertension": true}',
        }

    def test_analyze_async_returns_job_and_completes(self, authenticated_client):
        resp = authenticated_client.post('/api/analysis/analyze-async', data=self._minimal_form())
        assert resp.status_code == 202
        body = resp.json()
        assert body['job_id'] and body['status_url'].startswith('/api/analysis/jobs/')

        import time
        result = None
        for _ in range(60):
            status = authenticated_client.get(body['status_url']).json()
            assert status['error'] is None
            if status['status'] == 'completed':
                result = status['result']
                break
            assert status['status'] in ('queued', 'running')
            time.sleep(0.25)
        assert result is not None, 'job never completed'
        assert result.get('final_stage', {}).get('stage') in (
            'Cognitively Normal (CN)', 'Mild Cognitive Impairment (MCI)', "Alzheimer's Disease (AD)")
        assert result.get('created_at')

    def test_job_status_hidden_from_other_users(self, client, authenticated_client):
        resp = authenticated_client.post('/api/analysis/analyze-async', data=self._minimal_form())
        job_id = resp.json()['job_id']
        import time
        for _ in range(60):
            st = authenticated_client.get(f'/api/analysis/jobs/{job_id}').json()
            if st['status'] in ('completed', 'failed'):
                break
            time.sleep(0.25)
        # second doctor must not see doctor1's job
        client.post('/api/auth/register', json={
            'username': 'doctor9', 'email': 'doc9@test.com',
            'password': 'Password123!', 'date_of_birth': '1990-05-05'})
        client.post('/api/auth/login', json={'username': 'doctor9', 'password': 'Password123!'})
        assert client.get(f'/api/analysis/jobs/{job_id}').status_code == 404
        # anonymous as well
        client.post('/api/auth/logout')
        assert client.get(f'/api/analysis/jobs/{job_id}').status_code in (401, 404)

    def test_unknown_job_404(self, authenticated_client):
        assert authenticated_client.get('/api/analysis/jobs/deadbeef0000').status_code == 404

    def test_async_rejects_cross_tenant_patient(self, client, authenticated_client):
        client.post('/api/auth/register', json={
            'username': 'doctor10', 'email': 'doc10@test.com',
            'password': 'Password123!', 'date_of_birth': '1990-05-05'})
        client.post('/api/auth/login', json={'username': 'doctor10', 'password': 'Password123!'})
        resp = client.post('/api/analysis/analyze-async', data=self._minimal_form('PAT-1001'))
        assert resp.status_code == 403

    def test_job_manager_progress_and_failures(self):
        from app.shared.jobs import JobManager
        mgr = JobManager(max_workers=1)

        stages = []

        def work(progress):
            progress('mri', 25)
            progress('speech', 60)
            stages.append('done')
            return {'ok': True}

        job_id = mgr.submit(work, user_id=1)
        import time
        for _ in range(50):
            job = mgr.get(job_id, user_id=1)
            if job['status'] == 'completed':
                break
            time.sleep(0.05)
        job = mgr.get(job_id, user_id=1)
        assert job['status'] == 'completed' and job['result'] == {'ok': True}
        assert job['progress'] == 100

        def boom(progress):
            raise RuntimeError('ml exploded')

        fail_id = mgr.submit(boom, user_id=1)
        for _ in range(50):
            job = mgr.get(fail_id, user_id=1)
            if job['status'] == 'failed':
                break
            time.sleep(0.05)
        assert 'ml exploded' in mgr.get(fail_id, user_id=1)['error']
