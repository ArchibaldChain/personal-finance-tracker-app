# Development Manual

Architecture, data flows, parser system, and test setup for the personal finance tracking app.

---

## Project Structure

```
personal-finance-tracking-app/
├── CLAUDE.md                          # AI assistant conventions
├── README.md                          # Setup & run instructions
├── .gitignore
├── docs/
│   ├── development-manual.md          # This file
│   ├── design.md                      # Architecture & design decisions
│   ├── spec.md                        # Feature spec & full API reference
│   ├── init-prompt.md                 # Original MVP spec
│   └── default_category.md           # Category taxonomy reference
│
├── backend/                           # Python + FastAPI
│   ├── pyproject.toml                 # Dependencies (managed by uv)
│   ├── alembic.ini                    # Migration config
│   ├── .env.example                   # Environment variable template
│   │
│   ├── alembic/
│   │   ├── env.py                     # Migration runner (reads app config)
│   │   └── versions/
│   │       ├── 001_initial_schema.py
│   │       ├── 002_add_classification_tables.py
│   │       ├── 003_add_icon_to_categories.py
│   │       ├── 004_add_users_ledgers_ledger_members.py
│   │       ├── 005_add_category_sort_order.py
│   │       ├── 006_add_transaction_type.py
│   │       ├── 007_transaction_category_fk.py
│   │       └── 008_add_parsed_json_to_import_rows.py
│   │
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory, CORS, lifespan seed
│   │   ├── config.py                  # Settings (DATABASE_URL, CORS_ORIGINS, OpenAI)
│   │   │
│   │   ├── db/
│   │   │   ├── base.py                # SQLAlchemy DeclarativeBase
│   │   │   └── session.py             # Engine, SessionLocal, get_db()
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM (what's in the DB)
│   │   │   ├── transaction_model.py   # transactions table
│   │   │   ├── user_model.py          # users, ledgers, ledger_members tables
│   │   │   ├── category_model.py      # categories + subcategories tables
│   │   │   ├── import_model.py        # imports table
│   │   │   ├── import_row_model.py    # import_rows table (raw CSV data)
│   │   │   └── classification_log_model.py  # classification audit log
│   │   │
│   │   ├── schemas/                   # Pydantic (API request/response shapes)
│   │   │   ├── transaction_schema.py  # Create, Update, Read, ListResponse
│   │   │   ├── category_schema.py
│   │   │   ├── import_schema.py
│   │   │   └── ledger_schema.py
│   │   │
│   │   ├── parsers/                   # CSV parser system
│   │   │   ├── base.py                # ParsedRow dataclass + BaseParser ABC
│   │   │   ├── registry.py            # ParserRegistry singleton
│   │   │   ├── chase_parser.py        # Chase CSV format
│   │   │   ├── bofa_parser.py         # BofA CSV format (skips header lines)
│   │   │   ├── bmo_parser.py          # BMO chequing + cash accounts
│   │   │   ├── wealthsimple_parser.py # Wealthsimple investment + cash accounts
│   │   │   ├── walmart_rewards_parser.py
│   │   │   └── __init__.py            # Registers all parsers at import time
│   │   │
│   │   ├── services/                  # Business logic layer
│   │   │   ├── import_service.py      # create_import, store_raw_rows, process_import
│   │   │   ├── transaction_service.py # list, get, create, update, delete
│   │   │   ├── category_service.py    # list_categories, seed_categories
│   │   │   ├── ledger_service.py      # ledger + user management
│   │   │   └── classification/        # Auto-categorization system
│   │   │       ├── base.py            # BaseClassifier ABC, ClassificationResult
│   │   │       ├── simple_classifier.py  # Rule-based keyword classifier
│   │   │       ├── llm_classifier.py     # OpenAI GPT classifier
│   │   │       ├── category_tree.py      # Build category tree for LLM prompt
│   │   │       ├── cache.py              # Classification result cache
│   │   │       └── utils.py
│   │   │
│   │   ├── api/routes/                # Thin HTTP handlers (delegate to services)
│   │   │   ├── transactions.py        # GET/POST/PATCH/DELETE /transactions
│   │   │   ├── imports.py             # POST/GET /imports, POST /imports/{id}/process
│   │   │   ├── categories.py          # CRUD /categories + /subcategories
│   │   │   ├── sources.py             # GET /sources
│   │   │   └── ledgers.py             # /ledgers/users, /ledgers/default
│   │   │
│   │   └── constants/
│   │       ├── categories.py          # Seed data (mirrors default_category.md)
│   │       └── transaction_type.py    # TransactionType enum
│   │
│   ├── sample_data/
│   │   ├── chase_sample.csv
│   │   ├── bofa_sample.csv
│   │   └── seed_transactions.py       # Script to pre-load demo data
│   │
│   └── tests/
│       ├── conftest.py                # In-memory SQLite fixtures, TestClient
│       ├── test_parsers.py            # Parser tests (18 tests)
│       ├── test_import_flow.py        # Full upload→process pipeline (11 tests)
│       ├── test_transaction_service.py # CRUD + filter/search tests (17 tests)
│       ├── test_llm_classifier.py     # LLM classification tests
│       ├── test_bmo_parser.py
│       └── test_walmart_rewards_parser.py
│
└── frontend/                          # React + TypeScript + Vite
    ├── index.html
    ├── vite.config.ts                 # Proxy /api → localhost:8000
    ├── package.json
    │
    └── src/
        ├── main.tsx                   # ReactDOM root, BrowserRouter
        ├── App.tsx                    # Routes + ProtectedRoute guards
        ├── index.css
        │
        ├── types/index.ts             # TypeScript interfaces (mirrors backend schemas)
        │
        ├── api/                       # Axios API client functions
        │   ├── client.ts              # Axios instance (baseURL = /api)
        │   ├── transactions.ts
        │   ├── imports.ts
        │   ├── categories.ts
        │   └── ledgers.ts
        │
        ├── hooks/
        │   ├── useCategories.ts       # Fetches & caches categories once on mount
        │   └── useSources.ts          # Fetches registered parser sources
        │
        ├── context/
        │   ├── AuthContext.tsx        # Current user (persisted to localStorage)
        │   └── AppContext.tsx         # App-level state
        │
        ├── components/
        │   ├── Layout.tsx             # Nav bar + <Outlet />
        │   ├── ProtectedRoute.tsx     # Auth guard
        │   ├── Modal.tsx              # Reusable overlay (Esc to close)
        │   ├── TransactionForm.tsx    # Shared add/edit form (linked cat/subcat)
        │   ├── AddTransactionModal.tsx
        │   ├── EditTransactionModal.tsx  # Includes Delete button
        │   ├── TransactionTable.tsx   # Sortable table, negative amounts in red
        │   ├── TransactionFiltersBar.tsx # Search + category + source dropdowns
        │   ├── ImportForm.tsx         # File upload + source select
        │   ├── ImportHistoryTable.tsx # Status badges per import
        │   ├── Pagination.tsx
        │   ├── CategoryIcon.tsx
        │   ├── IconSelect.tsx
        │   └── MonthPicker.tsx
        │
        └── pages/
            ├── LoginPage.tsx          # User picker
            ├── DashboardPage.tsx      # Spending summaries + charts
            ├── TransactionsPage.tsx   # Wires filters + table + pagination + modals
            ├── ImportPage.tsx         # ImportForm + ImportHistoryTable
            ├── CategoriesPage.tsx     # Category CRUD + icon picker
            └── ProfilePage.tsx        # User profile
```

---

## Architecture Overview

```
Browser (localhost:5173)
       │
       │  HTTP via /api proxy
       ▼
FastAPI backend (localhost:8000)
       │
       │  SQLAlchemy ORM
       ▼
  SQLite (finance.db)
```

The Vite dev server proxies `/api/*` to FastAPI, so there are no CORS issues in development.

### Backend Layer Breakdown

```
HTTP Request
    │
    ▼
api/routes/          ← Thin handlers: validate input, call service, return response
    │
    ▼
services/            ← All business logic lives here
    │
    ├── parsers/     ← CSV parsing (called by import_service)
    ├── classification/  ← Auto-categorization (called by import_service)
    │
    └── models/      ← SQLAlchemy ORM queries
    │
    ▼
finance.db
```

**Rule:** Route handlers never contain business logic. Services never import FastAPI.

---

## Database Schema

```
users (1) ─── (many) ledger_members (many) ─── (1) ledgers
                                                     │
                                         ┌───────────┴──────────┐
                                         │                      │
                                   transactions              imports
                                         │                      │
                             ┌───────────┴──┐           import_rows
                             │              │
                        categories    subcategories
```

### Key tables

**transactions**
```
id                PK
import_id         FK → imports (null for manual)
ledger_id         FK → ledgers
source_type       "csv" | "manual"
source_name       "chase" | "bofa" | etc.
external_id       for deduplication
transaction_date  date
amount            decimal(12,2)  — negative = expense
currency          default "USD"
merchant_raw      original from CSV
merchant_normalized
description
transaction_type  "expense" | "income" | "transfer"
category_id       FK → categories
subcategory_id    FK → subcategories
classification_confidence  float 0.0–1.0
notes
is_deleted        soft delete flag
created_at / updated_at
```

**imports**
```
id              PK
source_name     parser key
file_name
uploaded_at
status          pending | processing | processed | processed_with_errors
total_rows
parsed_rows
failed_rows
ledger_id       FK → ledgers
```

**import_rows**
```
id            PK
import_id     FK → imports
row_index
raw_json      original CSV row as JSON — never lost
parse_status  pending | success | failed
parse_error
parsed_json   ParsedRow as JSON (set after processing)
```

**categories / subcategories**
```
categories:      id, name, icon, transaction_type, ledger_id, sort_order
subcategories:   id, category_id (FK), name, icon
```

**users / ledgers / ledger_members**
```
users:           id, auth_provider ("local"), email, display_name, avatar_url, is_active
ledgers:         id, name, owner_user_id, base_currency ("CAD"), is_default, is_archived
ledger_members:  id, ledger_id, user_id, role ("owner"|"member"), is_active, joined_at
```

---

## Key Data Flows

### CSV Import (Two-Phase)

The import is split so raw data is always preserved, even when parsing fails:

```
Phase 1 — POST /imports
──────────────────────────────────────────────────────────────
  1. Validate source_name is a registered parser
  2. Create imports record (status = "pending")
  3. Read CSV bytes, extract raw row dicts
  4. Store ALL raw dicts into import_rows (parse_status = "pending")
  5. Return ImportRead (status = "pending", total_rows = N)

Phase 2 — POST /imports/{id}/process
──────────────────────────────────────────────────────────────
  1. Load import record
  2. Get parser from registry using import.source_name
  3. For each import_row:
       a. json.loads(row.raw_json)       ← deserialize stored raw dict
       b. parser.parse_row(raw)          ← re-parse into ParsedRow
       c. classify(parsed_row)           ← SimpleClassifier + optional LLM
       d. On success → create Transaction, mark row "success"
       e. On failure → mark row "failed", store error message
  4. Update import.parsed_rows, failed_rows, status
  5. Return updated ImportRead
```

The raw JSON in `import_rows` is the source of truth. Transactions can be regenerated if a parser is updated.

### Classification Cascade

Applied to every transaction during import processing:

```
1. parser.infer_transaction_type()   ← hard rules in the parser itself
      (e.g., Wealthsimple dividend rows → "income")
      │
      ▼
2. SimpleClassifier                  ← keyword rules, always runs, free
      confidence = 0.8 on match
      │
      ▼  (only if confidence still low)
3. LLMClassifier                     ← OpenAI GPT-4o-mini, optional
      CLASSIFICATION_ENABLED=true required
      Uses full category tree in prompt
      confidence from model response
```

Results stored as `category_id`, `subcategory_id`, `classification_confidence` on the transaction.

### Manual Transaction

```
POST /transactions (body: TransactionCreate)
    │
    ▼
transaction_service.create_transaction(db, data)
    │
    ▼
Transaction(source_type="manual") inserted into DB
```

### Transaction PATCH (partial update)

```
PATCH /transactions/{id} (body: TransactionUpdate — all fields optional)
    │
    ▼
transaction_service.update_transaction(db, id, data)
    │
    ├── data.model_dump(exclude_unset=True)
    │   ← only fields explicitly sent are updated
    ├── setattr(transaction, field, value) for each
    └── updated_at = now()
```

### Frontend Data Flow

```
TransactionsPage (owns all state)
    │
    ├── filters state (search, category, source_type, sort, page, date range)
    │       └── triggers listTransactions(filters) on every change
    │
    ├── useCategories hook (fetches once on mount, passed as props)
    │
    ├── TransactionFiltersBar ── onChange → update filters state
    ├── TransactionTable      ── onRowClick → open EditTransactionModal
    │                            onSort → update sort in filters state
    ├── Pagination            ── onChange → update page in filters state
    ├── AddTransactionModal   ── onSuccess → refetch transactions
    └── EditTransactionModal  ── onSuccess → refetch transactions
```

---

## Parser System

### Registry

```
parsers/__init__.py  (imported at startup via main.py)
    │
    ├── registry.register("bofa", BofAParser)
    ├── registry.register("bmo", BMOParser)
    ├── registry.register("chase", ChaseParser)
    ├── registry.register("wealthsimple", WealthsimpleParser)
    └── registry.register("walmart_rewards", WalmartRewardsParser)

At request time:
    parser = registry.get("chase")       ← returns ChaseParser()
    sources = registry.list_sources()    ← ["bofa", "bmo", "chase", ...]
```

`GET /sources` returns `registry.list_sources()` — the frontend dropdown is always in sync, no hardcoding needed.

### BaseParser Contract

```python
class BaseParser(ABC):
    def get_column_mapping(self) -> dict[str, str]:
        """Maps internal field names to CSV column headers."""

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        """Parses one raw CSV row dict into a ParsedRow."""

    def parse_csv(self, content: bytes) -> list[tuple[int, dict, ParsedRow | Exception]]:
        """Reads the full file. Override if CSV has non-standard headers."""

    def infer_transaction_type(self, row: ParsedRow) -> str | None:
        """Optional: hard-code 'expense'/'income'/'transfer' from parsed data."""
```

### Adding a New Institution

1. Create `backend/app/parsers/wells_fargo_parser.py`:

```python
from app.parsers.base import BaseParser, ParsedRow
from datetime import datetime
from decimal import Decimal
from typing import Any

class WellsFargoParser(BaseParser):
    def get_column_mapping(self) -> dict[str, str]:
        return {
            "transaction_date": "Date",
            "amount": "Amount",
            "description": "Description",
        }

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        return ParsedRow(
            transaction_date=datetime.strptime(raw["Date"].strip(), "%m/%d/%Y").date(),
            amount=Decimal(str(raw["Amount"]).strip().replace(",", "")),
            merchant_raw=raw.get("Description", "").strip() or None,
        )
```

2. Register in `backend/app/parsers/__init__.py`:

```python
from app.parsers.wells_fargo_parser import WellsFargoParser
registry.register("wells_fargo", WellsFargoParser)
```

The new source appears in the Import dropdown automatically.

> **CSV with leading header lines** (like BofA): override `parse_csv()` to skip non-data lines before the column header row. See `bofa_parser.py`.

---

## Running Tests

```bash
cd backend
uv run pytest -v                                         # all tests (~46)
uv run pytest tests/test_parsers.py -v                   # parser tests
uv run pytest tests/test_import_flow.py -v               # import pipeline
uv run pytest tests/test_transaction_service.py -v       # CRUD tests
uv run pytest tests/test_bmo_parser.py -v                # BMO parser
uv run pytest tests/test_walmart_rewards_parser.py -v    # Walmart parser
```

### Test Setup

Tests use an in-memory SQLite database with `StaticPool` (all sessions share one connection). The `setup_db` fixture in `conftest.py`:

1. Creates all tables against the in-memory DB
2. Patches `SessionLocal` to point at the test DB
3. Tears everything down after each test

This means tests are fast and isolated — no file system, no external services.

---

## Environment Variables

`backend/.env` (copy from `backend/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./finance.db` | SQLAlchemy connection string |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins (JSON list) |
| `OPENAI_API_KEY` | *(empty)* | Required for LLM classifier |
| `CLASSIFICATION_ENABLED` | `true` | Set `false` to skip all classification |
| `CLASSIFICATION_MODEL` | `gpt-4o-mini` | OpenAI model for LLM classifier |

---

## Extension Points

| Feature | Where to add |
|---------|-------------|
| New bank parser | `parsers/<bank>_parser.py` + register in `parsers/__init__.py` |
| New classifier | Extend `BaseClassifier`, wire into classification chain in `import_service.py` |
| Deduplication | `transaction_service.create_transaction()` — check `external_id` before insert |
| Plaid ingestion | New service + `source_type="plaid"`, same `transactions` table |
| Budget rules | New `budgets` table + service, query against monthly transaction aggregates |
| Real authentication | Replace `auth_provider="local"` with JWT/OAuth; `users` table already supports it |
