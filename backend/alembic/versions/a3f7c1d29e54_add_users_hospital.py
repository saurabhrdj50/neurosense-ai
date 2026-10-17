"""add users.hospital

Revision ID: a3f7c1d29e54
Revises: 824854532f1c
Create Date: 2026-10-06

Adds the hospital/institution field captured at registration to the users
table. Existing rows get '' (empty) — the field is optional by design so the
legacy registration payloads (no hospital) stay valid.
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a3f7c1d29e54'
down_revision: Union[str, Sequence[str], None] = '824854532f1c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('hospital', sa.String(), nullable=True,
                                     server_default=''))


def downgrade() -> None:
    op.drop_column('users', 'hospital')
