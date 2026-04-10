# Plan: Add User, Ledger, LedgerMember to Backend

## Context
The app is an MVP expense tracker (FastAPI + SQLAlchemy + SQLite + Alembic). It currently has Transaction, Import, ImportRow, Category, Subcategory, and ClassificationLog models. The goal is to add User, Ledger, and LedgerMember with minimal disruption — additive only, no auth yet, existing data preserved via backfill migration.

---

## Files to Create (3)

### 1. `backend/app/models/user_model.py`
Three models in one file (consistent with how category_model.py groups Category + Subcategory):

```python
from datetime import datetime
from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    auth_provider: Mapped[str] = mapped_column(String(50), default="local", nullable=False)
    auth_provider_user_id: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    owned_ledgers: Mapped[list["Ledger"]] = relationship("Ledger", back_populates="owner", foreign_keys="Ledger.owner_user_id")
    ledger_memberships: Mapped[list["LedgerMember"]] = relationship("LedgerMember", back_populates="user")


class Ledger(Base):
    __tablename__ = "ledgers"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    base_currency: Mapped[str] = mapped_column(String(10), default="CAD", nullable=False)
    is_default: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    owner: Mapped["User"] = relationship("User", back_populates="owned_ledgers", foreign_keys=[owner_user_id])
    members: Mapped[list["LedgerMember"]] = relationship("LedgerMember", back_populates="ledger")


class LedgerMember(Base):
    __tablename__ = "ledger_members"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    ledger_id: Mapped[int] = mapped_column(Integer, ForeignKey("ledgers.id"), nullable=False)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)  # "owner" | "member"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    joined_at: Mapped[datetime] = mapped_column(DateTime, server_default=func.now(), nullable=False)
    ledger: Mapped["Ledger"] = relationship("Ledger", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="ledger_memberships")
```

### 2. `backend/alembic/versions/004_add_users_ledgers_ledger_members.py`
Single additive migration covering all 13 steps:
1. CREATE TABLE `users`
2. CREATE TABLE `ledgers` (FK to users)
3. CREATE TABLE `ledger_members` (FK to both)
4. ADD COLUMN `ledger_id` (nullable Integer) to `transactions`
5. ADD COLUMN `created_by_user_id` (nullable Integer) to `transactions`
6. ADD COLUMN `updated_by_user_id` (nullable Integer) to `transactions`
7. ADD COLUMN `ledger_id` (nullable Integer) to `imports`
8. ADD COLUMN `uploaded_by_user_id` (nullable Integer) to `imports`
9. INSERT default user (auth_provider="local", auth_provider_user_id="dev-default-user", email="developer@local", display_name="Developer") — with idempotent existence check
10. INSERT default ledger (name="Default Ledger", base_currency="CAD", is_default=True) — idempotent
11. INSERT LedgerMember (role="owner") — idempotent
12. UPDATE transactions SET ledger_id = <default_ledger_id> WHERE ledger_id IS NULL
13. UPDATE imports SET ledger_id = <default_ledger_id> WHERE ledger_id IS NULL

SQLite notes:
- ADD COLUMN cannot carry FK constraints in SQLite — columns still function correctly at the application layer; document with TODO
- New tables (created from scratch) carry proper FK constraints
- downgrade() uses `op.batch_alter_table` to drop columns (SQLite-safe recreation pattern)
- Data inserts use ad-hoc `table()`/`column()` constructs (not ORM models) per Alembic best practice

### 3. `backend/app/services/ledger_service.py`
Minimal helper for future auth wiring — not wired to any endpoint yet:
```python
def create_default_ledger_for_user(db: Session, user: User) -> Ledger:
    # Creates Ledger + LedgerMember(role="owner") atomically via db.flush()
```

---

## Files to Modify (4)

### 4. `backend/app/models/__init__.py`
Add one line (alembic/env.py uses `import app.models` namespace import — this is sufficient):
```python
from app.models.user_model import User, Ledger, LedgerMember  # noqa: F401
```

### 5. `backend/app/models/transaction_model.py`
Add 3 nullable columns after `import_id` (ForeignKey, Integer already imported):
```python
ledger_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("ledgers.id"), nullable=True)
created_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
updated_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
```
Add 3 relationships after the existing `import_` relationship.

### 6. `backend/app/models/import_model.py`
Add `ForeignKey` to the SQLAlchemy import line (currently missing).
Add 2 nullable columns + 2 relationships:
```python
ledger_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("ledgers.id"), nullable=True)
uploaded_by_user_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"), nullable=True)
```

### 7. `backend/app/schemas/transaction_schema.py` and `backend/app/schemas/import_schema.py`
Add nullable fields to Read schemas (backward-compatible — all default to None):
- `TransactionRead`: add `ledger_id: int | None = None`, `created_by_user_id: int | None = None`, `updated_by_user_id: int | None = None`
- `ImportRead`: add `ledger_id: int | None = None`, `uploaded_by_user_id: int | None = None`

---

## Categories Scoped to Ledger

Categories are owned by a ledger. Seed categories act as a **template** — every new ledger automatically gets its own copy of them on creation. The `CATEGORY_DATA` constant in `category_service.py` remains the single source of truth for what the defaults are.

Subcategories inherit ownership through `category_id` — no direct `ledger_id` needed on `Subcategory`.

### 8. `backend/app/models/category_model.py`
Add 1 nullable column to `Category`:
```python
ledger_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("ledgers.id"), nullable=True)
```
Also add `ForeignKey` and `Integer` to the SQLAlchemy import line (currently missing).
No change to `Subcategory`.

### 9. `backend/alembic/versions/004_add_users_ledgers_ledger_members.py` (extended)
Add to the same migration (after step 13):

14. ADD COLUMN `ledger_id` (nullable Integer) to `categories`
15. UPDATE categories SET ledger_id = <default_ledger_id> WHERE ledger_id IS NULL

SQLite ADD COLUMN FK caveat applies — same pattern as transactions/imports.

### 10. `backend/app/services/category_service.py`
**`seed_categories(db, ledger_id)`** — update to require a `ledger_id` and set it on every inserted category. The idempotent check becomes: skip if a category with that name AND that `ledger_id` already exists. The `CATEGORY_DATA` constant is unchanged.

**`list_categories(db, ledger_id)`** — add a required `ledger_id` filter so each ledger only sees its own categories.

### 11. `backend/app/services/ledger_service.py`
Update `create_default_ledger_for_user()` to also call `seed_categories(db, ledger_id=ledger.id)` after creating the ledger. This ensures every new ledger gets the full default category set automatically.

### 12. `backend/app/main.py`
Update the lifespan startup seed call: look up the default ledger and pass its ID:
```python
default_ledger = db.query(Ledger).filter_by(is_default=True).first()
if default_ledger:
    seed_categories(db, ledger_id=default_ledger.id)
```
This replaces the current no-arg `seed_categories(db)` call.

### 13. `backend/api/routes/categories.py`
Update `GET /categories` to accept a `?ledger_id=` query param and pass it to `list_categories`. For now, if omitted, default to the default ledger's ID (no breaking change for existing frontend).

### 14. `backend/app/schemas/category_schema.py`
Add `ledger_id` to `CategoryRead`:
```python
ledger_id: int | None = None
```

---

## Not Changed
- `alembic/env.py` — no changes needed (uses `import app.models` namespace import)
- All other route handlers
- `Subcategory` model and schema — inherits ledger ownership through `category_id`
- Frontend

---

## Verification
```bash
cd backend
uv run alembic upgrade head           # runs migration 004 (all 15 steps)
uv run uvicorn app.main:app --reload  # check /health and all existing endpoints still work
uv run pytest                         # all existing tests should pass
```
Check that `finance.db` has tables: `users`, `ledgers`, `ledger_members`, and that `transactions`, `imports`, and `categories` all have a backfilled `ledger_id` pointing to the default ledger.
