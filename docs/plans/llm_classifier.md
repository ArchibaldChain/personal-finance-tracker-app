# Plan: LLM Transaction Classifier

## Context

The app currently imports transactions with `category=None`. Users must manually categorize every transaction. The goal is to automatically predict `category` and `subcategory` using OpenAI's gpt-4o-mini at import time and on manual transaction creation. The design is extensible — a `BaseClassifier` ABC allows future swap to a different LLM or a local ML model.

---

## New Files

```
backend/app/services/classification/
  __init__.py          # get_classifier() factory
  base.py              # BaseClassifier ABC
  llm_classifier.py    # OpenAI implementation
  cache.py             # in-memory cache keyed by (description, tree_hash)
  category_tree.py     # build_category_tree(categories) utility
backend/tests/test_llm_classifier.py
```

---

## File-by-File Plan

### 1. `pyproject.toml`
Add to `dependencies`:
```toml
"openai>=1.30.0",
```
Run `uv sync` after.

### 2. `app/config.py`
Add two fields to `Settings`:
```python
OPENAI_API_KEY: str = ""
CLASSIFICATION_ENABLED: bool = True
```
`OPENAI_API_KEY=""` means classifier is silently skipped when key is absent — no crash.

### 3. `classification/base.py`
```python
from abc import ABC, abstractmethod

class BaseClassifier(ABC):
    @abstractmethod
    def classify(self, description: str, category_tree: dict[str, list[str]]) -> dict:
        # returns: {"category": str|None, "subcategory": str|None, "confidence": float}
        ...
```

### 4. `classification/cache.py`
Module-level `_cache: dict[str, dict]`. Key = `sha256(normalized_description + json(tree, sort_keys=True))[:16]`. Provides `get_cached()`, `set_cached()`, `clear_cache()` (for tests).

### 5. `classification/category_tree.py`
```python
def build_category_tree(categories: list[Category]) -> dict[str, list[str]]:
    return {cat.name: [sub.name for sub in cat.subcategories] for cat in categories}
```
Shared by both call sites (import_service + transaction_service).

### 6. `classification/llm_classifier.py`

**Constants:**
```python
SINGLE_PASS_MAX_CATEGORIES = 30
SINGLE_PASS_MAX_SUBCATEGORIES = 100
```
Current seed data is 20 categories / ~84 subcategories — single-pass is always active unless user adds many more categories.

**`__init__`:** defer `import openai` inside `__init__` so the module loads even if openai is not installed.
```python
def __init__(self, api_key: str, model: str = "gpt-4o-mini", temperature: float = 0.0):
    import openai
    self._client = openai.OpenAI(api_key=api_key)
    self._model = model
    self._temperature = temperature
```

**System prompt (static):**
```
You are a financial transaction categorizer. Your job is to classify a bank
transaction into exactly one category and one subcategory from the provided list.

Rules:
- You MUST select a category_index and subcategory_index from the numbered lists.
- Do NOT invent new categories or subcategories.
- Choose the best possible match. If ambiguous, pick the most common interpretation.
- Return ONLY a JSON object. No explanation, no markdown, no extra keys.

Response format:
{"category_index": <int>, "subcategory_index": <int>, "confidence": <float 0.0-1.0>}
```

**Single-pass user prompt:**
```
Transaction description: "{description}"

Available categories and subcategories:
[0] Food
    [0] Restaurant
    [1] Takeout / Delivery
[1] Groceries
    [0] Supermarket
    ...

Return the JSON object now.
```

**Two-pass (only if >30 categories or >100 subcategories):**
- Pass 1: send only category names, ask for `category_index`
- Pass 2: send subcategory names for the resolved category, ask for `subcategory_index`
- Final confidence = confidence1 × confidence2

**Index-based output (not name-based):**
Avoids hallucinated name variations like `"Coffee/Tea"` vs `"Coffee / Tea"`. Validation is a bounds check, not string comparison.

**Validation after LLM response:**
| Outcome | Condition | Return |
|---|---|---|
| Full success | both indices valid | `{category, subcategory, confidence}` |
| Partial fallback | category valid, subcategory index bad | `{category, None, confidence * 0.5}` |
| Total fallback | category index invalid or missing | `{None, None, 0.0}` |

**`classify()` flow:**
1. Check cache → return early if hit
2. Check `_should_use_two_pass()`
3. Call `_classify_single_pass()` or `_classify_two_pass()`
4. Wrap entire LLM call in `try/except` → return `{None, None, 0.0}` on any failure
5. Store in cache, return result

**`_call_llm()` helper:**
```python
def _call_llm(self, system: str, user: str) -> dict:
    resp = self._client.chat.completions.create(
        model=self._model,
        temperature=self._temperature,
        response_format={"type": "json_object"},
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": user}],
    )
    return json.loads(resp.choices[0].message.content)
```

### 7. `classification/__init__.py`
```python
from app.config import get_settings
from app.services.classification.llm_classifier import LLMClassifier

def get_classifier() -> LLMClassifier:
    settings = get_settings()
    return LLMClassifier(api_key=settings.OPENAI_API_KEY)
```

### 8. `services/import_service.py`

Add imports at top of file:
```python
from app.services.classification import get_classifier
from app.services.classification.category_tree import build_category_tree
from app.services import category_service
from app.config import get_settings
```

In `process_import()`, **before** the `for row in rows:` loop, add:
```python
classifier = None
category_tree: dict[str, list[str]] = {}
settings = get_settings()
if settings.CLASSIFICATION_ENABLED and settings.OPENAI_API_KEY:
    classifier = get_classifier()
    category_tree = build_category_tree(category_service.list_categories(db))
```

**Inside** the loop, after `parsed = parser.parse_row(raw)`:
```python
category: str | None = None
subcategory: str | None = None
if classifier and category_tree:
    desc = parsed.description or parsed.merchant_raw or ""
    if desc:
        result = classifier.classify(desc, category_tree)
        category = result["category"]
        subcategory = result["subcategory"]
```

Pass `category=category, subcategory=subcategory` to `Transaction(...)`.

### 9. `services/transaction_service.py`

Same imports as above. In `create_transaction()`, before `Transaction(...)`:
```python
category = data.category
subcategory = data.subcategory
settings = get_settings()
if category is None and settings.CLASSIFICATION_ENABLED and settings.OPENAI_API_KEY:
    classifier = get_classifier()
    tree = build_category_tree(category_service.list_categories(db))
    desc = data.description or data.merchant_normalized or ""
    if desc:
        result = classifier.classify(desc, tree)
        category = result["category"]
        subcategory = result["subcategory"]
```

Use `category=category, subcategory=subcategory` in `Transaction(...)`.

### 10. `tests/test_llm_classifier.py`

All tests mock `openai.OpenAI` — no real API calls.

Test groups:
- **`build_category_tree`**: structure, keys, subcategory lists
- **`_validate_and_resolve`**: valid indices, out-of-bounds category, bad subcategory index, missing keys, confidence clamping
- **`LLMClassifier.classify`**: correct name resolution, cache hit skips second API call, API exception → graceful None fallback, two-pass triggered for large tree (assert 2 LLM calls made)
- **Integration**: monkeypatch `get_classifier` in `import_service` → assert transactions have expected category after process_import

---

## Implementation Order

1. `pyproject.toml` → `uv sync`
2. `app/config.py` — add 2 fields
3. `classification/base.py`
4. `classification/cache.py`
5. `classification/category_tree.py`
6. `classification/llm_classifier.py`
7. `classification/__init__.py`
8. `app/services/import_service.py` — wire in
9. `app/services/transaction_service.py` — wire in
10. `tests/test_llm_classifier.py`

---

## Verification

```bash
# Install new dependency
cd backend && uv sync

# Run tests (all mocked, no API key needed)
uv run pytest tests/test_llm_classifier.py -v

# Full test suite must stay green
uv run pytest -v

# Manual end-to-end: add key to .env
echo "OPENAI_API_KEY=sk-..." >> .env
uv run uvicorn app.main:app --reload

# Upload a CSV via the UI — check that transactions have category populated
# Manually create a transaction with no category — verify it gets auto-classified
```