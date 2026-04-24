"""Add custom_parser_configs table

Revision ID: 009
Revises: 008
Create Date: 2026-04-21
"""

import sqlalchemy as sa
from alembic import op

revision = "009"
down_revision = "008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "custom_parser_configs",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("ledger_id", sa.Integer(), sa.ForeignKey("ledgers.id"), nullable=True),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("skip_rows", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("column_mapping_json", sa.Text(), nullable=False),
        sa.Column("amount_mode", sa.String(20), nullable=False, server_default="single"),
        sa.Column("debit_column", sa.String(255), nullable=True),
        sa.Column("credit_column", sa.String(255), nullable=True),
        sa.Column("date_format", sa.String(50), nullable=False, server_default="%m/%d/%Y"),
        sa.Column("currency", sa.String(10), nullable=False, server_default="USD"),
        sa.Column("account_type", sa.String(20), nullable=False, server_default="debit"),
        sa.Column("column_signature", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), onupdate=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("custom_parser_configs")
