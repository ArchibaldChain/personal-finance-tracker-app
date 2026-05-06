"""widen avatar_url to text

Revision ID: 54a5ec6302b6
Revises: 011
Create Date: 2026-05-05 21:53:53.114848

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '54a5ec6302b6'
down_revision: Union[str, None] = '011'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'users', 'avatar_url',
        existing_type=sa.VARCHAR(length=500),
        type_=sa.Text(),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        'users', 'avatar_url',
        existing_type=sa.Text(),
        type_=sa.VARCHAR(length=500),
        existing_nullable=True,
    )
