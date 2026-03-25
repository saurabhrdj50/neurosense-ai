"""
Seed default admin user into the database.

Usage:
    cd backend
    python seed_admin.py

This script ensures the admin user exists in the database.
If the admin user already exists, it will not be duplicated.
"""
import os
import sys
import logging

logging.basicConfig(level=logging.INFO, format='%(asctime)s [%(levelname)s] %(message)s')
logger = logging.getLogger(__name__)

# Ensure backend is on sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.core.config import Config
from app.core.database import Database
from app.repositories.user_repository import UserRepository


def seed_admin():
    """Create the default admin user if it doesn't exist."""
    # Initialize database
    db = Database.get_instance(str(Config.DB_PATH))
    db.init_schema()

    repo = UserRepository()
    
    # Check if admin already exists
    admin = repo.get_by_username('admin')
    if admin:
        logger.info("Admin user already exists (id=%d)", admin.id)
        return
    
    # Create admin user
    result = repo.create(
        username='admin',
        email='admin@neurosense.ai',
        password='admin123',
        role='admin',
        full_name='System Admin'
    )
    
    if result['success']:
        logger.info("✅ Admin user created successfully (id=%s)", result.get('user_id'))
    else:
        logger.error("❌ Failed to create admin user: %s", result.get('message'))


def seed_doctor():
    """Create the default doctor user if it doesn't exist."""
    repo = UserRepository()
    
    doctor = repo.get_by_username('doctor')
    if doctor:
        logger.info("Doctor user already exists (id=%d)", doctor.id)
        return
    
    result = repo.create(
        username='doctor',
        email='doctor@neurosense.ai',
        password='doctor123',
        role='doctor',
        full_name='Dr. Gupta'
    )
    
    if result['success']:
        logger.info("✅ Doctor user created successfully (id=%s)", result.get('user_id'))
    else:
        logger.error("❌ Failed to create doctor user: %s", result.get('message'))


if __name__ == '__main__':
    logger.info("Seeding default users...")
    logger.info("Database: %s", Config.DB_PATH)
    seed_admin()
    seed_doctor()
    logger.info("Done.")
