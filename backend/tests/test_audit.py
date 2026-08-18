import pytest
from app.repositories.audit_repository import AuditRepository


def test_audit_repository_log_and_get(app):
    repo = AuditRepository()
    log_id = repo.log(
        action='TEST_ACTION',
        resource_type='patient',
        actor_id=1,
        actor_username='testadmin',
        actor_role='admin',
        resource_id='PAT-9999',
        resource_name='Test Patient',
        details={'key': 'value'},
    )
    assert log_id > 0

    logs = repo.get_logs(action='TEST_ACTION')
    assert len(logs) >= 1
    found = [l for l in logs if l['resource_id'] == 'PAT-9999']
    assert len(found) == 1
    assert found[0]['actor_username'] == 'testadmin'
    assert found[0]['action'] == 'TEST_ACTION'


def test_admin_audit_log_endpoint(client):
    # Login as admin
    client.post('/api/auth/login', json={
        'username': 'admin',
        'password': 'Admin@123!',
    })

    res = client.get('/api/admin/audit-log')
    assert res.status_code == 200
    data = res.get_json()
    assert 'logs' in data
    assert 'total' in data
    assert isinstance(data['logs'], list)
