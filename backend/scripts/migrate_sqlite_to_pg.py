"""
One-time migration script: copies all data from SQLite → PostgreSQL.

Usage:
    cd backend
    uv run alembic upgrade head          # apply schema to PostgreSQL first
    uv run python scripts/migrate_sqlite_to_pg.py
"""
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.types import Boolean

from app.config import get_settings

SQLITE_URL = "sqlite:///./finance.db"

# Tables in foreign-key dependency order (parents before children)
TABLES = [
    "users",
    "ledgers",
    "ledger_members",
    "custom_parser_configs",
    "categories",
    "subcategories",
    "imports",
    "import_rows",
    "transactions",
    "classification_logs",
]

sqlite_engine = create_engine(SQLITE_URL, connect_args={"check_same_thread": False})
pg_engine = create_engine(get_settings().DATABASE_URL)
pg_inspector = inspect(pg_engine)

sqlite_tables = inspect(sqlite_engine).get_table_names()


def bool_cols(table: str) -> set[str]:
    """Return column names that are boolean type in PostgreSQL."""
    return {
        c["name"]
        for c in pg_inspector.get_columns(table)
        if isinstance(c["type"], Boolean)
    }


def coerce_row(row: dict, bools: set[str]) -> dict:
    """Cast SQLite integer boolean values to Python bool."""
    return {
        k: bool(v) if k in bools and v is not None else v
        for k, v in row.items()
    }


with sqlite_engine.connect() as src, pg_engine.connect() as dst:
    # Clear all tables atomically; CASCADE handles FK dependencies
    tables_to_clear = [t for t in TABLES if t in sqlite_tables]
    if tables_to_clear:
        names = ", ".join(tables_to_clear)
        dst.execute(text(f"TRUNCATE {names} RESTART IDENTITY CASCADE"))
    dst.commit()

    for table in TABLES:
        if table not in sqlite_tables:
            print(f"  skip  {table} (not in SQLite)")
            continue

        rows = src.execute(text(f"SELECT * FROM {table}")).mappings().all()
        if not rows:
            print(f"  empty {table}")
            continue

        bools = bool_cols(table)
        cols = list(rows[0].keys())
        col_list = ", ".join(f'"{c}"' for c in cols)
        placeholders = ", ".join(f":{c}" for c in cols)
        dst.execute(
            text(f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})"),
            [coerce_row(dict(r), bools) for r in rows],
        )
        print(f"  migrated {table}: {len(rows)} rows")

    dst.commit()

    # Reset auto-increment sequences so new rows don't conflict
    print("\nResetting sequences...")
    for table in TABLES:
        if table not in sqlite_tables:
            continue
        try:
            dst.execute(text(f"""
                SELECT setval(
                    pg_get_serial_sequence('{table}', 'id'),
                    COALESCE((SELECT MAX(id) FROM {table}), 0) + 1,
                    false
                )
            """))
        except Exception:
            pass  # table has no id sequence (e.g. ledger_members)
    dst.commit()

print("\nDone.")