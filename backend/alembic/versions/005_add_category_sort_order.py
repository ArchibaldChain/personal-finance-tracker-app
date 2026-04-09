"""Add sort_order to categories

Revision ID: 005
Revises: 004
Create Date: 2026-04-08
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "005"
down_revision = "004"
branch_labels = None
depends_on = None


def _existing_columns(bind, table_name: str) -> set[str]:
    return {c["name"] for c in inspect(bind).get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    if "sort_order" not in _existing_columns(bind, "categories"):
        op.add_column("categories", sa.Column("sort_order", sa.Integer(), nullable=True))

    # Backfill: assign sort_order = id so existing rows keep their current order
    bind.execute(sa.text(
        "UPDATE categories SET sort_order = id WHERE sort_order IS NULL"
    ))


def downgrade() -> None:
    with op.batch_alter_table("categories") as batch_op:
        batch_op.drop_column("sort_order")
