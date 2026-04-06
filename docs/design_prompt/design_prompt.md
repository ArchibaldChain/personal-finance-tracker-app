Design a clean, minimal web app UI for a personal finance expense tracker.
Use a warm light theme: beige/cream page background (#faf8f4), white card
surfaces, gold (#c9a84c) as the primary accent color, and light grey (#e8e4de)
for borders and dividers. Font: Inter or system sans-serif.

The app has 4 pages, all sharing a sticky top navigation bar.

---

NAVIGATION BAR (shared across all pages)
- Left: golden wallet logo icon + "Finance Tracker" brand name in bold dark brown (#2d2116)
- Right: 4 nav links — "Dashboard", "Transactions", "Import", "Categories"
- Active link has gold text (#c9a84c) and warm beige background pill (#f5f0e8)
- White background, thin light grey bottom border (#e8e4de), full-width, sticky at top

---

PAGE 1: Dashboard
A dedicated analytics page. All charts and summaries live here.

Section 1 — Page Header:
- "Dashboard" title on the left
- Month picker on the right: left arrow | "March 2025" | right arrow
- Defaults to the previous month (e.g. if today is April, default is March)
- Gold accent on the selected month, grey arrows for prev/next
- No clear/deselect option — a month is always selected on this page

Section 2 — Summary Card (full width):
- Horizontal card with three stats separated by vertical dividers:
  Total Spent | Transactions | Largest Expense
- Gold accent on the dollar amounts, small uppercase grey label above each value

Section 3 — Two Charts side by side:

Left card — Bar Chart "Daily Expenses — [Month]":
- X axis: each day of the selected month (e.g. 1, 2, ..., 31); interval every 4-5 days
- Y axis: dollar amount spent that day
- Bars in gold (#c9a84c), rounded top corners
- Hover tooltip: "Day N" + formatted dollar amount
- Clicking a bar opens the Day Detail Card below and deactivates any open Category card
- Clicking the same bar again closes the Day Detail Card

Right card — Pie Chart "By Category — [Month]":
- Each slice is a different spending category
- Warm color palette: golds, terracottas, sage greens, dusty blues, warm mauves
- Donut chart (inner radius) with total spending in the center
- Legend to the right: color dot + category name + percentage + dollar total
- Clicking a slice or legend item opens the Category Detail Card below
  and deactivates any open Day card; clicking again closes it
- Non-selected slices dim to 35% opacity when one is active

Section 4 — Detail Card (appears below charts; only one shown at a time):

Day Detail Card (shown when a bar is clicked):
- Header: full date + weekday (e.g. "Monday, March 10") + day total; X to dismiss
- Transaction table — same format as Category Detail Card (see below)

Category Detail Card (shown when a pie slice is clicked):
- Header: "[Category Name] — [Month]" + category total; X to dismiss
- Transaction table with columns: Date | Day | Merchant | Category | Subcategory | Amount
- Category and Subcategory cells are inline-editable (click to open a dropdown,
  select saves on ✓ button, cancel on ✕)
- "View them in Transactions →" link at the bottom, navigates to Transactions
  page pre-filtered to that category and month

Default card (shown when nothing is selected):
- Shows "Daily Totals — [Month]" table
- Columns: Date | Day | Total Spent | Transactions
- Clicking a row opens the Day Detail Card for that date

---

PAGE 2: Transactions
The main data table page. No charts here.

Section 1 — Summary Card (full width):
- Same layout as Dashboard summary: Total Spent | Transactions | Largest Expense
- Totals reflect the current filter selection (month + search + category etc.)

Section 2 — Filter Bar (horizontal row of controls):
- Year-Month picker: left arrow | "March 2025" | right arrow + X to clear
  - Defaults to the previous month on first load
  - Clearing (X) switches to "All time" mode — shows all transactions regardless of date
- Search text input (placeholder: "Search merchant or description...")
- Category dropdown filter
- Source dropdown filter (e.g. "BMO Credit Card", "Walmart Rewards")
- "Needs Review" toggle/checkbox
- Sort controls (sort by date or amount, asc/desc)
- Gold "Add Transaction" button on the far right

Section 3 — Transactions Table:
Columns: Date | Merchant | Category (with colored icon badge) |
Subcategory | Amount | Source | Confidence | Actions
- Each row is clickable (opens Edit Transaction modal)
- Amounts right-aligned; expenses in terracotta red (#c0392b), income in sage green (#5a8a6a)
- Category shown as a small colored pill badge with icon; clickable inline edit
- Confidence column shows a percentage badge in green/amber/red
- Alternate row background: white and very light beige (#fdf9f3)
- Hover highlight: warm light gold tint (#fef9ec)
- Loading skeleton state when data is loading

Section 4 — Pagination:
- Centered: "Showing 1–50 of 342 transactions"
- Prev / Next buttons with gold accent, current page indicator

Section 5 — Add Transaction Modal (popup overlay):
- White card, warm dark semi-transparent backdrop (rgba(45,33,22,0.5))
- Form fields: Date, Amount, Currency, Merchant, Category dropdown,
  Subcategory dropdown, Notes textarea
- "Save" (gold filled) and "Cancel" (grey outline) buttons

Section 6 — Edit Transaction Modal:
- Same layout as Add, pre-filled
- Red "Delete" button in the bottom-left corner

---

PAGE 3: Import CSV
Simple page, two sections stacked.

Section 1 — Upload Form:
- Dropdown to select the bank/source (e.g. BMO Credit Card)
- Drag-and-drop file upload area with dashed light grey border (#e8e4de),
  gold upload icon, "Drop your CSV here or click to browse"
- Gold "Import" submit button

Section 2 — Import History Table:
Columns: Date Uploaded | Source | File Name | Status | Total Rows | Parsed | Failed | Actions
- Status badge: "success" (sage green), "partial" (amber), "failed" (terracotta red)
- Trash icon button in Actions column to delete a record

---

PAGE 4: Categories
Two-panel layout side by side.

Left panel — Category List:
- List of category rows: colored icon badge | category name | subcategory count
- Pencil and trash icon buttons on the right of each row
- Selected row highlighted in warm gold tint (#fef9ec)
- "Add Category" gold button pinned to the bottom of the panel

Right panel — Detail / Edit Form:
- Placeholder ("Select a category…") when nothing is selected
- When a category is selected:
  - "Category Details" heading
  - Icon picker: scrollable emoji grid; selected icon has gold border + light gold background
  - Name text input
  - Subcategories list: each row shows icon + name + pencil + trash
    - Pencil opens an inline edit block with name input, icon picker, Save/Cancel buttons
  - "Add Subcategory" dashed button at the bottom of the list
  - "Save Changes" gold button
- When "Add Category" is clicked, right panel shows a "New Category" form:
  - Icon picker + Name input + "Create Category" (gold) and "Cancel" (grey outline) buttons

Button feedback (active states):
- All gold buttons darken to #a8872f and scale to 96% on press
- All grey/cancel buttons darken background to #ece8e0 and scale to 96% on press
- Transitions: 0.08s for scale, 0.1s for background

---

DESIGN STYLE:
- Warm, minimal, data-dense but not cluttered
- Color palette: gold #c9a84c, beige background #faf8f4, white cards,
  light grey borders #e8e4de, dark brown text #2d2116, mid grey text #6b6560
- Cards: white background, 1px #e8e4de border, 6px border-radius, subtle warm box-shadow
- Buttons: gold filled primary, light grey outline secondary, terracotta red for destructive
- Table rows: 40px height, 10px 16px padding
- Modals: centered, max-width 480px, white card with 8px radius,
  warm dark semi-transparent overlay rgba(45,33,22,0.5)
- Chart cards: side by side, roughly 52%/44% width split, 300px chart height, 20px padding
- Month picker: compact inline control with prev/next arrows, gold accent
- No decorative gradients or heavy illustrations — functional and clean