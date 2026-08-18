"""
One-shot patch script: updates the migrations list in database.py
"""
import re

path = 'app/core/database.py'
content = open(path, 'rb').read().decode('utf-8')

OLD = r"            migrations = \[.*?\]"

NEW = """            migrations = [
                ('users', 'date_of_birth',           "ALTER TABLE users ADD COLUMN date_of_birth TEXT DEFAULT ''"),
                ('users', 'full_name',               "ALTER TABLE users ADD COLUMN full_name TEXT DEFAULT ''"),
                ('users', 'updated_at',              "ALTER TABLE users ADD COLUMN updated_at TEXT DEFAULT NULL"),
                ('users', 'last_login',              "ALTER TABLE users ADD COLUMN last_login TEXT DEFAULT NULL"),
                ('users', 'is_active',               "ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1"),
                ('users', 'failed_login_attempts',   "ALTER TABLE users ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0"),
                ('users', 'locked_until',            "ALTER TABLE users ADD COLUMN locked_until TEXT DEFAULT NULL"),
                ('users', 'reset_token',             "ALTER TABLE users ADD COLUMN reset_token TEXT DEFAULT NULL"),
                ('users', 'reset_token_expires',     "ALTER TABLE users ADD COLUMN reset_token_expires TEXT DEFAULT NULL"),
                ('patients', 'created_by',           "ALTER TABLE patients ADD COLUMN created_by INTEGER"),
                ('sessions', 'created_by',           "ALTER TABLE sessions ADD COLUMN created_by INTEGER DEFAULT NULL"),
            ]"""

result = re.sub(OLD, NEW, content, count=1, flags=re.DOTALL)
if result == content:
    print("ERROR: pattern not found")
else:
    open(path, 'wb').write(result.encode('utf-8'))
    print("OK: migrations patched")
