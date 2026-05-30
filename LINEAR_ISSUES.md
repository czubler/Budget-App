# Linear Issue Drafts

Future feature ideas and improvements for the Budget App, organized as Linear-style issue drafts.

---

## Bug Fixes

### BUG-001 — Income history shows stale data after inline edit without full refetch
**Priority:** Medium

When an income entry is edited via the Edit modal, `handleEditSave` optimistically updates the local `history` array before calling `fetchData()`. If the database update fails silently after `onSave` fires, the UI shows the new values while the database has the old ones. The optimistic update should be removed so the UI always reflects what `fetchData()` returns.

**Steps to reproduce:** Edit an income entry, observe the row updates instantly before the toast appears.
**Expected:** Row should only update after `fetchData()` resolves.

---

### BUG-002 — Expenses CSV export omits active filters when amount filter is set
**Priority:** High

The CSV export function reuses `withFilters()` but the amount range filter (`min_amount` / `max_amount`) applies a `.gte()` / `.lte()` chain. If only a minimum amount is entered and the user exports, the resulting CSV may contain rows outside the visible filtered set due to a missing guard on the upper bound.

**Steps to reproduce:** Set min amount filter to $50, leave max blank, export CSV. Verify row count matches the table.

---

### BUG-003 — Budget Overview formula bar can show negative "spending money"
**Priority:** Low

The formula bar computes `Income − Fixed − Variable − Savings = Spending Money`. If budget targets sum to more than the income figure for the month, the result displays as a negative number with no visual indication that the budget is over-allocated. Should show the value in red and add an "over-budget" label.

---

### BUG-004 — Date field on Add Expense page shows browser default date picker on Safari
**Priority:** Low

The native `<input type="date">` renders inconsistently on Safari for iOS — the field height collapses and the `$` prefix in the amount field partially overlaps the input on smaller screen sizes. Needs a targeted fix using `-webkit-appearance: none` or a custom date picker component.

---

## Features

### FEAT-001 — Authentication with Supabase Auth (email + magic link)
**Priority:** High

Add user authentication so the app can be used by multiple people with data isolation. Supabase Auth with magic-link email sign-in is the lowest-friction option given the existing Supabase setup.

**Acceptance criteria:**
- `/login` page with email input and "Send magic link" button
- Middleware redirects unauthenticated users to `/login`
- All Supabase queries scoped to `auth.uid()` via RLS policies on `expenses`, `income`, and `budget_targets`
- Sign-out button in the navigation

---

### FEAT-002 — Recurring expense templates
**Priority:** Medium

Allow users to save an expense as a "template" (e.g., rent, subscriptions) that can be one-click inserted with pre-filled merchant, category, and amount. Templates would be stored in a new `expense_templates` table and surfaced as quick-add chips above the form on the Add Expense page.

**New table:** `expense_templates(id, description, merchant, amount, category, payment_method)`

---

### FEAT-003 — Month selector on Budget Overview and Income pages
**Priority:** Medium

Both the Budget Overview and Income pages currently hard-code to the current calendar month. Add a `← May 2026 →` month navigator at the top of each page so users can review prior months without changing any data. All queries should re-run against the selected month range.

---

### FEAT-004 — Spending insights / anomaly alerts
**Priority:** Low

After a month of data, surface a weekly digest panel on the home page showing:
- Top 3 spending categories vs. budget target
- Any category that exceeded its target mid-month
- Running daily average spend vs. the daily rate implied by the monthly target

This is read-only and requires no new tables — only aggregation queries against `expenses` and `budget_targets`.

---

### FEAT-005 — Export to PDF / printable monthly report
**Priority:** Low

Add a "Download Report" button on the Budget Overview page that generates a single-page PDF summary of the current month: income, expense breakdown by category, budget vs. actual table, and net savings. Can be implemented with `jsPDF` + `html2canvas` against a hidden print-layout div.

---

### FEAT-006 — Bulk import expenses from CSV
**Priority:** Medium

Add an import flow (accessible from the All Expenses page toolbar) that accepts a CSV file, maps columns interactively, previews the parsed rows in a table, and inserts them in a single Supabase batch. This allows users to backfill historical data from bank exports.

**Required columns:** date, amount (required). Optional: description, merchant, category, payment_method, notes.

---

## Improvements

### IMPR-001 — Persist column sort preferences in localStorage
**Priority:** Low

The All Expenses page resets sort order on every page load. Save the active sort column and direction to `localStorage` under a `expenses_sort` key and restore it on mount. Use the same pattern to persist the active category and payment method filters.

---

### IMPR-002 — Keyboard navigation for the All Expenses edit modal
**Priority:** Low

The Edit modal currently has no keyboard shortcut to open or close it. Add:
- `Escape` closes the modal (already partially handled by the overlay click, but not keyboard)
- `Enter` on a table row opens the edit modal for that row
- Tab order moves logically through all fields in the form

---

### IMPR-003 — Add a "Savings" category and track savings rate
**Priority:** Medium

Currently there is no way to record transfers to savings accounts. Add "Savings" as a first-class category in both `CATEGORIES` (page.tsx) and `FIXED` (settings). The Budget Overview formula bar already has a placeholder for savings — wire it up to the actual sum of expenses in the Savings category for the selected month.

---

### IMPR-004 — Replace inline delete confirmation with a modal dialog
**Priority:** Low

The current delete flow shows an inline "Delete? Yes / No" row that shifts table layout. Replace it with a small centered confirmation dialog (reuse the modal pattern from EditModal) so the table layout is stable and the action is harder to trigger accidentally on mobile.

---

### IMPR-005 — Dark mode support
**Priority:** Low

All colors currently use fixed Tailwind classes (`bg-white`, `text-slate-800`, etc.). Add `dark:` variants throughout and respect `prefers-color-scheme` via the Tailwind `darkMode: 'media'` config option. The Supabase connection status badge and chart tooltip backgrounds also need dark-mode treatment.
