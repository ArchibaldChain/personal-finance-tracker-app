# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project

Local personal finance tracker. FastAPI backend + React/TypeScript frontend. SQLite database. Users import bank CSVs or enter transactions manually; transactions are auto-categorized and browsable.

See `docs/design.md` for architecture and `docs/spec.md` for the full API and data model spec.

---

## Commands

Always use `uv run` for Python — never bare `python`, `alembic`, or `pytest`:

```bash
# Initial setup
cd backend && uv sync --extra dev

# Backend dev server
cd backend && uv run uvicorn app.main:app --reload

# DB migrations
cd backend && uv run alembic upgrade head
cd backend && uv run alembic revision --autogenerate -m "describe change"

# Tests
cd backend && uv run pytest -v
cd backend && uv run pytest tests/test_parsers.py -v

# Seed sample data (dev)
cd backend && uv run python sample_data/seed_transactions.py

# Frontend
cd frontend && npm install
cd frontend && npm run dev -- --host
cd frontend && npm run build     # also runs tsc type-check
cd frontend && npm run lint
```

---

## Auth Architecture

All protected routes use the `get_current_user` FastAPI dependency (`app.core.security`), which validates a JWT Bearer token and returns the `User` ORM object. Use `check_ledger_access(ledger_id, user_id, db)` to verify ledger ownership before operating on ledger-scoped data.

Auth flow: `POST /auth/google` exchanges a Google OAuth `access_token` for a signed JWT. `POST /auth/local` (only when `ALLOW_LOCAL_AUTH=true`) does the same by `user_id` — useful in dev to skip Google sign-in.

New users get a default ledger created automatically on first sign-in (`create_default_ledger_for_user`).

---

## Backend Conventions

### Layer rules
- `api/routes/` — thin handlers only: validate input, call service, return response. No business logic.
- `services/` — all business logic. Never import FastAPI here.
- `models/` — SQLAlchemy ORM only. No business logic.
- `schemas/` — Pydantic request/response shapes. Mirror model fields but not 1:1.

### Adding an endpoint
1. Add route handler in `api/routes/<domain>.py`
2. Add business logic in `services/<domain>_service.py`
3. Add/update Pydantic schemas in `schemas/<domain>_schema.py`
4. Register router in `app/main.py` if it's a new file

### Adding a DB column
1. Create an Alembic migration: `uv run alembic revision --autogenerate -m "add X to Y"`
2. Review the generated file in `alembic/versions/` (autogenerate uses a hash prefix, e.g. `abc123_add_x_to_y.py`)
3. Apply: `uv run alembic upgrade head`
4. Update the SQLAlchemy model in `models/`
5. Update relevant Pydantic schemas

### Adding a CSV parser
1. Create `app/parsers/<bank>_parser.py` extending `BaseParser`
2. Implement `get_column_mapping()` and `parse_row()`
3. Override `parse_csv()` if the CSV has non-data header rows (see `bofa_parser.py`)
4. Optionally implement `infer_transaction_type()` for hard classification rules
5. Register in `app/parsers/__init__.py`: `registry.register("key", MyParser)`

No frontend changes needed — the import dropdown reads `GET /sources` dynamically.

### Classification pipeline
Two classifiers run on every import:
- `SimpleClassifier` — rule-based, always runs, free
- `LLMClassifier` — OpenAI GPT, runs when `CLASSIFICATION_ENABLED=true` and `OPENAI_API_KEY` is set

Both implement `BaseClassifier.classify()`. The import service passes a `category_tree` dict and optional `forced_type` to limit the classification scope. Results are stored in `ClassificationLog` with a confidence score.

Custom parsers (`source_name = "custom_<config_id>"`) are loaded from `CustomParserConfig` DB records and handled by `DynamicParser`. The `description` mapping supports pipe-joined columns (`"Col1|Col2"`). Credit account amounts are sign-flipped automatically.

---

## Frontend Conventions

- All API calls go through `src/api/client.ts` (Axios, `baseURL = /api`)
- Domain-specific API functions live in `src/api/<domain>.ts`
- TypeScript interfaces in `src/types/index.ts` — keep in sync with backend schemas
- Page components own their own state; no global store
- `AuthContext` holds the JWT token and `activeUserId` (persisted to `localStorage`)
- `AppContext` resolves and provides `ledgerId`, `user` profile, and `allUsers` — wrap pages that need these; all protected routes are already under `AppProvider`
- `useCategories` and `useSources` hooks fetch once on mount

---

## Database

- SQLite file at `backend/finance.db` (gitignored)
- All migrations in `backend/alembic/versions/`
- Soft deletes only — never hard-delete transactions (`is_deleted = true`)
- `amount` is negative for expenses, positive for income
- `category_id` / `subcategory_id` are FK integers, not strings
- Every transaction belongs to a `Ledger` (via `ledger_id`). Each user owns one default ledger.

---

## Testing

Tests use in-memory SQLite with `StaticPool`. The `conftest.py` fixture creates tables and patches `SessionLocal` for each test.

- `tests/test_parsers.py` — unit tests for Chase and BofA parsers
- `tests/test_bmo_parser.py`, `tests/test_walmart_rewards_parser.py` — parser-specific tests
- `tests/test_dynamic_parser.py` — custom/dynamic parser tests
- `tests/test_import_flow.py` — end-to-end upload → process → transactions
- `tests/test_transaction_service.py` — CRUD and filter logic
- `tests/test_llm_classifier.py` — LLM classifier tests (mocked)

Add tests for any new parser or service function.

---

## Environment Variables

All in `backend/.env` (copy from `backend/.env.example`):

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `sqlite:///./finance.db` | |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | JSON list |
| `OPENAI_API_KEY` | *(empty)* | Optional, for LLM classifier |
| `CLASSIFICATION_ENABLED` | `true` | Set `false` to skip classification |
| `CLASSIFICATION_MODEL` | `gpt-4o-mini` | OpenAI model name |
| `GOOGLE_CLIENT_ID` | *(empty)* | OAuth 2.0 Client ID for Google Sign-In |
| `JWT_SECRET_KEY` | *(empty)* | Generate: `python3 -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_EXPIRE_DAYS` | `30` | |
| `ALLOW_LOCAL_AUTH` | `false` | Set `true` in dev to bypass Google OAuth |

---

## What Not to Do

- Don't put business logic in route handlers
- Don't hard-delete transactions — always set `is_deleted = true`
- Don't hardcode institution names in the frontend — read from `GET /sources`
- Don't run bare `python` or `alembic` — always prefix with `uv run`
- Don't skip migrations when adding columns — Alembic is authoritative for schema
