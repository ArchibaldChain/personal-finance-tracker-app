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
- Defaults to the previous calendar month
- Gold accent on the selected month, grey arrows for prev/next
- No clear/deselect option — a month is always selected on this page

Section 2 — Summary Card (full width):
- Horizontal card with three stats separated by vertical dividers:
  Total Spent | Transactions | Largest Expense
- Total Spent = net of all checked non-Income, non-Transfer transactions
  (expenses reduce it, refunds add back)
- Gold accent on the dollar amounts, small uppercase grey label above each value
- Reflects only checked (included) rows — unchecking a row removes it from this total

Section 3 — Two Charts side by side (roughly 52%/44% width split):

Left card — Bar Chart "Daily Expenses — [Month]":
- X axis: each day of the selected month; tick every 4–5 days
- Y axis: net dollar amount for that day (expenses minus refunds, clamped to 0)
- Bars in gold (#c9a84c); selected day bar darkens to #a07830
- Hover tooltip: "Day N" + formatted dollar amount
- Clicking a bar filters the section cards below to that day; clicking the same bar again resets
- Charts only count checked rows (rows excluded via checkbox do not contribute)

Right card — Pie Chart "By Category — [Month]":
- Each slice is a non-Income, non-Transfer category; net value per category
- Warm color palette: golds, terracottas, sage greens, dusty blues, warm mauves
- Donut chart with total net spending in the center label
- Legend to the right (scrollable): color dot | category name | % | dollar total
- Clicking a slice or legend item filters the section cards to that category;
  clicking again clears the filter
- Non-selected slices dim to 35% opacity when one is active
- Charts only count checked rows

Section 4 — Section Header bar:
- Shows current context: month label, or selected day date
- "× All of [Month]" button appears when a day is selected (clears day filter)
- "× All categories" button appears when a category is selected (clears category filter)
- Both filters can be active simultaneously

Section 5 — Transaction Section Cards (always visible, stacked vertically):
Three cards: Expenses | Transfers | Income
- Cards with no transactions for the current filter are hidden
- Each card header: collapse arrow ▶ (rotates 90° when expanded) | section label
  (Expenses=terracotta, Transfers=dusty blue, Income=sage) | active category badge (if filtered) | section total
- Clicking the header toggles collapse/expand of the table body
- Section total calculation:
  - Expenses: sum of all transaction amounts (expenses are negative → negated = positive display)
  - Transfers: raw sum
  - Income: raw sum
- Table columns: ☐ | Date | Day | Merchant | Category | Subcategory | Source | Amount | Actions
  (Date and Day columns hidden when a specific day is selected — redundant)

Row-level checkbox (controls chart inclusion):
- Each row has a checkbox (checked by default = included in charts)
- Master checkbox in the column header toggles all rows in that section at once
- Unchecked rows dim to 40% opacity and are excluded from bar chart, pie chart, and summary totals
- Indeterminate state shown on master checkbox when only some rows are checked

Inline category editing (per row):
- Click the Category cell or the ✎ pencil button in the Actions column to open a category dropdown
- After selecting a category, a Subcategory dropdown appears if subcategories exist
- Save/Cancel buttons appear in the Actions column (✓ green, ✕ red) after a selection is made
- Nothing saves to the backend until ✓ is clicked; ✕ cancels and restores original values

Category filter badge:
- When a pie category is active, a gold badge showing the category name appears in each card header
- All three section cards filter to only show transactions in that category

---

PAGE 2: Transactions
The main data table page. No charts here.

Section 1 — Summary Card (full width):
- Same layout as Dashboard summary: Total Spent | Transactions | Largest Expense
- Totals reflect all matching transactions across all pages (not just the current page),
  fetched from a dedicated /transactions/summary backend endpoint
- Respects month, search, category, source, and needs-review filters

Section 2 — Filter Bar (horizontal row of controls):
- Month picker: left arrow | "March 2025" | right arrow + X to clear
  - Clearing switches to "All time" mode
- Search text input (placeholder: "Search merchant or description...")
- Category dropdown filter
- Source dropdown filter (e.g. "BMO Credit Card", "Walmart Rewards")
- ⚠ Needs Review toggle (icon only, no text label)
- Gold "+" Add Transaction button on the far right

Section 3 — Transactions Table:
Columns: Date | Merchant | Category (colored icon badge, clickable to edit inline) |
Subcategory (clickable to edit inline) | Amount | Source | Actions (✎ pencil)
- Inline category editing: click Category cell → category dropdown opens;
  if subcategories exist, Subcategory column shows a subcategory dropdown next;
  Save (✓ green) + Cancel (✕ red) buttons appear in the Actions column
- ⚠ warning icon on category badge when classification_confidence < 70%;
  disappears once the category is manually updated
- Amounts right-aligned; expenses in terracotta red (#c0392b), income in sage green (#5a8a6a)
- Alternate row background: white and very light beige (#fdf9f3)
- Sort indicators on sortable columns (↑/↓ in gold when active, ↕ in grey when inactive)

Section 4 — Pagination:
- "Showing 1–50 of 342 transactions"
- Prev / Next buttons, current page indicator

Section 5 — Add Transaction Modal:
- White card, warm semi-transparent backdrop rgba(45,33,22,0.5)
- Fields: Date, Amount, Currency, Merchant, Category dropdown, Subcategory dropdown, Notes
- "Save" (gold filled) and "Cancel" (grey outline) buttons

Section 6 — Edit Transaction Modal:
- Same layout as Add, pre-filled
- Red "Delete" button in the bottom-left corner

Navigation from Dashboard:
- Clicking "View them in Transactions →" from a Dashboard category filter navigates to
  Transactions pre-filtered to that category and month via URL query params

---

PAGE 3: Import CSV
Simple page, two sections stacked.

Section 1 — Upload Form:
- Dropdown to select the bank/source (e.g. BMO Credit Card)
- Drag-and-drop file upload area with dashed light grey border (#e8e4de),
  gold cloud upload icon, "Drop your CSV here or click to browse"
- Gold "Import" submit button aligned to the right

Section 2 — Import History Table:
Columns: Date Uploaded | Source | File Name | Status | Total Rows | Parsed | Failed | Actions
- Status badge: "Success" (sage green), "Partial" (amber), "Failed" (terracotta red)
- Trash icon button in Actions column to delete a record

---

PAGE 4: Categories
Two-panel layout side by side.

Left panel — Category List:
- List of category rows: colored icon badge | category name | subcategory count pill
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

---

DESIGN STYLE:
- Warm, minimal, data-dense but not cluttered
- Color palette: gold #c9a84c, beige background #faf8f4, white cards,
  light grey borders #e8e4de, dark brown text #2d2116, mid grey text #6b6560,
  terracotta #c0392b (expenses/destructive), sage green #5a8a6a (income/success),
  amber #d97706 (warning/partial)
- Cards: white background, 1px #e8e4de border, 6px border-radius, subtle warm box-shadow
- Buttons: gold filled primary, light grey outline secondary, terracotta red for destructive
- Save/Cancel inline actions: ✓ in sage green outline, ✕ in terracotta outline
- Table rows: 40px height, 10px 16px padding; alternate white/#fdf9f3 background
- Modals: centered, max-width 480px, white card with 8px radius,
  warm dark semi-transparent overlay rgba(45,33,22,0.5)
- Chart cards: side by side, roughly 52%/44% width split, 12px gap, 20px padding
- Month picker: compact inline control with prev/next arrows, gold accent on selected month
- No decorative gradients or heavy illustrations — functional and clean
