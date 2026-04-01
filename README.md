# Personal Finance Tracker

A local personal finance tracking app. Import CSVs from multiple banks, manually add/edit transactions, and view/search/filter your spending.

## Stack

- **Backend:** Python + FastAPI, SQLite, SQLAlchemy, Alembic, Pydantic, `uv`
- **Frontend:** React + TypeScript + Vite

---

## Setup & Run

### Prerequisites

- Python 3.11+
- [uv](https://docs.astral.sh/uv/getting-started/installation/) (`curl -LsSf https://astral.sh/uv/install.sh | sh`)
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

# Start dev server
uv run uvicorn app.main:app --reload
```

The API will be available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`

### Frontend

```bash
cd frontend

npm install
npm run dev -- --host
```

The app will be available at `http://localhost:5173`.

---

## Running Tests

```bash
cd backend
uv run pytest -v
```

---

## Sample CSV Files

Two sample CSV files are provided in `backend/sample_data/`:

| File | Institution | Format |
|------|-------------|--------|
| `chase_sample.csv` | Chase Bank | `Transaction Date, Post Date, Description, Category, Type, Amount, Memo` |
| `bofa_sample.csv` | Bank of America | `Date, Description, Amount, Running Bal.` (with leading header lines) |

To try an import:
1. Go to the **Import** page in the UI
2. Select the institution from the dropdown
3. Upload the corresponding sample CSV

---

## How to Add a New Bank Parser

1. **Create a parser module** in `backend/app/parsers/`, e.g. `wells_fargo_parser.py`:

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

2. **Register it** in `backend/app/parsers/__init__.py`:

```python
from app.parsers.wells_fargo_parser import WellsFargoParser
registry.register("wells_fargo", WellsFargoParser)
```

3. The new source will automatically appear in the Import page dropdown (via `GET /sources`).

> **BofA-style headers:** If the CSV has leading non-data header lines, override `parse_csv()` as shown in `bofa_parser.py`.

---

## Extension Points

The codebase has comments marking where future features can be added:

- **LLM categorization** — `import_service.process_import()`, between parse and transaction save
- **Deduplication** — `transaction_service.create_transaction()`, check `external_id` before insert
- **Plaid ingestion** — new `source_type="plaid"`, same `transactions` table, new service module
