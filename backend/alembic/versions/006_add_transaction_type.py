"""Add transaction_type to categories and transactions

Revision ID: 006
Revises: 005
Create Date: 2026-04-10

Migration plan:
1. Add nullable transaction_type to categories
2. Add nullable transaction_type to transactions
3. Backfill categories by name heuristic (Income→income, Transfers→transfer, else→expense)
4. Backfill transactions by inferring from their category name
5. Make both columns NOT NULL
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision = "006"
down_revision = "005"
branch_labels = None
depends_on = None


def _existing_columns(bind, table_name: str) -> set[str]:
    return {c["name"] for c in inspect(bind).get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()

    # Step 1: Add nullable transaction_type to categories
    if "transaction_type" not in _existing_columns(bind, "categories"):
        op.add_column("categories", sa.Column("transaction_type", sa.String(20), nullable=True))

    # Step 2: Add nullable transaction_type to transactions
    if "transaction_type" not in _existing_columns(bind, "transactions"):
        op.add_column("transactions", sa.Column("transaction_type", sa.String(20), nullable=True))

    # Step 3: Backfill categories
    bind.execute(sa.text(
        "UPDATE categories SET transaction_type = 'income' "
        "WHERE name = 'Income' AND transaction_type IS NULL"
    ))
    bind.execute(sa.text(
        "UPDATE categories SET transaction_type = 'transfer' "
        "WHERE name = 'Transfers' AND transaction_type IS NULL"
    ))
    bind.execute(sa.text(
        "UPDATE categories SET transaction_type = 'expense' WHERE transaction_type IS NULL"
    ))

    # Step 4: Backfill transactions — infer transaction_type from category name
    # Uses a correlated subquery that works on both SQLite and PostgreSQL.
    bind.execute(sa.text(
        "UPDATE transactions "
        "SET transaction_type = COALESCE("
        "    (SELECT c.transaction_type FROM categories c "
        "     WHERE c.name = transactions.category LIMIT 1), "
        "    'expense'"
        ") "
        "WHERE transaction_type IS NULL"
    ))

    # Step 5: Make columns NOT NULL (batch mode for SQLite compatibility)
    with op.batch_alter_table("categories") as batch_op:
        batch_op.alter_column(
            "transaction_type",
            existing_type=sa.String(20),
            nullable=False,
        )

    with op.batch_alter_table("transactions") as batch_op:
        batch_op.alter_column(
            "transaction_type",
            existing_type=sa.String(20),
            nullable=False,
        )


def downgrade() -> None:
    with op.batch_alter_table("transactions") as batch_op:
        batch_op.drop_column("transaction_type")

    with op.batch_alter_table("categories") as batch_op:
        batch_op.drop_column("transaction_type")
