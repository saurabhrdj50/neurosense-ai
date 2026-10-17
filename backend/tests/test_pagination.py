"""Pagination contracts for the list endpoints (analyses + patients).

Locks: default page size, cap, offset slicing, and the total/limit/offset
response envelope. These endpoints previously returned every row — the
load test showed 8.7 MB / 1.4 s responses at 20k sessions.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


def _login(client):
    login = client.post('/api/auth/login', json={'username': 'doctor', 'password': 'Doctor@123'})
    assert login.status_code == 200
    return login


class TestAnalysesPagination:
    def test_default_page_and_envelope(self, app, client):
        from app.features.auth.repository import UserRepository
        from app.features.patients.repository import PatientRepository
        from app.features.history.repository import SessionRepository

        user_repo = UserRepository()
        doctor = user_repo.get_by_username('doctor')
        patient_repo = PatientRepository()
        patient_repo.create(patient_id='PAG-1', name='Pag Patient', created_by=doctor.id)

        session_repo = SessionRepository()
        for i in range(60):
            session_repo.save(
                patient_id='PAG-1', patient_name='Pag Patient', created_by=doctor.id,
                results={'final_stage': {'stage': 'Mild Demented', 'confidence': 80.0}},
            )

        _login(client)

        r = client.get('/api/analyses')
        assert r.status_code == 200
        body = r.json()
        assert 'total' in body and 'limit' in body and 'offset' in body
        assert body['limit'] == 50
        assert body['total'] == 60
        assert len(body['analyses']) == 50

        # Explicit slicing across pages, newest first
        r = client.get('/api/analyses?limit=5&offset=0')
        first_page = [a['session_id'] for a in r.json()['analyses']]
        r = client.get('/api/analyses?limit=5&offset=5')
        second_page = [a['session_id'] for a in r.json()['analyses']]
        assert len(first_page) == 5 and len(second_page) == 5
        assert not set(first_page) & set(second_page)

        # Cap enforcement
        r = client.get('/api/analyses?limit=100000')
        assert r.json()['limit'] == 200

        # Offset beyond total → empty page, total still reported
        r = client.get('/api/analyses?limit=5&offset=1000')
        body = r.json()
        assert body['analyses'] == [] and body['total'] == 60

    def test_analysis_history_alias_paginates(self, app, client):
        _login(client)
        r = client.get('/api/analysis/history?limit=3')
        assert r.status_code == 200
        body = r.json()
        assert body['limit'] == 3
        assert len(body['analyses']) <= 3
        assert 'total' in body


class TestPatientsPagination:
    def test_envelope_and_slicing(self, app, client):
        from app.features.auth.repository import UserRepository
        from app.features.patients.repository import PatientRepository

        user_repo = UserRepository()
        doctor = user_repo.get_by_username('doctor')
        patient_repo = PatientRepository()
        for i in range(7):
            patient_repo.create(patient_id=f'PPAG-{i}', name=f'Patient {i:02d}',
                                created_by=doctor.id)

        _login(client)

        r = client.get('/api/patients')
        assert r.status_code == 200
        body = r.json()
        assert body['total'] >= 7
        assert len(body['patients']) <= body['limit']

        r = client.get('/api/patients?limit=3&offset=0')
        p1 = [p['patient_id'] for p in r.json()['patients']]
        r = client.get('/api/patients?limit=3&offset=3')
        p2 = [p['patient_id'] for p in r.json()['patients']]
        assert not set(p1) & set(p2)
