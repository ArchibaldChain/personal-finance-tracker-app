Plan: Build Personal Finance Tracking App MVP
Context
Building the full MVP from scratch based on docs/init-prompt.md. No implementation code exists yet — only documentation. The goal is a local-only personal finance tracker with CSV import from multiple banks, manual transaction entry, and a transaction listing UI with search/filter/sort.

Stack
Backend: Python + FastAPI, SQLite, SQLAlchemy, Alembic, Pydantic, uv
Frontend: React + TypeScript, Vite
API style: REST, CORS-enabled for local dev
Project Layout
/backend
  /app
    /api/routes/       # thin route handlers (imports.py, transactions.py, categories.py, sources.py)
    /models/           # SQLAlchemy ORM models
    /schemas/          # Pydantic request/response schemas
    /services/         # business logic (import_service.py, transaction_service.py, category_service.py)
    /parsers/          # registry.py, base.py, chase_parser.py, bofa_parser.py
    /db/               # base.py (DeclarativeBase), session.py (get_db)
    /constants/        # categories.py (seed data)
    main.py
    config.py
  /alembic/versions/
  /tests/              # conftest.py, test_parsers.py, test_transaction_service.py, test_import_flow.py
  /sample_data/        # chase_sample.csv, bofa_sample.csv, seed_transactions.py
  pyproject.toml
  alembic.ini
  .env.example
/frontend
  /src
    /api/              # client.ts, imports.ts, transactions.ts, categories.ts
    /components/       # all reusable components
    /pages/            # TransactionsPage.tsx, ImportPage.tsx
    /types/            # index.ts
    App.tsx, main.tsx
  package.json
  vite.config.ts
  tsconfig.json
  index.html
README.md
.gitignore
Data Model
imports — tracks uploaded CSV files: id, source_name, file_name, uploaded_at, status, total_rows, parsed_rows, failed_rows

import_rows — raw row data: id, import_id (FK), row_index, raw_json, parse_status, parse_error

transactions — unified table: id, import_id (nullable FK), source_type (csv/manual), source_name, external_id, transaction_date, posted_date, amount, currency, merchant_raw, merchant_normalized, description, category, subcategory, notes, is_deleted, created_at, updated_at

categories + subcategories — seeded from docs/default_category.md at startup

Key Architecture Decisions
Parser Registry
parsers/registry.py — ParserRegistry singleton with register(name, class), get(name), list_sources()
parsers/base.py — ParsedRow (Pydantic), BaseParser (ABC) with parse_row() + get_column_mapping(); base parse_csv() does shared CSV decode/iterate/exception-capture logic
parsers/__init__.py registers both parsers as a side-effect of import — ensures registry is populated at startup
Chase format: Transaction Date, Post Date, Description, Category, Type, Amount, Memo — negative = debit
BofA format: Date, Description, Amount, Running Bal. — has leading garbage header lines; BofAParser.parse_csv() overrides to skip until expected header row
Two-Phase Import
POST /imports — uploads CSV, stores raw rows in import_rows, status=pending
POST /imports/{id}/process — runs parser on each raw row, creates transactions, updates status
Raw data always preserved regardless of processing outcome
Service Layer
Route handlers are thin; all business logic in services/
PATCH uses model.model_dump(exclude_unset=True) — only provided fields updated
DELETE is soft-delete (is_deleted=True)
Extension point comments in import_service.process_import() for LLM categorization (between parse → save) and deduplication (on external_id)
GET /sources endpoint
Returns registry.list_sources() — frontend dropdown is fully dynamic, requires no code changes when new parsers are added.

Alembic with uv
alembic/env.py imports Base + all models via app.models.__init__ for autogenerate
Overrides sqlalchemy.url from app.config.get_settings().DATABASE_URL at runtime
Tests use Base.metadata.create_all(engine) against in-memory SQLite — never Alembic
CORS
CORSMiddleware with CORS_ORIGINS from env (allows http://localhost:5173)
Vite proxy in vite.config.ts (/api → http://localhost:8000) also configured
Category Seeding
category_service.seed_categories(db) called at FastAPI startup (idempotent: no-op if categories exist)
Data sourced from app/constants/categories.py — never hardcoded in frontend
Frontend always fetches from GET /categories
Frontend State
Local useState/useEffect — no Redux/Zustand needed for single-user local app
useCategories hook fetches once and caches; passed as props to form modals
Linked category/subcategory selects: changing category resets subcategory + filters options
API Endpoints
Method	Path	Description
POST	/imports	Upload CSV (multipart: file + source_name)
GET	/imports	List all imports
GET	/imports/{id}	Get single import
POST	/imports/{id}/process	Parse rows → create transactions
GET	/transactions	List with pagination/search/filter/sort
GET	/transactions/{id}	Get single transaction
POST	/transactions	Create manual transaction
PATCH	/transactions/{id}	Partial update
DELETE	/transactions/{id}	Soft delete
GET	/categories	Category + subcategory tree
GET	/sources	List registered parser source names
Implementation Order
Backend foundation: pyproject.toml → config.py → db/ → models/ → Alembic migration → constants/categories.py
Parser system: parsers/base.py → registry.py → chase_parser.py → bofa_parser.py → parsers/__init__.py → sample CSVs → parser tests (pass before proceeding)
Schemas + Services + API: all schemas/ → all services/ → all api/routes/ → main.py
Backend tests: test_transaction_service.py + test_import_flow.py → uv run pytest all green
Frontend: types → API client → components (Modal, TransactionForm, modals, table, filters) → pages → routing
Polish: seed script, README, .gitignore
Verification
# Backend tests
cd backend && uv run pytest -v

# Start backend (after uv run alembic upgrade head)
uv run uvicorn app.main:app --reload
# Check http://localhost:8000/docs — all endpoints visible, /categories returns seeded data

# Test import via curl
curl -X POST http://localhost:8000/imports -F "source_name=chase" -F "file=@sample_data/chase_sample.csv"
curl -X POST http://localhost:8000/imports/1/process
curl "http://localhost:8000/transactions?page=1&page_size=10"

# Start frontend
cd frontend && npm run dev
# Visit http://localhost:5173
Frontend smoke test checklist:

 Transactions page loads, empty state shown
 Add Transaction modal: create a transaction, appears in table
 Edit: click row, change merchant, save → table refreshes
 Search, category filter, source_type filter all work
 Import page: upload chase_sample.csv with source=chase → status=processed, row counts correct
 Transactions page: Chase transactions appear with source_type=csv
 Unknown source_name → 400 error shown
 Malformed CSV rows → parse_status=failed recorded, import not fully failed