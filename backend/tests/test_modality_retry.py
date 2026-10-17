"""Per-modality retry endpoint (/api/analysis/sessions/<id>/retry)."""
import shutil

from app.config.settings import Config
from app.features.patients.repository import PatientRepository
from app.features.history.repository import SessionRepository
from app.features.auth.repository import UserRepository


def _seed_session_with_error(patient_id='PAT-2001'):
    """A doctor-owned patient + a persisted session whose MRI step failed."""
    doctor = UserRepository().get_by_username('doctor')
    PatientRepository().create(
        patient_id=patient_id,
        name='Retry Person',
        age=70,
        created_by=doctor.id,
    )
    repo = SessionRepository()
    sid = repo.save(
        patient_id=patient_id,
        patient_name='Retry Person',
        created_by=doctor.id,
        results={
            'patient_info': {'patient_id': patient_id, 'name': 'Retry Person'},
            'mri_error': 'MRI model exploded',
            'cognitive': {'composite_score': 61, 'total_questions': 15},
            'final_stage': {'stage': 'Unknown', 'confidence': 0},
        },
    )
    return doctor, sid


def _plant_raw_mri(patient_id: str) -> None:
    base = Config.UPLOAD_FOLDER / 'doctors' / 'doc' / 'patients' / f'{patient_id}_person' / 'mri'
    base.mkdir(parents=True, exist_ok=True)
    (base / 'scan_mri.nii').write_bytes(b'fake nifti bytes')


def _remove_planted(patient_id: str) -> None:
    base = Config.UPLOAD_FOLDER / 'doctors' / 'doc' / 'patients' / f'{patient_id}_person'
    shutil.rmtree(base, ignore_errors=True)


def _login(client, username='doctor', password='Doctor@123'):
    login = client.post('/api/auth/login', json={'username': username, 'password': password})
    assert login.status_code == 200


def test_retry_rejects_unknown_modality(app, client):
    _seed_session_with_error()
    _login(client)
    resp = client.post('/api/analysis/sessions/1/retry', json={'modality': 'bloodwork'})
    assert resp.status_code == 400


def test_retry_404_for_missing_session(app, client):
    _login(client)
    resp = client.post('/api/analysis/sessions/9999/retry', json={'modality': 'mri'})
    assert resp.status_code == 404


def test_retry_409_when_no_stored_upload(app, client):
    _, sid = _seed_session_with_error('PAT-NOFILE')
    _login(client)
    resp = client.post(f'/api/analysis/sessions/{sid}/retry', json={'modality': 'mri'})
    assert resp.status_code == 409
    assert 're-run the assessment' in resp.json()['message']


def test_retry_access_denied_for_other_doctor(app, client):
    doctor, sid = _seed_session_with_error()
    UserRepository().create(
        username='doctor2',
        email='doctor2@neurosense.ai',
        password='Doctor@1234',
        role='doctor',
        full_name='Second Doctor',
    )
    _login(client, username='doctor2', password='Doctor@1234')
    resp = client.post(f'/api/analysis/sessions/{sid}/retry', json={'modality': 'mri'})
    assert resp.status_code == 403
    detail = SessionRepository().get_session_detail(sid)
    assert detail['results']['mri_error'] == 'MRI model exploded'


def test_retry_mri_success_refreshes_session(app, client, monkeypatch):
    doctor, sid = _seed_session_with_error('PAT-OK')
    _plant_raw_mri('PAT-OK')
    _login(client)

    from app.features.analysis import retry as retry_mod
    from app.features.analysis.service import AnalysisOrchestrator

    def fake_analyze_mri(self, file, gradcam=True):
        assert gradcam is True
        return {'stage': 'Mild Demented', 'confidence': 84.0, 'gradcam': 'data:image/png;base64,x'}

    def fake_fuse(self, **kwargs):
        assert kwargs.get('mri_result', {}).get('stage') == 'Mild Demented'
        return {'stage': 'Mild Demented', 'confidence': 84.0, 'method': 'weighted_rule_based'}

    monkeypatch.setattr(AnalysisOrchestrator, 'analyze_mri', fake_analyze_mri)
    monkeypatch.setattr(AnalysisOrchestrator, 'fuse_results', fake_fuse)
    monkeypatch.setattr(retry_mod, '_regenerate_report', lambda *a, **k: None)

    try:
        resp = client.post(f'/api/analysis/sessions/{sid}/retry', json={'modality': 'mri'})
        assert resp.status_code == 200, resp.text
        payload = resp.json()
        assert payload['mri']['stage'] == 'Mild Demented'
        assert 'mri_error' not in payload
        assert payload['final_stage']['stage'] == 'Mild Demented'
        assert payload['session_id'] == sid

        # The session row itself must be refreshed, not just the response.
        detail = SessionRepository().get_session_detail(sid)
        assert detail['results']['mri']['stage'] == 'Mild Demented'
        assert detail['mri_stage'] == 'Mild Demented'
        assert 'mri_error' not in detail['results']
    finally:
        _remove_planted('PAT-OK')
