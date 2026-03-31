# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal finance tracking app — MVP stage. Allows CSV import from multiple banks, manual transaction entry, and a transaction listing UI with search/filter/sort.

## Planned Stack

- **Backend:** Python + FastAPI, SQLite, SQLAlchemy (ORM), Alembic (migrations), Pydantic (validation), `uv` (package management)
- **Frontend:** React + TypeScript, Vite
- **API style:** REST with CORS for local dev

## Commands

```bash
# Backend
cd backend
uv sync --extra dev            # install all dependencies (including dev/test)
uv run alembic upgrade head    # run migrations (creates finance.db)
uv run python sample_data/seed_transactions.py  # optional: load demo data
uv run uvicorn app.main:app --reload  # start dev server at localhost:8000

# Backend tests
uv run pytest                  # all tests
uv run pytest tests/test_parsers.py  # single file

# Frontend
cd frontend
npm install
npm run dev    # start dev server at localhost:5173
npm run build
npm run lint
```

## Architecture

### Project Layout

```
/backend
  /api/routes    # FastAPI route handlers (thin — delegate to services)
  /models        # SQLAlchemy ORM models
  /schemas       # Pydantic request/response schemas (separate from ORM models)
  /services      # Business logic layer
  /parsers       # CSV parser modules, one per institution
  /db            # DB session/connection setup
  /tests
/frontend
  /src
/docs
```

### Backend Design Patterns

**Service layer:** Route handlers are thin and delegate to service functions. Business logic lives in `services/`, not in route handlers.

**Parser registry:** Each bank/institution has its own parser module in `parsers/`. Parsers register against a common registry and produce a normalized output model. To add a new institution: create a new parser module and register it — no changes needed elsewhere.

**Dual storage on import:** Both raw rows (`import_rows` table with `raw_json`) and normalized transactions are stored. Never discard raw import data.

**Soft deletes:** `DELETE /transactions/{id}` sets `is_deleted=True`. Hard deletes are not used.

**Schemas ≠ ORM models:** Pydantic schemas in `schemas/` are separate from SQLAlchemy models in `models/`. Don't conflate them.

### Data Model

Three main tables:
- `imports` — tracks uploaded CSV files and their processing status
- `import_rows` — raw row data as JSON, with parse status per row
- `transactions` — unified table for both CSV-imported and manually created transactions; differentiated by `source_type` (`csv` | `manual`)

Key `transactions` fields: `import_id` (nullable FK), `source_type`, `merchant_raw`, `merchant_normalized`, `category`, `subcategory`, `is_deleted`.

### Extension Points (Do Not Implement in MVP)

Leave clean hooks for future additions:
- **Plaid ingestion:** new `source_type` value + service module, same transactions table
- **LLM categorization:** plug into the service layer after parsing, before saving
- **Deduplication:** check `external_id` in the import service

### Categories

Default categories and subcategories are defined in [docs/default_category.md](docs/default_category.md). Seed these into the DB; don't hardcode them in frontend dropdowns.

## MVP Scope

**In scope:** CSV import, manual add/edit, transaction listing with search/filter/sort, category system, local SQLite.

**Out of scope for MVP:** auth, cloud deployment, LLM categorization, Plaid, browser extension, microservices.