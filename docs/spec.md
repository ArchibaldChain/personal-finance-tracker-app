# Functional Specification

Feature requirements, API contract, and data models for the personal finance tracking app.

---

## Features

### F1 — Transaction Management

- Create transactions manually via a form (date, amount, merchant, category, notes)
- Edit any field on any transaction via a modal
- Soft-delete transactions (recoverable, never hard-deleted)
- View transactions in a paginated, sortable table
- Filter by: free-text search, category, source type, date range, needs-review flag
- Sort by: date, amount, merchant

### F2 — CSV Import

- Upload a CSV from Chase, Bank of America, BMO, Wealthsimple, or Walmart Rewards
- Preview row count before processing
- Process import: parse rows, create transactions, report parse errors per row
- View import history with status badges (pending / processed / processed_with_errors)
- Re-importable: raw rows are preserved, can be reprocessed if parser is updated

### F3 — Auto-Categorization

- Rule-based classifier applies on import (free, always-on)
- Optional LLM classifier (OpenAI GPT-4o-mini) for higher accuracy
- Each transaction stores `classification_confidence` (0.0–1.0)
- Transactions with no confident classification are flagged `needs_review`
- Manual category override always wins (stored directly on transaction)

### F4 — Category Management

- Hierarchical categories: Category → Subcategory
- Each category has an icon (emoji or Lucide icon name) and sort order
- Scoped to a ledger or global (ledger_id nullable)
- Full CRUD + drag-to-reorder
- Seed data provided with ~30 default categories

### F5 — Multi-User / Ledger

- Multiple local users, each with a default ledger
- Ledgers can have multiple members with roles (owner / member)
- All transactions, imports, and categories are scoped to a ledger
- User picker on login (no password — local use only)

### F6 — Dashboard & Analytics

- Spending by category (bar/pie chart)
- Income vs. expense summary
- Month-over-month comparison
- Date range selector

---

## API Specification

All endpoints are prefixed with `/api` in the frontend (Vite proxy strips the prefix before hitting FastAPI).

Interactive docs: `http://localhost:8000/docs`

---

### Transactions

#### `GET /transactions`

List transactions with filtering, sorting, and pagination.

**Query parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `search` | string | — | ILIKE on merchant_raw, merchant_normalized, description, notes |
| `category` | string | — | Exact match on category name |
| `source_type` | string | — | `csv` or `manual` |
| `needs_review` | bool | — | Filter uncategorized / low-confidence transactions |
| `date_from` | date | — | Inclusive lower bound (`YYYY-MM-DD`) |
| `date_to` | date | — | Inclusive upper bound (`YYYY-MM-DD`) |
| `ledger_id` | int | — | Filter by ledger |
| `sort_by` | string | `transaction_date` | Column to sort by |
| `sort_dir` | string | `desc` | `asc` or `desc` |
| `page` | int | `1` | 1-indexed page number |
| `page_size` | int | `50` | Max 200 |

**Response:** `TransactionListResponse`
```json
{
  "items": [ ...TransactionRead ],
  "total": 142,
  "page": 1,
  "page_size": 50,
  "pages": 3
}
```

#### `GET /transactions/summary`

Aggregate totals for the current filter set (same query params as list).

**Response:**
```json
{ "total_income": 3200.00, "total_expense": -1850.50, "net": 1349.50 }
```

#### `GET /transactions/{id}`

**Response:** `TransactionRead`

#### `POST /transactions`

Create a manual transaction.

**Body:** `TransactionCreate`
```json
{
  "transaction_date": "2026-04-01",
  "amount": -42.50,
  "merchant_raw": "Tim Hortons",
  "category_id": 5,
  "subcategory_id": 12,
  "notes": "Team coffee",
  "ledger_id": 1
}
```

#### `PATCH /transactions/{id}`

Partial update — only fields present in the body are changed.

**Body:** `TransactionUpdate` (all fields optional)

#### `DELETE /transactions/{id}`

Soft delete (sets `is_deleted = true`).

---

### Imports

#### `POST /imports`

Upload a CSV file.

**Form data (multipart):**
- `file` — CSV file
- `source_name` — Parser key (e.g., `"chase"`, `"wealthsimple"`)
- `ledger_id` *(optional)* — Target ledger

**Response:** `ImportRead` with `status = "pending"`, `total_rows = N`

#### `GET /imports`

List all imports, most recent first.

#### `GET /imports/{id}`

Get a single import with row counts.

#### `POST /imports/{id}/process`

Re-parse stored raw rows and create transactions.

**Response:** `ImportRead` with updated `parsed_rows`, `failed_rows`, and final `status`.

#### `DELETE /imports/{id}`

Delete the import record. Does not delete transactions already created from it.

---

### Categories

#### `GET /categories`

Returns all categories with nested subcategories.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Food & Drink",
    "icon": "🍔",
    "transaction_type": "expense",
    "sort_order": 1,
    "subcategories": [
      { "id": 10, "name": "Restaurants", "icon": null }
    ]
  }
]
```

#### `POST /categories`

Create a new category.

#### `PATCH /categories/{id}`

Update category name, icon, or sort_order.

#### `DELETE /categories/{id}`

Delete category (and its subcategories).

#### `POST /categories/{id}/subcategories`

Create a subcategory under a category.

#### `PATCH /categories/subcategories/{id}`

Update a subcategory.

#### `DELETE /categories/subcategories/{id}`

Delete a subcategory.

#### `POST /categories/reorder`

Reorder categories by providing a list of `{ id, sort_order }` pairs.

---

### Sources

#### `GET /sources`

Returns all registered parser keys. Used to populate the import form dropdown.

**Response:** `["bofa", "bmo", "chase", "wealthsimple", "walmart_rewards"]`

#### `GET /sources/used`

Returns only sources that have at least one transaction.

---

### Ledgers & Users

#### `GET /ledgers/default`

Returns the default ledger for the current user.

#### `GET /ledgers/users`

List all local users.

#### `POST /ledgers/users`

Create a new user. Automatically creates a default ledger and adds the user as owner.

**Body:**
```json
{
  "display_name": "Archibald",
  "email": "archibald@example.com",
  "avatar_url": null
}
```

#### `PATCH /ledgers/users/{id}`

Update user profile fields.

#### `DELETE /ledgers/users/{id}`

Delete user and all their data (ledgers, transactions, imports).

---

### Health

#### `GET /health`

Returns `{ "status": "ok" }`.

---

## Data Models

### Transaction

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | PK |
| `import_id` | int? | FK → imports, null for manual |
| `ledger_id` | int? | FK → ledgers |
| `created_by_user_id` | int? | FK → users |
| `source_type` | string | `"csv"` or `"manual"` |
| `source_name` | string? | `"chase"`, `"bofa"`, etc. |
| `external_id` | string? | For deduplication |
| `transaction_date` | date | |
| `posted_date` | date? | |
| `amount` | decimal(12,2) | Negative = expense |
| `currency` | string | Default `"USD"` |
| `merchant_raw` | string? | Original from CSV |
| `merchant_normalized` | string? | Cleaned version |
| `description` | text? | |
| `transaction_type` | string? | `"expense"`, `"income"`, `"transfer"` |
| `category_id` | int? | FK → categories |
| `subcategory_id` | int? | FK → subcategories |
| `classification_confidence` | float | 0.0–1.0 |
| `notes` | text? | User notes |
| `is_deleted` | bool | Soft delete flag |
| `created_at` | datetime | |
| `updated_at` | datetime | |

### Import

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | PK |
| `source_name` | string | Parser key |
| `file_name` | string | Original filename |
| `uploaded_at` | datetime | |
| `status` | string | `pending` / `processing` / `processed` / `processed_with_errors` |
| `total_rows` | int? | Set after upload |
| `parsed_rows` | int | Successful parses |
| `failed_rows` | int | Failed parses |
| `ledger_id` | int? | FK → ledgers |

### Category

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | PK |
| `name` | string | Unique per ledger |
| `icon` | string? | Emoji or Lucide icon name |
| `transaction_type` | string? | `"expense"`, `"income"`, `"transfer"` |
| `ledger_id` | int? | Null = global default |
| `sort_order` | int? | Display ordering |
| `subcategories` | list | Nested |

### User

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | PK |
| `auth_provider` | string | Default `"local"` |
| `email` | string | Unique |
| `display_name` | string | |
| `avatar_url` | string? | |
| `is_active` | bool | |

---

## CSV Parser Contract

Each parser implements `BaseParser`:

```python
class BaseParser(ABC):
    def get_column_mapping(self) -> dict[str, str]:
        """Maps internal field names to CSV column headers."""

    def parse_row(self, raw: dict[str, Any]) -> ParsedRow:
        """Parses one raw CSV row dict into a ParsedRow dataclass."""

    def parse_csv(self, content: bytes) -> list[tuple[int, dict, ParsedRow | Exception]]:
        """Reads the full file. Override if CSV has non-standard headers."""

    def infer_transaction_type(self, row: ParsedRow) -> str | None:
        """Optional: return 'expense', 'income', or 'transfer' from parsed data."""
```

`ParsedRow` fields: `transaction_date`, `amount`, `currency`, `merchant_raw`, `merchant_normalized`, `description`, `transaction_type`, `external_id`, `posted_date`.

---

## Classification System

### SimpleClassifier (always on)

Keyword rules mapped to category names. Case-insensitive match on `merchant_raw` + `description`.

Example rules:
- `"starbucks"`, `"tim hortons"` → `Food & Drink / Coffee`
- `"netflix"`, `"spotify"` → `Entertainment / Subscriptions`
- `"payroll"`, `"direct deposit"` → `Income`

Confidence: 0.8 for keyword match, 0.0 for no match.

### LLMClassifier (optional)

Uses `CLASSIFICATION_MODEL` (default `gpt-4o-mini`) to classify transactions against the full category tree. Prompt includes all categories with their `transaction_type` hints. Returns `category_name`, `subcategory_name`, and confidence.

Enable with `CLASSIFICATION_ENABLED=true` in `.env`. Requires `OPENAI_API_KEY`.

---

## Environment Variables

Defined in `backend/.env` (copy from `backend/.env.example`):

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `sqlite:///./finance.db` | SQLAlchemy connection string |
| `CORS_ORIGINS` | `["http://localhost:5173"]` | Allowed frontend origins |
| `OPENAI_API_KEY` | *(empty)* | Required for LLM classification |
| `CLASSIFICATION_ENABLED` | `true` | Enable classification on import |
| `CLASSIFICATION_MODEL` | `gpt-4o-mini` | OpenAI model for LLM classifier |
