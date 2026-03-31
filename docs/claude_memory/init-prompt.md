You are a senior full-stack engineer. Build an MVP personal finance web app for me.

## Product goal
The app is a personal expense tracker.
For MVP, the app should:
1. Import CSV files from different banks/financial institutions
2. Normalize the imported transactions into a common schema
3. Store transactions in a database
4. Allow manual transaction creation
5. Allow editing historical transactions
6. Display transactions in a web UI
7. Support simple filtering/searching in the UI

This is a personal-use MVP, not an enterprise product. Prioritize clean architecture, simplicity, maintainability, and developer ergonomics.

## Preferred stack
Use:
- Backend: Python + FastAPI
- Database: SQLite for MVP
- ORM: SQLAlchemy
- Migration tool: Alembic
- Frontend: React + TypeScript
- Frontend build tool: Vite
- UI: simple clean component-based UI, for the MVP
- API style: REST
- Validation: Pydantic
- Package/dependency management: `uv` and standard modern setup
- CORS enabled for local frontend/backend development

If there is a good reason to slightly adjust the stack, explain it first, but default to the stack above.

## Core MVP requirements

### 1. CSV import
The app must support CSV import from multiple institutions.
For MVP, design the system so each institution can have its own parser.
Even if only mock/sample parsers are implemented first, the code structure must support adding more parsers later.

Required flow:
- User uploads CSV from frontend
- User selects the source/institution type
- Backend stores import metadata
- Backend parses raw rows
- Backend converts rows into normalized transactions
- Store both:
  - raw import row data
  - normalized transactions

Need an extensible parser architecture like:
- parser registry
- one parser module per institution
- common normalized output model

### 2. Manual transaction entry
Users must be able to manually add a transaction from the UI.

Fields:
- date
- amount
- currency
- merchant
- description
- category
- subcategory
- notes
- account/source name optional

### 3. Edit transaction
Users must be able to edit existing transactions from the UI.

Editable fields:
- date
- amount
- currency
- merchant
- description
- category
- subcategory
- notes

Preserve source/original values where appropriate.
Do not design the system in a way that loses the original imported raw data.

### 4. Transaction listing UI
The UI should have a transaction table/list with:
- date
- merchant
- amount
- category
- source type
- description

Include:
- search bar
- filter by category
- filter by source type
- sort by date
- sort by amount

### 5. Category & Subcategory
Generate some default categories and subcategories for users to choose from when adding/editing transactions.

For default categories, check out 'docs/default_category.md'.

Add a simple way to manage categories/subcategories.

### 6. Data model
Use a unified transactions table.
Manual and imported transactions should both live in the same main transactions table, differentiated by source type.

Suggested entities:
- imports
- import_rows
- transactions

You may add more tables if justified.

## Suggested schema direction

### imports
Tracks uploaded files
Fields should include:
- id
- source_name
- file_name
- uploaded_at
- status
- total_rows
- parsed_rows
- failed_rows

### import_rows
Stores raw imported row data
Fields should include:
- id
- import_id
- row_index
- raw_json
- parse_status
- parse_error

### transactions
Main normalized transaction table
Fields should include:
- id
- import_id nullable
- source_type (csv/manual)
- source_name
- external_id nullable
- transaction_date
- posted_date nullable
- amount
- currency
- merchant_raw nullable
- merchant_normalized
- description
- category nullable
- subcategory nullable
- notes nullable
- is_deleted
- created_at
- updated_at

Use reasonable types and indexes.

## API requirements

Implement REST endpoints at minimum:

### Imports
- POST /imports
  - multipart file upload
  - source_name field
- GET /imports
- GET /imports/{id}
- POST /imports/{id}/process

### Transactions
- GET /transactions
  - support pagination
  - support search
  - support filter by category
  - support filter by source_type
  - support sort
- GET /transactions/{id}
- POST /transactions
- PATCH /transactions/{id}
- DELETE /transactions/{id}

Delete should be soft delete, not hard delete.

## Backend design requirements
- Use a service layer, not only route handlers
- Use repository/db abstraction where reasonable
- Keep parsing logic separate from API logic
- Keep schemas separate from ORM models
- Add clear comments where helpful
- Make the codebase easy to extend later for:
  - Plaid ingestion
  - browser extension ingestion
  - LLM categorization
  - deduplication logic

## Frontend requirements
Build a minimal but usable UI with:
1. Import page
   - upload CSV
   - choose source/institution
   - submit import
   - show import history

2. Transactions page
   - table/list view
   - search/filter/sort
   - click row to edit

3. Manual add transaction form
   - modal or dedicated page

4. Edit transaction form
   - modal, drawer, or page

Keep the UI simple, clean, and practical.
Do not overengineer styling.

## Non-functional requirements
- The app must run locally with simple setup steps
- Provide a README with run instructions
- Provide sample CSV files for at least 2 fake institutions
- Provide at least 2 parser implementations for sample CSV formats
- Add seed/sample data if helpful
- Add basic error handling for malformed CSVs
- Add basic backend tests for parser logic and transaction CRUD
- Add type safety in frontend and backend where possible

## Project structure
Create a clean monorepo or clearly separated frontend/backend folders.
Suggested structure:

/backend
/frontend
/docs

Within backend, structure code cleanly by:
- api/routes
- models
- schemas
- services
- parsers
- db
- tests

## Output expectations
I want production-style code quality for an MVP, not throwaway prototype code.

When implementing:
1. First propose the project structure and architecture briefly
2. Then generate the code files
3. Include README instructions
4. Include sample CSV examples
5. Include clear notes on how to add a new bank parser later

## Constraints
- Keep the MVP focused
- Do not add authentication yet unless truly necessary
- Do not add cloud deployment yet
- Do not add LLM categorization yet, but leave clean extension points for it later
- Do not use serverless/Lambda for MVP
- Do not use microservices
- Do not overcomplicate the system

## Important design philosophy
This app is evolving from:
- CSV import first
- then manual add/edit
- later maybe Plaid ingestion
- later maybe Google Wallet / browser-extension ingestion

So design the system with extensibility in mind, but optimize for a clean MVP today.

Now start by:
1. summarizing the architecture,
2. listing the files you will create,
3. then writing the implementation.