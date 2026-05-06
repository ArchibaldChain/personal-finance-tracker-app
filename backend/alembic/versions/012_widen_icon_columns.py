"""Widen icon columns from VARCHAR(10) to VARCHAR(50)

Revision ID: 012
Revises: 54a5ec6302b6
Create Date: 2026-05-05
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = '012'
down_revision: Union[str, None] = '54a5ec6302b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column('categories', 'icon',
                    existing_type=sa.String(10),
                    type_=sa.String(50),
                    existing_nullable=True)
    op.alter_column('subcategories', 'icon',
                    existing_type=sa.String(10),
                    type_=sa.String(50),
                    existing_nullable=True)


def downgrade() -> None:
    op.alter_column('subcategories', 'icon',
                    existing_type=sa.String(50),
                    type_=sa.String(10),
                    existing_nullable=True)
    op.alter_column('categories', 'icon',
                    existing_type=sa.String(50),
                    type_=sa.String(10),
                    existing_nullable=True)
