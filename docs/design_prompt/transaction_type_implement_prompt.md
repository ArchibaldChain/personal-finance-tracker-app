You are a senior backend engineer.

Your task is to introduce `transaction_type` into an existing finance app with minimal, safe, and backward-compatible changes.

---

# Current System

The backend already has:

- Transaction table
- Category table
- Subcategory table
- Import / ImportRow logic
- LLM + rule-based classification
- Seed category template used to initialize categories for each user/ledger

Category structure:
- Category → Subcategory (2 levels)
- Expense categories often have subcategories (e.g. grocery → walmart)
- Income and Transfer are currently represented as categories

There is already existing production data.

---

# Goal

Introduce a new concept:

```text
transaction_type = expense | income | transfer
```
This represents the financial nature of a transaction.

We want to:

Separate financial nature from business category
Keep category/subcategory structure unchanged (still 2 levels)
Avoid turning taxonomy into 3 nested levels
Key Design Principles
1. Minimal changes
Do NOT redesign the entire system
Do NOT break existing logic
Prefer additive changes only
2. No new tables
Do NOT create a transaction_types table
Use enum (or string enum)
3. Preserve existing data
No destructive migrations
No dropping tables
No mass rewrites of category hierarchy
4. Keep seed category system intact
Just extend it with transaction_type
Required Changes
A. Add transaction_type to Transaction

Add a new required field:
```
transaction_type: enum('expense', 'income', 'transfer')
```
This will be used for:

income / expense calculation
cash flow
excluding transfers
B. Add transaction_type to Category

Add:
```
transaction_type: enum('expense', 'income', 'transfer')
```
Purpose:

constrain which type a category belongs to
allow filtering categories in UI
validate transactions

Examples:

Food → expense
Groceries → expense
Transfers → transfer
Income → income
C. Do NOT modify Subcategory

Subcategory should remain:

linked to Category
no transaction_type field
Seed Category Template Changes

The system uses a seed category template like:
```
CATEGORY_DATA = [
{ name, icon, subcategories }
]
```
You must update this structure to include:
```
transaction_type
```
Example:
```
{
  "name": "Food",
  "transaction_type": "expense",
  "icon": "Utensils",
  "subcategories": [...]
},
{
  "name": "Transfers",
  "transaction_type": "transfer",
  "icon": "...",
  "subcategories": [...]
},
{
  "name": "Income",
  "transaction_type": "income",
  "icon": "...",
  "subcategories": [...]
}
```
IMPORTANT:

Do NOT remove existing categories like "Income" or "Transfers"
Just assign them a type
Keep template backward compatible
Migration Strategy (VERY IMPORTANT)

The database already contains data.

Step-by-step plan:
Add nullable transaction_type to Category
Add nullable transaction_type to Transaction
Backfill Category:
If category name == "Income" → income
If category name == "Transfers" → transfer
Otherwise → expense
Backfill Transaction:
Infer transaction_type from its category
After verification:
Make transaction_type NOT NULL
Do NOT delete or restructure categories yet
Validation Rules

Add validation so that:

transaction.transaction_type must match category.transaction_type
subcategory must belong to category
subcategory can be NULL
Classification Logic Changes

The system currently uses:

rule-based classification
LLM classification

Refactor classification output to support:
```
{
  "transaction_type": "...",
  "category": "...",
  "subcategory": "...",
  "confidence": 0.9
}
```
IMPORTANT:

Do NOT split classification into multiple LLM calls
Keep single-pass classification
Allow rule-based override for obvious cases (transfer, salary, refund)
Refund Handling Rule

Refunds should be treated as:

transaction_type = expense

So they can offset expense totals.

Do NOT classify refunds as income.

ORM Changes

Update models:

Transaction
transaction_type (required)
category_id
subcategory_id (nullable)
Category
transaction_type
Subcategory
unchanged
API / Schema Changes
Add transaction_type to transaction create/update API
Add transaction_type to category create/update API
Keep backward compatibility if frontend not updated yet
Deliverables
Summary of current relevant backend structure
Migration plan
Alembic migration scripts
Updated models
Updated seed category template
Updated validation logic
Updated classification interface
Notes on backward compatibility
Notes for future improvements (splitting Income/Transfer categories later)
Constraints
No breaking changes
No schema redesign beyond what is specified
No new tables
No 3-level category hierarchy
Keep system stable

Start by analyzing the current backend structure before implementing changes.