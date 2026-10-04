"""Seed demo data for local review and onboarding.

Usage (from repo root, backend venv active or inside the api container):
    SEED_DEMO_DATA=true python backend/scripts/seed_demo.py

Creates the default admin/doctor users and sample patients via the same
repositories the app uses, then prints what exists and how to log in.
Idempotent: existing rows are reused, never duplicated.
"""
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

os.environ.setdefault('SEED_DEMO_DATA', 'true')

from app import create_app  # noqa: E402
from app.features.auth.repository import UserRepository  # noqa: E402
from app.features.patients.repository import PatientRepository  # noqa: E402


def main() -> None:
    create_app()
    users = [u.to_dict() for u in UserRepository().get_all()]
    patients = PatientRepository().get_all()
    print(f"users={len(users)} patients={len(patients)}")
    for u in users:
        print(f"  - {u['username']} ({u['role']})")
    print("Login with: admin / Admin@123!  or  doctor / Doctor@123")


if __name__ == '__main__':
    main()
