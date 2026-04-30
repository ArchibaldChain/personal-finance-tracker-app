"""add_duplicate_of_id_to_transactions

Revision ID: 011
Revises: f056c0ec080f
Create Date: 2026-04-29

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '011'
down_revision: Union[str, None] = 'f056c0ec080f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('transactions', sa.Column('duplicate_of_id', sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column('transactions', 'duplicate_of_id')
