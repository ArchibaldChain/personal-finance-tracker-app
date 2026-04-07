"""Add users, ledgers, ledger_members; scope transactions/imports/categories to ledger

Revision ID: 004
Revises: 003
Create Date: 2026-04-07
"""

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect
from sqlalchemy.sql import column, table

revision = "004"
down_revision = "003"
branch_labels = None
depends_on = None


def _existing_columns(bind, table_name: str) -> set[str]:
    return {c["name"] for c in inspect(bind).get_columns(table_name)}


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())

    # ------------------------------------------------------------------ #
    # 1. Create users table                                                #
    # ------------------------------------------------------------------ #
    if "users" not in existing_tables:
        op.create_table(
            "users",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("auth_provider", sa.String(50), nullable=False, server_default="local"),
            sa.Column("auth_provider_user_id", sa.String(255), nullable=False),
            sa.Column("email", sa.String(255), nullable=False),
            sa.Column("display_name", sa.String(255), nullable=False),
            sa.Column("avatar_url", sa.String(500), nullable=True),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("auth_provider_user_id"),
            sa.UniqueConstraint("email"),
        )

    # ------------------------------------------------------------------ #
    # 2. Create ledgers table                                              #
    # ------------------------------------------------------------------ #
    if "ledgers" not in existing_tables:
        op.create_table(
            "ledgers",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("name", sa.String(255), nullable=False),
            sa.Column("owner_user_id", sa.Integer(), nullable=False),
            sa.Column("base_currency", sa.String(10), nullable=False, server_default="CAD"),
            sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("0")),
            sa.Column(
                "created_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.Column(
                "updated_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["owner_user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    # ------------------------------------------------------------------ #
    # 3. Create ledger_members table                                       #
    # ------------------------------------------------------------------ #
    if "ledger_members" not in existing_tables:
        op.create_table(
            "ledger_members",
            sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
            sa.Column("ledger_id", sa.Integer(), nullable=False),
            sa.Column("user_id", sa.Integer(), nullable=False),
            sa.Column("role", sa.String(50), nullable=False),
            sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("1")),
            sa.Column(
                "joined_at",
                sa.DateTime(),
                server_default=sa.text("(CURRENT_TIMESTAMP)"),
                nullable=False,
            ),
            sa.ForeignKeyConstraint(["ledger_id"], ["ledgers.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
            sa.PrimaryKeyConstraint("id"),
        )

    # ------------------------------------------------------------------ #
    # 4-6. Add nullable FK columns to transactions                         #
    # SQLite note: ADD COLUMN cannot carry FK constraints. The columns     #
    # function correctly as FKs at the application layer.                  #
    # TODO: enforce FK constraints via table recreation once on Postgres.  #
    # ------------------------------------------------------------------ #
    tx_cols = _existing_columns(bind, "transactions")
    if "ledger_id" not in tx_cols:
        op.add_column("transactions", sa.Column("ledger_id", sa.Integer(), nullable=True))
    if "created_by_user_id" not in tx_cols:
        op.add_column("transactions", sa.Column("created_by_user_id", sa.Integer(), nullable=True))
    if "updated_by_user_id" not in tx_cols:
        op.add_column("transactions", sa.Column("updated_by_user_id", sa.Integer(), nullable=True))

    # ------------------------------------------------------------------ #
    # 7-8. Add nullable FK columns to imports                              #
    # Same SQLite ADD COLUMN FK caveat applies.                            #
    # ------------------------------------------------------------------ #
    imp_cols = _existing_columns(bind, "imports")
    if "ledger_id" not in imp_cols:
        op.add_column("imports", sa.Column("ledger_id", sa.Integer(), nullable=True))
    if "uploaded_by_user_id" not in imp_cols:
        op.add_column("imports", sa.Column("uploaded_by_user_id", sa.Integer(), nullable=True))

    # ------------------------------------------------------------------ #
    # 9-11. Seed default user, ledger, and membership                      #
    # Uses ad-hoc table constructs (not ORM models) per Alembic practice.  #
    # All inserts are idempotent.                                           #
    # ------------------------------------------------------------------ #
    users_t = table(
        "users",
        column("auth_provider", sa.String),
        column("auth_provider_user_id", sa.String),
        column("email", sa.String),
        column("display_name", sa.String),
        column("is_active", sa.Boolean),
    )
    ledgers_t = table(
        "ledgers",
        column("name", sa.String),
        column("owner_user_id", sa.Integer),
        column("base_currency", sa.String),
        column("is_default", sa.Boolean),
        column("is_archived", sa.Boolean),
    )
    ledger_members_t = table(
        "ledger_members",
        column("ledger_id", sa.Integer),
        column("user_id", sa.Integer),
        column("role", sa.String),
        column("is_active", sa.Boolean),
    )

    # Insert default developer user (idempotent)
    existing_user = bind.execute(
        sa.text("SELECT id FROM users WHERE auth_provider_user_id = 'dev-default-user' LIMIT 1")
    ).fetchone()
    if existing_user is None:
        bind.execute(
            users_t.insert().values(
                auth_provider="local",
                auth_provider_user_id="dev-default-user",
                email="developer@local",
                display_name="Developer",
                is_active=True,
            )
        )
    default_user_id = bind.execute(
        sa.text("SELECT id FROM users WHERE auth_provider_user_id = 'dev-default-user' LIMIT 1")
    ).fetchone()[0]

    # Insert default ledger (idempotent)
    existing_ledger = bind.execute(
        sa.text(
            "SELECT id FROM ledgers WHERE owner_user_id = :uid AND is_default = 1 LIMIT 1"
        ),
        {"uid": default_user_id},
    ).fetchone()
    if existing_ledger is None:
        bind.execute(
            ledgers_t.insert().values(
                name="Default Ledger",
                owner_user_id=default_user_id,
                base_currency="CAD",
                is_default=True,
                is_archived=False,
            )
        )
    default_ledger_id = bind.execute(
        sa.text(
            "SELECT id FROM ledgers WHERE owner_user_id = :uid AND is_default = 1 LIMIT 1"
        ),
        {"uid": default_user_id},
    ).fetchone()[0]

    # Insert owner membership (idempotent)
    existing_membership = bind.execute(
        sa.text(
            "SELECT id FROM ledger_members WHERE ledger_id = :lid AND user_id = :uid LIMIT 1"
        ),
        {"lid": default_ledger_id, "uid": default_user_id},
    ).fetchone()
    if existing_membership is None:
        bind.execute(
            ledger_members_t.insert().values(
                ledger_id=default_ledger_id,
                user_id=default_user_id,
                role="owner",
                is_active=True,
            )
        )

    # ------------------------------------------------------------------ #
    # 12. Backfill transactions                                            #
    # ------------------------------------------------------------------ #
    bind.execute(
        sa.text("UPDATE transactions SET ledger_id = :lid WHERE ledger_id IS NULL"),
        {"lid": default_ledger_id},
    )

    # ------------------------------------------------------------------ #
    # 13. Backfill imports                                                 #
    # ------------------------------------------------------------------ #
    bind.execute(
        sa.text("UPDATE imports SET ledger_id = :lid WHERE ledger_id IS NULL"),
        {"lid": default_ledger_id},
    )

    # ------------------------------------------------------------------ #
    # 14-15. Add ledger_id to categories + backfill                        #
    # The original unique=True on Category.name was inline/anonymous in    #
    # SQLite, so we can't drop it by name. Instead we recreate the table   #
    # manually via raw SQL — the safest approach for SQLite schema changes. #
    # ------------------------------------------------------------------ #
    cat_cols = _existing_columns(bind, "categories")
    if "ledger_id" not in cat_cols:
        bind.execute(sa.text("""
            CREATE TABLE categories_new (
                id      INTEGER     NOT NULL PRIMARY KEY AUTOINCREMENT,
                name    VARCHAR(100) NOT NULL,
                icon    VARCHAR(10),
                ledger_id INTEGER,
                UNIQUE (ledger_id, name)
            )
        """))
        bind.execute(sa.text(
            "INSERT INTO categories_new (id, name, icon) SELECT id, name, icon FROM categories"
        ))
        bind.execute(sa.text("DROP TABLE categories"))
        bind.execute(sa.text("ALTER TABLE categories_new RENAME TO categories"))

    bind.execute(
        sa.text("UPDATE categories SET ledger_id = :lid WHERE ledger_id IS NULL"),
        {"lid": default_ledger_id},
    )


def downgrade() -> None:
    # Restore categories table: drop ledger_id, restore global unique on name
    bind = op.get_bind()
    bind.execute(sa.text("""
        CREATE TABLE categories_old (
            id      INTEGER     NOT NULL PRIMARY KEY AUTOINCREMENT,
            name    VARCHAR(100) NOT NULL UNIQUE,
            icon    VARCHAR(10)
        )
    """))
    bind.execute(sa.text(
        "INSERT INTO categories_old (id, name, icon) SELECT id, name, icon FROM categories"
    ))
    bind.execute(sa.text("DROP TABLE categories"))
    bind.execute(sa.text("ALTER TABLE categories_old RENAME TO categories"))

    # Drop new columns from imports and transactions via batch (SQLite-safe)
    with op.batch_alter_table("imports") as batch_op:
        batch_op.drop_column("uploaded_by_user_id")
        batch_op.drop_column("ledger_id")

    with op.batch_alter_table("transactions") as batch_op:
        batch_op.drop_column("updated_by_user_id")
        batch_op.drop_column("created_by_user_id")
        batch_op.drop_column("ledger_id")

    # Drop new tables in FK-safe order
    op.drop_table("ledger_members")
    op.drop_table("ledgers")
    op.drop_table("users")
