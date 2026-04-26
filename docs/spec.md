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
- Define custom CSV parsers via a wizard (column mapping, date format, currency, account type)
- Custom parsers are saved by name and reused across imports; matched automatically by column signature
- Preview row count before processing
- Process import: parse rows, create transactions, report parse errors per row
- View import history with status badges (pending / processing / processed / processed_with_errors / failed)
- Click failed count in history to expand inline row-level error details
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

Upload a CSV file. Parses the CSV immediately and stores raw rows.

**Form data (multipart):**
- `file` — CSV file
- `source_name` — Parser key (e.g., `"chase"`, `"wealthsimple"`, `"custom_7"`)
- `ledger_id` *(optional)* — Target ledger

**Response:** `ImportRead` with `status = "pending"`, `total_rows = N`

**Errors (400):** unknown source key, custom parser config not found, CSV unreadable. On CSV parse failure the import record is saved with `status = "failed"` before returning the error.

#### `GET /imports`

List all imports, most recent first.

**Query parameters:** `ledger_id` *(optional)*

#### `GET /imports/{id}`

Get a single import with row counts.

#### `GET /imports/{id}/failed-rows`

Returns rows that failed parsing during upload or processing.

**Response:** `list[FailedRowRead]`
```json
[
  { "row_index": 3, "raw_data": { "Date": "2026-01-15", ... }, "error": "invalid date format" }
]
```

#### `POST /imports/{id}/process`

Re-parse stored raw rows and create transactions.

**Response:** `ImportRead` with updated `parsed_rows`, `failed_rows`, and final `status`. Sets `status = "failed"` on unexpected error.

#### `DELETE /imports/{id}`

Hard-delete the import record, its raw rows, and all transactions created from it.

---

### Custom Parsers

#### `GET /custom-parsers`

List all saved custom parser configs.

**Query parameters:** `ledger_id` *(optional)*

#### `POST /custom-parsers`

Save a new custom parser config.

**Body:** `CustomParserConfigCreate`
```json
{
  "name": "My Credit Union",
  "skip_rows": 1,
  "column_mapping": { "transaction_date": "Date", "amount": "Amount", "description": "Details" },
  "date_format": "%Y-%m-%d",
  "currency": "CAD",
  "account_type": "debit",
  "csv_headers": ["Date", "Amount", "Details"],
  "ledger_id": 1
}
```

`column_mapping` maps ParsedRow field names → CSV column headers. Multiple description columns are joined with `|` (e.g. `"description": "Narration|Reference"`).

#### `GET /custom-parsers/{id}`

Get a single config.

#### `PUT /custom-parsers/{id}`

Replace a config.

#### `DELETE /custom-parsers/{id}`

Delete a config (204). Existing transactions imported with it are unaffected.

#### `POST /custom-parsers/preview`

Stateless: parse up to 10 rows with a given config — no DB writes.

**Form data (multipart):** `file` (CSV) + `config` (JSON string of config fields)

**Response:** `PreviewResponse`
```json
{ "rows": [ { "transaction_date": "2026-01-15", "amount": "-42.50", ... } ], "total_rows": 87 }
```

#### `POST /custom-parsers/detect`

Match uploaded CSV headers against saved configs by column signature.

**Form data (multipart):** `file` + optional `ledger_id` + optional `skip_rows`

**Response:** `DetectResponse`
```json
{ "match": { ...CustomParserConfigRead } | null, "headers": ["Date", "Amount", ...], "preview_rows": [ {...} ] }

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

Returns all available parser sources (built-in + custom). Used to populate the import form dropdown.

**Query parameters:** `ledger_id` *(optional)* — includes custom parsers for that ledger

**Response:**
```json
{ "sources": [
  { "key": "chase", "display_name": "Chase", "is_custom": false },
  { "key": "custom_3", "display_name": "My Credit Union", "is_custom": true }
] }
```

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
| `source_name` | string | Parser key (`"chase"`, `"custom_7"`, etc.) |
| `file_name` | string | Original filename |
| `uploaded_at` | datetime | |
| `status` | string | `pending` / `processing` / `processed` / `processed_with_errors` / `failed` |
| `total_rows` | int? | Set after upload |
| `parsed_rows` | int | Successful parses |
| `failed_rows` | int | Failed parses |
| `ledger_id` | int? | FK → ledgers |

### CustomParserConfig

| Field | Type | Notes |
|-------|------|-------|
| `id` | int | PK |
| `name` | string | User-chosen display name |
| `ledger_id` | int? | FK → ledgers, nullable |
| `skip_rows` | int | Header rows to skip (default 0) |
| `column_mapping_json` | text | JSON: `{field → csv_column}` |
| `date_format` | string | strptime format (default `"%m/%d/%Y"`) |
| `currency` | string | Default `"CAD"` |
| `account_type` | string | `"debit"`, `"credit"`, or `"investment"` |
| `column_signature` | string? | `"\|".join(sorted(headers))` for auto-match |
| `csv_headers` | text? | JSON array of original header names |
| `created_at` / `updated_at` | datetime | |

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
