# Development Manual

This document covers the project structure, architecture, and data flows for the personal finance tracking app.

---

## Project Structure

```
personal-finance-tracking-app/
├── README.md                          # Setup & run instructions
├── .gitignore
├── docs/
│   ├── development-manual.md          # This file
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
│   │       └── 001_initial_schema.py  # Creates all 5 tables
│   │
│   ├── app/
│   │   ├── main.py                    # FastAPI app factory, CORS, lifespan seed
│   │   ├── config.py                  # Settings (DATABASE_URL, CORS_ORIGINS)
│   │   │
│   │   ├── db/
│   │   │   ├── base.py                # SQLAlchemy DeclarativeBase
│   │   │   └── session.py             # Engine, SessionLocal, get_db()
│   │   │
│   │   ├── models/                    # SQLAlchemy ORM (what's in the DB)
│   │   │   ├── import_model.py        # imports table
│   │   │   ├── import_row_model.py    # import_rows table (raw CSV data)
│   │   │   ├── transaction_model.py   # transactions table
│   │   │   └── category_model.py      # categories + subcategories tables
│   │   │
│   │   ├── schemas/                   # Pydantic (API request/response shapes)
│   │   │   ├── import_schema.py
│   │   │   ├── transaction_schema.py  # Create, Update, Read, ListResponse
│   │   │   └── category_schema.py
│   │   │
│   │   ├── parsers/                   # CSV parser system
│   │   │   ├── base.py                # ParsedRow dataclass + BaseParser ABC
│   │   │   ├── registry.py            # ParserRegistry singleton
│   │   │   ├── chase_parser.py        # Chase CSV format
│   │   │   ├── bofa_parser.py         # BofA CSV format (skips header lines)
│   │   │   └── __init__.py            # Registers both parsers at import time
│   │   │
│   │   ├── services/                  # Business logic layer
│   │   │   ├── import_service.py      # create_import, store_raw_rows, process_import
│   │   │   ├── transaction_service.py # list, get, create, update, delete
│   │   │   └── category_service.py    # list_categories, seed_categories
│   │   │
│   │   ├── api/routes/                # Thin HTTP handlers (delegate to services)
│   │   │   ├── imports.py             # POST/GET /imports, POST /imports/{id}/process
│   │   │   ├── transactions.py        # GET/POST/PATCH/DELETE /transactions
│   │   │   ├── categories.py          # GET /categories
│   │   │   └── sources.py             # GET /sources (registered parser names)
│   │   │
│   │   └── constants/
│   │       └── categories.py          # Seed data (mirrors default_category.md)
│   │
│   ├── sample_data/
│   │   ├── chase_sample.csv           # 15 fake Chase transactions
│   │   ├── bofa_sample.csv            # 15 fake BofA transactions
│   │   └── seed_transactions.py       # Script to pre-load demo data
│   │
│   └── tests/
│       ├── conftest.py                # In-memory SQLite fixtures, TestClient
│       ├── test_parsers.py            # Chase, BofA, registry tests (18 tests)
│       ├── test_transaction_service.py # CRUD + filter/search tests (17 tests)
│       └── test_import_flow.py        # Full upload→process pipeline (11 tests)
│
└── frontend/                          # React + TypeScript + Vite
    ├── index.html
    ├── vite.config.ts                 # Proxy /api → localhost:8000
    ├── package.json
    │
    └── src/
        ├── main.tsx                   # ReactDOM root, BrowserRouter
        ├── App.tsx                    # Routes: / → /transactions, /import
        ├── index.css                  # Global base styles
        │
        ├── types/index.ts             # TypeScript interfaces (mirrors backend schemas)
        │
        ├── api/                       # Axios API client functions
        │   ├── client.ts              # Axios instance (baseURL = /api)
        │   ├── imports.ts             # uploadImport, processImport, listImports
        │   ├── transactions.ts        # listTransactions, create, update, delete
        │   └── categories.ts          # listCategories, listSources
        │
        ├── hooks/
        │   └── useCategories.ts       # Fetches & caches categories once on mount
        │
        ├── components/
        │   ├── Layout.tsx             # Nav bar + <Outlet />
        │   ├── Modal.tsx              # Reusable overlay modal (Esc to close)
        │   ├── TransactionForm.tsx    # Shared add/edit form (linked cat/subcat)
        │   ├── AddTransactionModal.tsx
        │   ├── EditTransactionModal.tsx # Includes Delete button
        │   ├── TransactionTable.tsx   # Sortable table, negative amounts in red
        │   ├── TransactionFiltersBar.tsx # Search + category + source dropdowns
        │   ├── Pagination.tsx
        │   ├── ImportForm.tsx         # File upload + source select
        │   └── ImportHistoryTable.tsx # Status badges per import
        │
        └── pages/
            ├── TransactionsPage.tsx   # Wires filters + table + pagination + modals
            └── ImportPage.tsx         # ImportForm + ImportHistoryTable
```

---

## Architecture Overview

The app is split into a backend API and a frontend SPA. They communicate over HTTP — the Vite dev server proxies `/api/*` requests to the FastAPI backend, so no CORS issues during development.

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
    │
    └── models/      ← SQLAlchemy ORM queries
    │
    ▼
finance.db           ← SQLite database
```

**Rule:** Route handlers never contain business logic. Services never import FastAPI. This separation keeps both layers independently testable.

---

## Database Schema

Five tables, all created by `alembic/versions/001_initial_schema.py`.

```
┌─────────────────────────────────────────────────────────────────┐
│  categories                      subcategories                  │
│  ──────────                      ─────────────                  │
│  id (PK)                         id (PK)                        │
│  name (unique)          ◄──FK──  category_id                    │
│                                  name                           │
└─────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│  imports                                                                      │
│  ───────                                                                      │
│  id (PK)                                                                      │
│  source_name        ← which parser was used (e.g. "chase", "bofa")           │
│  file_name                                                                    │
│  uploaded_at                                                                  │
│  status             ← pending | processing | processed | processed_with_errors│
│  total_rows                                                                   │
│  parsed_rows                                                                  │
│  failed_rows                                                                  │
└─────────────────────────────┬─────────────────────────────────────────────────┘
                              │ 1
                              │
              ┌───────────────┴──────────────────┐
              │ many                             │ many
              ▼                                 ▼
┌──────────────────────────┐    ┌──────────────────────────────────────────────┐
│  import_rows             │    │  transactions                                │
│  ───────────             │    │  ────────────                                │
│  id (PK)                 │    │  id (PK)                                     │
│  import_id (FK)          │    │  import_id (FK, nullable)                    │
│  row_index               │    │  source_type   ← "csv" or "manual"          │
│  raw_json    ← raw CSV   │    │  source_name                                 │
│  parse_status            │    │  external_id   ← for deduplication          │
│  parse_error             │    │  transaction_date                            │
└──────────────────────────┘    │  posted_date                                 │
                                │  amount        ← negative = expense         │
                                │  currency                                    │
                                │  merchant_raw                                │
                                │  merchant_normalized                         │
                                │  description                                 │
                                │  category                                    │
                                │  subcategory                                 │
                                │  notes                                       │
                                │  is_deleted    ← soft delete flag            │
                                │  created_at                                  │
                                │  updated_at                                  │
                                └──────────────────────────────────────────────┘
```

**Key design decisions:**
- `import_rows` stores the raw CSV row as JSON — original data is never lost, even if parsing fails.
- Both CSV-imported and manual transactions share the same `transactions` table, differentiated by `source_type`.
- Deletes are soft (`is_deleted = true`), never hard.

---

## Key Data Flows

### CSV Import (Two-Phase)

The import is intentionally split into two steps so raw data is always preserved:

```
Step 1 — Upload  (POST /imports)
──────────────────────────────────────────────────────────────
  1. Validate source_name is a registered parser
  2. Create an imports record (status = "pending")
  3. Call parser.parse_csv(file_bytes)
     → returns list of (row_index, raw_dict, ParsedRow|Exception)
  4. Store ALL raw dicts into import_rows (parse_status = "pending")
  5. Return ImportRead (status = "pending", total_rows = N)

Step 2 — Process  (POST /imports/{id}/process)
──────────────────────────────────────────────────────────────
  1. Load import record
  2. Get parser from registry using import.source_name
  3. For each import_row:
       a. json.loads(row.raw_json)  ← deserialize stored raw dict
       b. parser.parse_row(raw)     ← re-parse
       c. On success → create Transaction, mark row "success"
       d. On failure → mark row "failed", store error message
  4. Update import.parsed_rows, failed_rows, status
  5. Return updated ImportRead

  Extension points (comments in import_service.process_import):
  ├── LLM categorization: between parse_row() and Transaction save
  └── Deduplication: check external_id before insert
```

### Manual Transaction

```
POST /transactions (body: TransactionCreate)
    │
    ▼
transaction_service.create_transaction(db, data)
    │
    ▼
Transaction(source_type="manual", ...) inserted into DB
```

### Transaction PATCH (partial update)

```
PATCH /transactions/{id} (body: TransactionUpdate — all fields optional)
    │
    ▼
transaction_service.update_transaction(db, id, data)
    │
    ├── data.model_dump(exclude_unset=True)
    │   ← only fields explicitly sent in the request body are updated
    ├── setattr(transaction, field, value) for each
    └── updated_at = now()
```

### Frontend Data Flow

```
TransactionsPage (owns all state)
    │
    ├── filters state (search, category, source_type, sort, page)
    │       │
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

### How the Registry Works

```
app/parsers/__init__.py  (runs at startup via import in main.py)
    │
    ├── registry.register("chase", ChaseParser)
    └── registry.register("bofa", BofAParser)

At request time:
    parser = registry.get("chase")   ← returns ChaseParser()
    sources = registry.list_sources() ← returns ["bofa", "chase"]
```

`GET /sources` calls `registry.list_sources()` so the frontend dropdown is always in sync with registered parsers — no hardcoding needed.

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
        transaction_date = datetime.strptime(raw["Date"].strip(), "%m/%d/%Y").date()
        amount = Decimal(str(raw["Amount"]).strip().replace(",", ""))
        description = raw.get("Description", "").strip()
        return ParsedRow(
            transaction_date=transaction_date,
            amount=amount,
            description=description,
            merchant_raw=description or None,
        )
```

2. Register it in `backend/app/parsers/__init__.py`:

```python
from app.parsers.wells_fargo_parser import WellsFargoParser
registry.register("wells_fargo", WellsFargoParser)
```

The new source appears in the Import page dropdown automatically.

> **CSV with leading header lines** (like BofA): override `parse_csv()` to skip non-data lines before the column header row. See `bofa_parser.py` for the pattern.

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/imports` | Upload CSV (multipart: `file` + `source_name`) |
| `GET` | `/imports` | List all imports |
| `GET` | `/imports/{id}` | Get single import |
| `POST` | `/imports/{id}/process` | Parse raw rows → create transactions |
| `GET` | `/transactions` | List with pagination, search, filter, sort |
| `GET` | `/transactions/{id}` | Get single transaction |
| `POST` | `/transactions` | Create manual transaction |
| `PATCH` | `/transactions/{id}` | Partial update (only sent fields change) |
| `DELETE` | `/transactions/{id}` | Soft delete (sets `is_deleted = true`) |
| `GET` | `/categories` | Category + subcategory tree |
| `GET` | `/sources` | List registered parser source names |

**`GET /transactions` query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | — | ILIKE match on merchant, description, notes |
| `category` | string | — | Exact match on category name |
| `source_type` | string | — | `csv` or `manual` |
| `sort_by` | string | `transaction_date` | Field to sort by |
| `sort_dir` | string | `desc` | `asc` or `desc` |
| `page` | int | `1` | Page number (1-indexed) |
| `page_size` | int | `50` | Results per page (max 200) |

Full interactive docs available at `http://localhost:8000/docs` when the backend is running.

---

## Running Tests

```bash
cd backend
uv run pytest -v                              # all 46 tests
uv run pytest tests/test_parsers.py -v        # parser tests only
uv run pytest tests/test_import_flow.py -v    # import pipeline tests only
uv run pytest tests/test_transaction_service.py -v  # CRUD tests only
```

Tests use an in-memory SQLite database with `StaticPool` (all sessions share one connection). The `setup_db` fixture in `conftest.py` creates tables, patches `SessionLocal` to point at the test DB, and tears everything down after each test.

---

## Extension Points

These are marked with comments in the source code:

| Feature | Where to add |
|---------|-------------|
| LLM auto-categorization | `import_service.process_import()` — between `parse_row()` and `Transaction` save |
| Deduplication | `transaction_service.create_transaction()` and `import_service.process_import()` — check `external_id` before insert |
| Plaid ingestion | New service module + `source_type = "plaid"`, same `transactions` table |
| Browser extension ingestion | New service module + `source_type = "extension"`, same `transactions` table |
| Custom user categories | Extend `categories`/`subcategories` tables with a `user_id` column |

---

## Environment Variables

Defined in `backend/.env` (copy from `.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./finance.db` | SQLAlchemy connection string |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins (JSON list) |
