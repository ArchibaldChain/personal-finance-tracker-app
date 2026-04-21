# Personal Finance Tracker

A local personal finance app. Import CSVs from multiple banks, manually add/edit transactions, auto-categorize with rules or LLM, and view/search/filter your spending.

## Stack

| Layer | Tech |
|-------|------|
| Backend | Python + FastAPI, SQLite, SQLAlchemy, Alembic, Pydantic |
| Frontend | React + TypeScript + Vite, Recharts |
| Package managers | `uv` (Python), npm (Node) |
| Optional | OpenAI GPT-4o-mini for transaction classification |

---

## Setup & Run

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) — `curl -LsSf https://astral.sh/uv/install.sh | sh`
- Node.js 18+

### Backend

```bash
cd backend

# Install dependencies
uv sync --extra dev

# Copy env file (optional — defaults work for local dev)
cp .env.example .env

# Run database migrations
uv run alembic upgrade head

# (Optional) Seed sample transactions
uv run python sample_data/seed_transactions.py

# Start dev server with hot reload
uv run uvicorn app.main:app --reload
```

API: `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend
npm install
npm run dev -- --host
```

App: `http://localhost:5173`

---

## Running Tests

```bash
cd backend
uv run pytest -v                                          # all tests
uv run pytest tests/test_parsers.py -v                    # parser tests
uv run pytest tests/test_import_flow.py -v                # import pipeline
uv run pytest tests/test_transaction_service.py -v        # CRUD tests
```

---

## Supported CSV Formats

| Key | Institution | Notes |
|-----|-------------|-------|
| `chase` | Chase Bank | Standard export |
| `bofa` | Bank of America | Skips non-data header lines |
| `bmo` | BMO | Chequing + cash accounts |
| `wealthsimple` | Wealthsimple | Investment + cash accounts |
| `walmart_rewards` | Walmart Rewards Mastercard | |

Sample files are in `backend/sample_data/`.

---

## Adding a New Bank Parser

1. Create `backend/app/parsers/my_bank_parser.py`:

```python
from app.parsers.base import BaseParser, ParsedRow
from datetime import datetime
from decimal import Decimal
from typing import Any

class MyBankParser(BaseParser):
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

2. Register it in `backend/app/parsers/__init__.py`:

```python
from app.parsers.my_bank_parser import MyBankParser
registry.register("my_bank", MyBankParser)
```

The new source will appear in the Import dropdown automatically (via `GET /sources`).

> If the CSV has non-data header lines (like BofA), override `parse_csv()` to skip them. See `bofa_parser.py`.

---

## LLM Auto-Categorization

Set in `backend/.env`:

```
OPENAI_API_KEY=sk-...
CLASSIFICATION_ENABLED=true
CLASSIFICATION_MODEL=gpt-4o-mini
```

When enabled, imported transactions are classified against your category tree using GPT-4o-mini. A rule-based classifier also runs for free (always on). Results include a confidence score; low-confidence transactions are flagged for review.

---

## Documentation

| File | Contents |
|------|----------|
| `docs/design.md` | Architecture, patterns, design decisions |
| `docs/spec.md` | Feature spec, full API reference, data models |
| `docs/development-manual.md` | Deep-dive data flows, parser system, test setup |
| `docs/default_category.md` | Default category taxonomy |
