# Plan: LLM Confidence, Needs-Review, and Classification Logging

## Context

The LLM classifier was already wired and working. Three improvements were added on top:
1. **Cache key simplification** — the tree hash in the cache key was unnecessary; validate the cached category against the live tree instead
2. **Needs-review workflow** — store `classification_confidence` on transactions so low-confidence classifications can be surfaced in the UI for user review
3. **Classification logging for ML training** — save each LLM prediction to a `classification_logs` table so the user can use these as ground-truth labels to train a future custom classifier (edits to the transaction do not overwrite the LLM's original prediction)

---

## Changes Made

### Backend

| File | Change |
|------|--------|
| `app/services/classification/cache.py` | Cache key is now SHA256 of description only. `get_cached()` validates the cached category still exists in the current tree before returning it. |
| `app/services/classification/llm_classifier.py` | Updated `set_cached()` call to match new 2-arg signature. |
| `app/models/transaction_model.py` | Added `classification_confidence: Float` (nullable). |
| `app/models/classification_log_model.py` | New model — append-only log of every LLM prediction. |
| `app/models/__init__.py` | Import `ClassificationLog` for Alembic autogenerate. |
| `alembic/versions/002_add_classification_tables.py` | Migration: adds `classification_confidence` column + `classification_logs` table. |
| `app/schemas/transaction_schema.py` | Added `classification_confidence: float | None` to `TransactionRead`. |
| `app/services/import_service.py` | Stores `confidence` on `Transaction`, writes a `ClassificationLog` row per classified row. |
| `app/services/transaction_service.py` | Same as above for manual creates. Added `needs_review` filter (`confidence < 0.7`). `LOW_CONFIDENCE_THRESHOLD = 0.7` constant. |
| `app/api/routes/transactions.py` | Added `needs_review: bool = False` query param. |

### Frontend

| File | Change |
|------|--------|
| `src/types/index.ts` | Added `classification_confidence: number | null` to `Transaction`. Added `needs_review?: boolean` to `TransactionFilters`. |
| `src/api/transactions.ts` | Passes `needs_review=true` query param when set. |
| `src/components/TransactionFiltersBar.tsx` | Added "⚠ Needs Review" toggle button (amber when active). |
| `src/components/TransactionTable.tsx` | Category cell shows a yellow ⚠ icon when `classification_confidence < 0.7`, with tooltip showing the percentage. |

---

## Key Design Decisions

### Cache key (description only, not tree)
The tree hash was removed because the in-memory cache is cleared on every restart — stale-category risk is negligible. Instead, on cache hit we check whether the returned category still exists in the current tree. If not, we treat it as a miss and re-classify.

### classification_logs — why a separate table?
When a user edits a transaction's category, the `category` column changes. The `classification_logs` table is append-only and never modified after insert, so it preserves the LLM's original prediction. This is important for ML training ground truth — you want to know what the model said, not just what the user ultimately chose.

### transaction_id in classification_logs
- **Batch imports**: `transaction_id = NULL` — the ID is not available until the batch commit at the end of `process_import()`.
- **Manual creates**: `transaction_id` is set after `db.commit(); db.refresh(transaction)`.

For ML training purposes, the description + created_at timestamp is sufficient to identify the row even without the FK.

### Needs-review threshold
`LOW_CONFIDENCE_THRESHOLD = 0.7` is a constant in `transaction_service.py`. Backend filter: `classification_confidence IS NOT NULL AND classification_confidence < 0.7`. The frontend uses the same hardcoded value for the visual indicator (no API call needed — purely a display rule).

---

## Verification

```bash
# Run migration
cd backend && uv run alembic upgrade head

# Run tests
uv run pytest -v

# Verify classification_logs are written after import
sqlite3 finance.db "SELECT * FROM classification_logs LIMIT 5;"

# Verify confidence is on transactions
sqlite3 finance.db "SELECT id, category, classification_confidence FROM transactions LIMIT 10;"

# Frontend
cd frontend && npm run dev
# - Import a CSV → check that low-confidence categories show ⚠ in the table
# - Click "⚠ Needs Review" toggle → only low-confidence rows shown
# - Click a low-confidence row → edit the category → save → row disappears from needs-review filter
```
