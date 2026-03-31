"""initial schema

Revision ID: 001
Revises:
Create Date: 2026-03-15

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "categories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name"),
    )

    op.create_table(
        "subcategories",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("category_id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.ForeignKeyConstraint(["category_id"], ["categories.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("category_id", "name", name="uq_subcategory_name"),
    )

    op.create_table(
        "imports",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("source_name", sa.String(length=100), nullable=False),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("uploaded_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("total_rows", sa.Integer(), nullable=True),
        sa.Column("parsed_rows", sa.Integer(), nullable=False),
        sa.Column("failed_rows", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "import_rows",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("import_id", sa.Integer(), nullable=False),
        sa.Column("row_index", sa.Integer(), nullable=False),
        sa.Column("raw_json", sa.Text(), nullable=False),
        sa.Column("parse_status", sa.String(length=50), nullable=False),
        sa.Column("parse_error", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["import_id"], ["imports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_import_rows_import_id_row_index", "import_rows", ["import_id", "row_index"])

    op.create_table(
        "transactions",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("import_id", sa.Integer(), nullable=True),
        sa.Column("source_type", sa.String(length=50), nullable=False),
        sa.Column("source_name", sa.String(length=100), nullable=True),
        sa.Column("external_id", sa.String(length=255), nullable=True),
        sa.Column("transaction_date", sa.Date(), nullable=False),
        sa.Column("posted_date", sa.Date(), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=10), nullable=False),
        sa.Column("merchant_raw", sa.String(length=255), nullable=True),
        sa.Column("merchant_normalized", sa.String(length=255), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(length=100), nullable=True),
        sa.Column("subcategory", sa.String(length=100), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_deleted", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("(CURRENT_TIMESTAMP)"), nullable=False),
        sa.ForeignKeyConstraint(["import_id"], ["imports.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_transactions_transaction_date", "transactions", ["transaction_date"])
    op.create_index("ix_transactions_category", "transactions", ["category"])
    op.create_index("ix_transactions_source_type", "transactions", ["source_type"])
    op.create_index("ix_transactions_is_deleted", "transactions", ["is_deleted"])
    op.create_index("ix_transactions_external_id", "transactions", ["external_id"])


def downgrade() -> None:
    op.drop_table("transactions")
    op.drop_table("import_rows")
    op.drop_table("imports")
    op.drop_table("subcategories")
    op.drop_table("categories")
