# Design Document

Architecture, design decisions, and patterns for the personal finance tracking app.

---

## System Overview

A local-first personal finance tracker. Users import bank CSVs or manually enter transactions, which are auto-categorized and viewable through a filterable transaction ledger and dashboard.

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

The Vite dev server proxies `/api/*` to the FastAPI backend, eliminating CORS during development. There is no authentication layer — the app uses a local user picker stored in `localStorage`, suitable for single-machine personal use.

---

## Backend Architecture

### Layer Separation

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

**Invariant:** Route handlers never contain business logic. Services never import FastAPI. This keeps both layers independently testable.

### Key Design Patterns

#### Registry Pattern — CSV Parsers

Built-in parsers register themselves at startup under a string key. The frontend never hardcodes institution names — it fetches `GET /sources`, which merges the live registry with user-saved custom parsers from the DB.

```
parsers/__init__.py  (imported at startup)
    ├── registry.register("chase", ChaseParser)
    ├── registry.register("bofa", BofAParser)
    ├── registry.register("bmo", BMOParser)
    ├── registry.register("wealthsimple", WealthsimpleParser)
    └── registry.register("walmart_rewards", WalmartRewardsParser)
```

Custom parsers are **not** registered. Instead, `source_name = "custom_<id>"` is resolved at runtime via `_get_parser()`, which looks up the `CustomParserConfig` row and instantiates `DynamicParser(config)`. This keeps startup free of DB reads.

```python
def _get_parser(db, source_name) -> BaseParser:
    if source_name.startswith("custom_"):
        config = db.query(CustomParserConfig).filter_by(id=...).first()
        return DynamicParser(config)
    return registry.get(source_name)
```

Adding a new built-in institution: (1) create a parser class, (2) register it. No UI changes needed. Adding a custom parser: use the `/import/custom` wizard in the UI.

#### Two-Phase Import — Upload then Process

CSV import is intentionally split to preserve raw data even when parsing fails.

```
Phase 1 — POST /imports
  → Validate source (_get_parser resolves built-in or custom)
  → Create import record (status=pending)
  → Parse CSV into raw rows; on parse failure → status=failed, return 400
  → Store ALL raw rows as JSON in import_rows
  → Return immediately with row count

Phase 2 — POST /imports/{id}/process
  → Re-parse each stored raw row through the parser
  → On success: create Transaction
  → On failure: mark row failed, store error message
  → Update import status to processed / processed_with_errors
  → On unexpected exception → status=failed
```

The raw JSON in `import_rows` is the source of truth. Transactions can be regenerated from it. This also allows future re-processing with an updated parser.

The frontend awaits `processImport` (not fire-and-forget). On a non-2xx response the import record remains in history with `status=failed` for visibility; no cleanup needed.

#### Classification Cascade

When a transaction is created from CSV import, categorization attempts in order:

```
1. Parser.infer_transaction_type()   ← Hard rules from parser (e.g., Wealthsimple dividends)
2. SimpleClassifier                  ← Rule-based keyword matching (free, always runs)
3. LLMClassifier                     ← OpenAI GPT-4o-mini (optional, CLASSIFICATION_ENABLED=true)
```

Each classifier extends `BaseClassifier` and returns a `ClassificationResult` with a `confidence` score (0.0–1.0). Results are cached to avoid repeat API calls.

#### Duplicate Detection

`is_duplicate_transaction()` in `transaction_service.py` runs at import time for each incoming row and returns the ID of the matched original (or `None`).

```
Tier 1 — exact: external_id non-null AND matches an existing non-deleted transaction in the ledger
Tier 2 — fuzzy: same amount + transaction_date + source_name + description/merchant_raw
```

When `is_duplicate=true` is passed to `list_transactions`, the query expands to include both the flagged duplicates and the originals they point to (via `duplicate_of_id`), so the user can review each pair side by side. Transactions without `duplicate_of_id` (imported before this feature) still appear under the filter via `is_duplicate == true` but without their pair.

#### Soft Deletes

Transactions are never hard-deleted. `DELETE /transactions/{id}` sets `is_deleted = true`. All queries filter on `is_deleted = false` by default.

---

## Database Schema

### Entity Relationship

```
users (1) ──── (many) ledger_members (many) ──── (1) ledgers
                                                      │
                                          ┌───────────┴──────────┐
                                          │                      │
                                    transactions              imports
                                          │                      │
                              ┌───────────┴──┐           import_rows
                              │              │
                         categories    subcategories
```

### Table Summaries

**users** — Local user accounts. `auth_provider = "local"` for all current users.

**ledgers** — A named bucket for transactions. Each user gets a default ledger. `base_currency` defaults to `"CAD"`.

**ledger_members** — Join table for user↔ledger with a `role` (owner / member).

**transactions** — Core table. `amount` is negative for expenses, positive for income. `source_type` is `"csv"` or `"manual"`. `category_id` and `subcategory_id` are nullable FK references (not strings). `is_duplicate` is set at import time; `duplicate_of_id` points to the matched original.

**imports** — One record per uploaded CSV file. Tracks parse progress via `parsed_rows` / `failed_rows` counters.

**import_rows** — One record per CSV row. `raw_json` is always stored; `parsed_json` is set after processing.

**categories / subcategories** — Hierarchical. Categories are scoped to a ledger via `ledger_id` (nullable for global defaults). Ordered via `sort_order`.

**classification_logs** — Audit trail of every classification attempt (classifier used, confidence, result).

### Key Indexes

```
ix_transactions_transaction_date
ix_transactions_category_id
ix_transactions_source_type
ix_transactions_is_deleted
ix_transactions_external_id   ← used for Tier 1 (exact) duplicate detection
```

---

## Frontend Architecture

### State Ownership

Each page owns its own state. There is no global state manager (no Redux, no Zustand). Shared data:

- `AuthContext` — current user (persisted to `localStorage`)
- `AppContext` — app-level state

`useCategories` and `useSources` are hooks that fetch once on mount and pass results as props. This avoids unnecessary re-fetches since categories rarely change.

### Component Structure

```
Layout (nav)
    │
    ├── DashboardPage     — spending summaries, charts, collapsible day-grouped detail tables
    ├── TransactionsPage  — owns filters/sort/page state
    │       ├── TransactionFiltersBar  (⚠ and dup buttons visible only when matching rows exist)
    │       ├── TransactionTable       (inline IconSelect category editor, filtered by tx type)
    │       ├── Pagination
    │       ├── AddTransactionModal
    │       └── EditTransactionModal   (native <select> for category, filtered by tx type)
    ├── ImportPage
    │       ├── ImportForm (source dropdown with inline delete for custom parsers)
    │       └── ImportHistoryTable (polls every 3s while any import is in-flight)
    ├── CustomImportPage (3-step wizard: upload → configure → preview)
    │       ├── CustomImportUploadStep
    │       ├── CustomImportConfigStep (CSV preview table with per-column field selectors)
    │       └── CustomImportPreviewStep
    ├── CategoriesPage    — category CRUD with icon picker
    ├── ProfilePage       — user profile
    └── LoginPage         — user picker
```

### IconSelect — Portal Dropdown

`IconSelect` is a custom dropdown used for inline category editing in the transaction table and dashboard. When used inside an `overflow: hidden` table, it renders the dropdown via `createPortal` into `document.body` (`portal` prop).

Key behaviours in portal mode:
- Position is computed from `getBoundingClientRect()` on open
- A `scroll` event listener (capture phase) recomputes position on every scroll, so the dropdown tracks its anchor row
- If there is insufficient space below the anchor, the dropdown flips upward; `maxHeight` is clamped to the available viewport space in either direction

### API Client

All backend calls go through `src/api/client.ts` (an Axios instance with `baseURL = /api`). Each domain has its own module (`transactions.ts`, `imports.ts`, `categories.ts`, `customParsers.ts`, `ledgers.ts`) that wraps typed Axios calls.

A response error interceptor extracts the FastAPI `detail` field from error responses and sets it as `err.message` (truncated to 80 chars), so all error handlers automatically surface readable backend messages rather than generic HTTP status strings.

---

## Extension Points

| Feature | Where |
|---------|-------|
| New built-in bank parser | Create `parsers/<bank>_parser.py`, register in `parsers/__init__.py` |
| New custom parser (UI) | Use `/import/custom` wizard; saved as `CustomParserConfig` in DB |
| New classifier | Extend `BaseClassifier`, wire into `classification/` chain |
| Plaid / open banking | New `source_type="plaid"` service, same `transactions` table |
| Budget rules | New `budgets` table + service; query against `transactions` monthly aggregates |
| Real auth | Replace `auth_provider="local"` with JWT/OAuth, existing `users` table supports it |

---

## Technology Choices

| Decision | Choice | Rationale |
|----------|--------|-----------|
| DB | SQLite | Local-first, zero setup, sufficient for personal use |
| ORM | SQLAlchemy 2.0 | Python standard, type-safe, Alembic integration |
| Migrations | Alembic | Same ecosystem, version-controlled schema |
| Package manager | uv | Fast, reproducible, replaces pip + virtualenv |
| API framework | FastAPI | Pydantic-native, async-ready, auto-docs |
| Frontend build | Vite | Fast HMR, TypeScript first-class |
| Charts | Recharts | React-native, declarative, small bundle |
| LLM | GPT-4o-mini | Low cost, sufficient accuracy for category classification |
