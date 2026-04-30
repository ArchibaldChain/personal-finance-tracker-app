"""add_is_duplicate_to_transactions

Revision ID: f056c0ec080f
Revises: 009
Create Date: 2026-04-29 20:27:55.573402

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f056c0ec080f'
down_revision: Union[str, None] = '009'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('is_duplicate', sa.Boolean(), nullable=False, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('transactions', 'is_duplicate')
