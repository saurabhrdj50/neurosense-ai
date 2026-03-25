# PostgreSQL Migration Guide for NeuroSense AI

## Overview

This guide covers migrating from SQLite (current) to PostgreSQL for production deployment.

## Prerequisites

- PostgreSQL 15+ installed
- Access to existing SQLite database for data migration
- psycopg2 for Python PostgreSQL integration

## Installation

```bash
pip install psycopg2-binary sqlalchemy[postgresql]
```

## Configuration Update

Update `backend/app/core/config.py`:

```python
import os

class Config:
    # SQLite (Development)
    # SQLALCHEMY_DATABASE_URI = 'sqlite:///patient_data.db'
    
    # PostgreSQL (Production)
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://user:password@localhost:5432/neurosense'
    )
    
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_size': 10,
        'pool_recycle': 3600,
        'pool_pre_ping': True,
    }
```

## Migration Steps

### 1. Export Existing Data

```bash
cd backend
python -c "
from app.core.database import Database
from app import get_modules
import json

db = Database.get_instance('patient_data.db')

# Export users
from app.models import User
users = [{'id': u.id, 'username': u.username, 'email': u.email, 
          'role': u.role, 'created_at': u.created_at.isoformat()} 
         for u in User.query.all()]

# Export analysis results
from app.models import AnalysisResult
results = [{'id': r.id, 'patient_id': r.patient_id, 'session_id': r.session_id,
            'modality': r.modality, 'status': r.status, 
            'created_at': r.created_at.isoformat()}
           for r in AnalysisResult.query.all()]

with open('migration_data.json', 'w') as f:
    json.dump({'users': users, 'results': results}, f, indent=2)

print(f'Exported {len(users)} users and {len(results)} results')
"
```

### 2. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE neurosense;
CREATE USER neurosense_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE neurosense TO neurosense_user;
\c neurosense
GRANT ALL ON SCHEMA public TO neurosense_user;
```

### 3. Run Initial Schema Migration

```bash
# Using Flask-Migrate (recommended)
pip install flask-migrate
flask db init
flask db migrate -m "Initial migration"
flask db upgrade

# Or manually create tables
python -c "
from app import create_app
from app.core.database import Database

app = create_app()
with app.app_context():
    db = Database.get_instance()
    db.init_schema()
"
```

### 4. Import Existing Data

```bash
python -c "
import json
import psycopg2
from datetime import datetime

conn = psycopg2.connect(os.environ['DATABASE_URL'])
cur = conn.cursor()

with open('migration_data.json') as f:
    data = json.load(f)

# Import users
for user in data['users']:
    cur.execute('''
        INSERT INTO users (id, username, email, role, password_hash, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    ''', (user['id'], user['username'], user['email'], 
          user['role'], 'migrated_hash', datetime.fromisoformat(user['created_at'])))

# Import results
for result in data['results']:
    cur.execute('''
        INSERT INTO analysis_results (id, patient_id, session_id, modality, status, created_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    ''', (result['id'], result['patient_id'], result['session_id'],
          result['modality'], result['status'], datetime.fromisoformat(result['created_at'])))

conn.commit()
cur.close()
conn.close()
"
```

### 5. Verify Migration

```bash
python -c "
from app import create_app
from app.models import User, AnalysisResult

app = create_app()
with app.app_context():
    print(f'Users: {User.query.count()}')
    print(f'Results: {AnalysisResult.query.count()}')
"
```

## Docker Compose Update

Add to `docker-compose.yml`:

```yaml
postgres:
  image: postgres:15-alpine
  environment:
    POSTGRES_DB: neurosense
    POSTGRES_USER: neurosense_user
    POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
  volumes:
    - postgres_data:/var/lib/postgresql/data
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U neurosense_user -d neurosense"]
    interval: 10s
    timeout: 5s
    retries: 5
```

## Rollback Plan

If migration fails:

1. Keep SQLite database intact
2. Restore from backup if needed
3. Investigate issues before retrying

## Performance Tuning

```sql
-- Create indexes for common queries
CREATE INDEX idx_results_patient_id ON analysis_results(patient_id);
CREATE INDEX idx_results_created_at ON analysis_results(created_at);
CREATE INDEX idx_results_status ON analysis_results(status);

-- Analyze tables after migration
ANALYZE users;
ANALYZE analysis_results;
```
