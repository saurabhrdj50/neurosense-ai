"""add GitHub login columns to users

Revision ID: b7c3e9a1f2d4
Revises: a3f7c1d29e54
Create Date: 2026-11-07

Adds the GitHub OAuth identity to the users table:
  - github_id (unique, nullable — only GitHub accounts have one)
  - github_login, avatar_url (nullable)
  - auth_provider ('password' | 'github', existing rows backfill to
    'password' via server_default)
  - password_hash becomes nullable — GitHub-only accounts never set a
    password; they store a random unusable hash instead, so no NULL is
    ever written in practice, but the column must allow it.

Bare-metal deployments that never run Alembic get the same columns from
app.shared.bootstrap._ensure_new_columns().
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b7c3e9a1f2d4'
down_revision: Union[str, Sequence[str], None] = 'a3f7c1d29e54'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('github_id', sa.String(), nullable=True))
    op.add_column('users', sa.Column('github_login', sa.String(), nullable=True))
    op.add_column('users', sa.Column('avatar_url', sa.String(), nullable=True))
    op.add_column('users', sa.Column(
        'auth_provider', sa.String(), nullable=False, server_default='password'))
    # Plain op.alter_column renders "ALTER TABLE ... ALTER COLUMN", which
    # SQLite cannot execute — use an explicit batch operation (table
    # rebuild on SQLite, plain ALTER on PostgreSQL).
    with op.batch_alter_table('users', recreate='always') as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.String(),
                              nullable=True)
    # Partial unique index: NULL github_ids (password accounts) never
    # collide in PostgreSQL or SQLite.
    op.create_index(
        'idx_users_github_id', 'users', ['github_id'], unique=True,
        postgresql_where=sa.text('github_id IS NOT NULL'),
        sqlite_where=sa.text('github_id IS NOT NULL'),
    )


def downgrade() -> None:
    op.drop_index('idx_users_github_id', table_name='users')
    with op.batch_alter_table('users', recreate='always') as batch_op:
        batch_op.alter_column('password_hash', existing_type=sa.String(),
                              nullable=False)
    op.drop_column('users', 'auth_provider')
    op.drop_column('users', 'avatar_url')
    op.drop_column('users', 'github_login')
    op.drop_column('users', 'github_id')
