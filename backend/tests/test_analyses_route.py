from app.repositories.patient_repository import PatientRepository
from app.repositories.session_repository import SessionRepository
from app.repositories.user_repository import UserRepository


def test_doctor_can_list_own_analyses(app, client):
    user_repo = UserRepository()
    doctor = user_repo.get_by_username('doctor')
    assert doctor is not None
    patient_repo = PatientRepository()
    patient_repo.create(
        patient_id='PAT-1001',
        name='Ramesh Kumar',
        age=65,
        created_by=doctor.id,
    )

    session_repo = SessionRepository()
    session_repo.save(
        patient_id='PAT-1001',
        patient_name='Ramesh Kumar',
        created_by=doctor.id,
        results={
            'final_stage': {'stage': 'Mild Demented', 'confidence': 82.5},
            'mri': {'stage': 'Mild Demented', 'confidence': 80},
        },
    )

    login = client.post('/api/auth/login', json={'username': 'doctor', 'password': 'Doctor@123!'})
    assert login.status_code == 200

    response = client.get('/api/analyses')
    assert response.status_code == 200
    payload = response.get_json()

    assert len(payload['analyses']) == 1
    analysis = payload['analyses'][0]
    assert analysis['patient_id'] == 'PAT-1001'
    assert analysis['stage'] == 'Mild Demented'
    assert analysis['confidence'] == 82.5
    assert analysis['created_at']
