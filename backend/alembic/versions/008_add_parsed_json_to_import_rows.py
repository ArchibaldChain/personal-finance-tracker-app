"""Add parsed_json column to import_rows

Revision ID: 008
Revises: 007
Create Date: 2026-04-16
"""

import sqlalchemy as sa
from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("import_rows") as batch_op:
        batch_op.add_column(sa.Column("parsed_json", sa.Text(), nullable=True))


def downgrade() -> None:
    with op.batch_alter_table("import_rows") as batch_op:
        batch_op.drop_column("parsed_json")
