"""Replace transaction category/subcategory string columns with FK references

Revision ID: 007
Revises: 006
Create Date: 2026-04-12

Migration plan:
1. Add nullable category_id / subcategory_id FK columns to transactions
2. Backfill category_id by matching category name + ledger_id
3. Backfill subcategory_id by matching subcategory name under resolved category
4. Drop old category / subcategory string columns
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


def _existing_columns(bind, table_name: str) -> set[str]:
    return {c["name"] for c in inspect(bind).get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    cols = _existing_columns(bind, "transactions")

    # Step 1: add FK columns as plain integers (SQLite does not enforce FK constraints
    # unless PRAGMA foreign_keys=ON; the ORM relationships handle the joins).
    if "category_id" not in cols:
        op.add_column("transactions", sa.Column("category_id", sa.Integer(), nullable=True))
    if "subcategory_id" not in cols:
        op.add_column("transactions", sa.Column("subcategory_id", sa.Integer(), nullable=True))

    # Step 2: backfill category_id from category name + ledger_id
    bind.execute(sa.text("""
        UPDATE transactions
        SET category_id = (
            SELECT c.id FROM categories c
            WHERE c.name = transactions.category
              AND c.ledger_id = transactions.ledger_id
            LIMIT 1
        )
        WHERE transactions.category IS NOT NULL
          AND transactions.category_id IS NULL
    """))

    # Step 3: backfill subcategory_id from subcategory name under resolved category
    bind.execute(sa.text("""
        UPDATE transactions
        SET subcategory_id = (
            SELECT s.id FROM subcategories s
            WHERE s.name = transactions.subcategory
              AND s.category_id = transactions.category_id
            LIMIT 1
        )
        WHERE transactions.subcategory IS NOT NULL
          AND transactions.category_id IS NOT NULL
          AND transactions.subcategory_id IS NULL
    """))

    # Step 4: drop old string columns (drop the old index first — batch mode
    # would try to recreate it and fail because the column is being removed)
    existing_indexes = {idx["name"] for idx in inspect(bind).get_indexes("transactions")}
    if "ix_transactions_category" in existing_indexes:
        op.drop_index("ix_transactions_category", table_name="transactions")

    with op.batch_alter_table("transactions") as batch_op:
        if "category" in _existing_columns(bind, "transactions"):
            batch_op.drop_column("category")
        if "subcategory" in _existing_columns(bind, "transactions"):
            batch_op.drop_column("subcategory")


def downgrade() -> None:
    bind = op.get_bind()

    # Re-add string columns
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.add_column(sa.Column("category", sa.String(100), nullable=True))
        batch_op.add_column(sa.Column("subcategory", sa.String(100), nullable=True))

    # Restore names from FK relationships
    bind.execute(sa.text("""
        UPDATE transactions
        SET category = (
            SELECT c.name FROM categories c WHERE c.id = transactions.category_id
        )
        WHERE transactions.category_id IS NOT NULL
    """))
    bind.execute(sa.text("""
        UPDATE transactions
        SET subcategory = (
            SELECT s.name FROM subcategories s WHERE s.id = transactions.subcategory_id
        )
        WHERE transactions.subcategory_id IS NOT NULL
    """))

    # Drop FK columns
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.drop_column("subcategory_id")
        batch_op.drop_column("category_id")
