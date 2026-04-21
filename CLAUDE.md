# CLAUDE.md

Project context and conventions for Claude Code.

---

## Project

Local personal finance tracker. FastAPI backend + React/TypeScript frontend. SQLite database. Users import bank CSVs or enter transactions manually; transactions are auto-categorized and browsable.

See `docs/design.md` for architecture and `docs/spec.md` for the full API and data model spec.

---

## Commands

Always use `uv run` for Python — never bare `python`, `alembic`, or `pytest`:

```bash
# Backend dev server
cd backend && uv run uvicorn app.main:app --reload

# DB migrations
cd backend && uv run alembic upgrade head
cd backend && uv run alembic revision --autogenerate -m "describe change"

# Tests
cd backend && uv run pytest -v
cd backend && uv run pytest tests/test_parsers.py -v

# Frontend
cd frontend && npm run dev -- --host
cd frontend && npm run build
```

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
2. Review the generated file in `alembic/versions/`
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

---

## Frontend Conventions

- All API calls go through `src/api/client.ts` (Axios, `baseURL = /api`)
- Domain-specific API functions live in `src/api/<domain>.ts`
- TypeScript interfaces in `src/types/index.ts` — keep in sync with backend schemas
- Page components own their own state; no global store
- `AuthContext` holds current user (persisted to `localStorage`)
- `useCategories` and `useSources` hooks fetch once on mount

---

## Database

- SQLite file at `backend/finance.db` (gitignored)
- All migrations in `backend/alembic/versions/` — prefix with next number, e.g. `009_...`
- Soft deletes only — never hard-delete transactions (`is_deleted = true`)
- `amount` is negative for expenses, positive for income
- `category_id` / `subcategory_id` are FK integers, not strings

---

## Testing

Tests use in-memory SQLite with `StaticPool`. The `conftest.py` fixture creates tables and patches `SessionLocal` for each test.

- `tests/test_parsers.py` — unit tests for each parser
- `tests/test_import_flow.py` — end-to-end upload → process → transactions
- `tests/test_transaction_service.py` — CRUD and filter logic

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

---

## What Not to Do

- Don't put business logic in route handlers
- Don't hard-delete transactions — always set `is_deleted = true`
- Don't hardcode institution names in the frontend — read from `GET /sources`
- Don't run bare `python` or `alembic` — always prefix with `uv run`
- Don't skip migrations when adding columns — Alembic is authoritative for schema
