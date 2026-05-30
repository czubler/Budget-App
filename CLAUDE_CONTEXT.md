# Budget App — Brainstorming Context

Use this to help me brainstorm new feature ideas, UX improvements, and Linear issue drafts for my personal budget tracker app.

---

## What the app is

A personal budget tracker I built for myself. It's not a SaaS product — just a tool I use daily to track spending, log paychecks, and stay on budget. The goal is fast data entry and clear visibility into where my money is going each month.

---

## Tech stack

- **Next.js 14** (App Router, TypeScript)
- **Tailwind CSS** for styling
- **Supabase** (PostgreSQL) for the database — no auth yet, RLS is off
- **Recharts** for charts
- Deployed locally, planning to host on Vercel

---

## What's already built

### Pages

**Add Expense (`/`)** — The home page. Quick form to log an expense: description, merchant, amount, date, payment method, category, notes. Shows 5 most recent expenses below. Press `/` to focus the form from anywhere.

**All Expenses (`/expenses`)** — Paginated table (25/page) of every expense. Has debounced search, multi-select category + payment method filters, date range picker, sortable columns, inline edit modal, inline delete, a running total for the filtered view, and CSV export.

**Income (`/income`)** — Log a paycheck: source, date, hours worked, hourly rate, gross, taxes withheld, net (auto-calculated but overridable). Monthly summary cards: Gross / Taxes / Net / Effective Tax Rate. Full history table with edit + delete.

**Budget Overview (`/budget`)** — Three sections:
1. Summary banner: Total Income, Total Expenses, Net Savings for the current month
2. Budget vs. Actual table: every category with its monthly target (inline-editable), amount spent, remaining, and a color progress bar
3. Charts: bar chart (budget vs. actual), line chart (6-month income vs. expenses trend), donut chart (spending breakdown by category)

**Settings (`/settings`)** — Supabase connection status + live record counts. Edit monthly budget targets for all 15 categories.

### Categories (15 total)

Fixed/Recurring: Rent, Gas Bill, Electricity, Wifi, Water, Car Insurance, Subscriptions, Transit

Variable/Daily: Groceries, Social, Home, Clothing, Dining, Entertainment, Other

### Payment methods

Cash, Credit Card, Debit Card, Venmo, Zelle, Check, Other

---

## Database schema

**`expenses`**: id, description, merchant, amount, date, payment_method, category, notes, created_at

**`income`**: id, source, paycheck_date, gross_amount, taxes_withheld, net_amount, hours_worked, hourly_rate, notes, created_at

**`budget_targets`**: id, category, monthly_target, is_recurring, updated_at

---

## What's NOT built yet (existing Linear backlog)

These are already ticketed — don't suggest these again:

- **BUD-5** Auth (Supabase magic link login + RLS)
- **BUD-6** CSV export bug with amount filter
- **BUD-7** Negative spending money display on budget formula bar
- **BUD-8** Safari iOS date input rendering bug
- **BUD-9** Supabase Auth + RLS policies
- **BUD-10** Recurring expense templates (quick-add chips)
- **BUD-11** Month selector on Budget + Income pages
- **BUD-12** Spending insights / anomaly alerts panel
- **BUD-13** PDF monthly report export
- **BUD-14** Bulk CSV import from bank exports
- **BUD-15** Persist sort/filter prefs in localStorage
- **BUD-16** Keyboard navigation in edit modal
- **BUD-17** Savings category + savings rate tracking
- **BUD-18** Replace inline delete with modal confirmation
- **BUD-19** Dark mode

---

## How I use the app day-to-day

- I log expenses immediately after spending (usually on desktop)
- I check the Budget Overview at the start and end of each month
- I log income once or twice a month when I get paid
- I care most about: fast expense entry, knowing if I'm over budget in a category, and seeing my net savings trend

---

## What I'd love help brainstorming

Feel free to suggest any of:
- New pages or features that would make this more useful for daily use
- UX improvements to make data entry even faster
- Smarter ways to visualize or surface budget data
- Mobile experience improvements
- Automation ideas (recurring entries, reminders, rules)
- Anything a personal finance power user would want
- New Linear issue drafts (include title, description, priority, and which category: Bug / Feature / Improvement)
