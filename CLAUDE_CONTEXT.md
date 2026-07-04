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
- **Tabler Icons** (webfont via CDN) for all icons — used as `<i className="ti ti-icon-name">`
- Deployed on **Vercel** (env vars set in Vercel dashboard)

---

## What's already built

### Pages

**Add Expense (`/`)** — Home page. Quick form to log an expense: description, merchant, amount, date, payment method (dropdown — user-managed cards appear under "Cards" optgroup, with static fallbacks: Cash, Credit Card, Debit Card, Venmo, Zelle, Check, Other), category (chip picker), notes. Press `/` from anywhere on the page to jump focus to the description field. Shows 5 most recent expenses below.

Recurring expense support: a "Recurring expense" checkbox expands a panel to configure type (subscription / utility), frequency (monthly / weekly / biweekly / yearly), and the appropriate day picker (day of month, day of week, or month + day for yearly). The current expense is logged immediately; a record is also inserted into `recurring_expenses` with the schedule. On every page load, `/api/process-recurring` is called to auto-generate any overdue occurrences since the last visit, showing a toast if new rows were added.

**All Expenses (`/expenses`)** — Paginated table (25/page) of every expense. Debounced search, multi-select category + payment method filters, date range picker, sortable columns, inline edit modal, inline delete, running total for filtered view, CSV export. Category column shows colored `CategoryBadge`.

**Income (`/income`)** — Log a paycheck: source, date, hourly rate, taxes withheld, net (auto-calculated but overridable). Overtime-aware: if overtime rules exist, a breakdown table appears showing each pay tier (Regular / Overtime / Double Time / custom) with hours input and subtotal — gross auto-calculates from the tier breakdown. History table is expandable per row to show tier breakdown. Monthly summary cards: Gross / Taxes / Net / Effective Tax Rate. Full history table with edit + delete. Has **month picker** to view any past month.

**Savings (`/savings`)** — Track savings contributions to accounts and goal buckets. Month picker at top. Two summary cards (this month total, all-time total). **Accounts section**: each active account shows total balance, this month's contributions, expandable monthly contribution history, "+ Add" button opens a contribute modal, each contribution row has Edit + Delete. **Goals section**: each active goal shows name, target amount, progress bar (purple fill → green when complete), "Complete!" badge, expandable monthly history, "+ Add" button, each contribution row has Edit + Delete. Contribute modal works for both account and goal contributions and supports editing existing entries.

**Budget Overview (`/budget`)** — Has **month picker** to view any past month. Four sections:
1. Summary banner: Net Income / Expenses / Net for the selected month
2. Formula bar: income − fixed − utilities − variable − savings = spending money (savings pulls real data from savings_contributions + savings_goal_contributions)
3. **Month-end Surplus card**: shown for past months with income > 0 and unswept surplus — amber banner with "Log as savings" button that opens a sweep modal (account picker, amount pre-filled, date pre-filled to last day of month). Turns green "Fully allocated ✓" after sweeping.
4. Budget vs. Actual table: **three sections** — Fixed/Recurring, Utilities, Variable/Daily — each category with inline-editable monthly target, actual spent, remaining, color progress bar
5. Charts: bar chart (spending by category), line chart (6-month income vs. expenses trend), donut chart (expense breakdown)

**Settings (`/settings`)** — Seven sections:
1. **Categories & Budget Targets**: add, delete, toggle Fixed / Utility / Variable (three-way selector), set monthly targets — full CRUD on `budget_targets`. Three display sections: Fixed/Recurring, Utilities, Variable/Daily.
2. **Savings Accounts**: add, archive/restore, delete — manages `savings_accounts`
3. **Payment Methods**: add (nickname + optional due date + optional statement close date), edit, archive/restore, delete — manages `payment_methods` table. `expenses.payment_method` stores the nickname string.
4. **Savings Goals**: add (name + target amount), archive/restore, delete — manages `savings_goals`
5. **Pay Rate Tiers**: add/edit/delete overtime tiers (label + multiplier). Regular tier is system-protected (can't delete, can't rename). Used in the income entry form to calculate gross from a tier breakdown. Stored in `overtime_rules`.
6. **Demo Data**: "Reset Demo Data" button with a confirmation warning — wipes all data and loads 3 months of realistic demo entries (April–June 2026). ⚠️ Known issue: the reset-demo API doesn't set `category_type`, so all budget targets land in Variable after a reset — they need to be manually re-typed in Settings.
7. **Supabase Connection**: project URL, live record counts, connection health check

### UI / design system

- Purple/blue theme: brand color `#7F77DD`, icon tint `#AFA9EC`
- Per-category colored `CategoryBadge` component (icon circle + pill label)
- `CategoryPicker` chip grid replacing native `<select>` everywhere
- `MonthPicker` component: `← Month Year →` navigator, disabled past current month, "Today" snap-back button
- Navigation: 5 tabs (Add Expense, Expenses, Income, Savings, Budget) + Settings gear

### Categories (configurable via Settings)

**Fixed/Recurring**: Rent, Car Insurance, Subscriptions, Transit

**Utilities** (monthly but variable amount): Gas Bill, Electricity, Wifi, Water

**Variable/Daily**: Groceries, Social, Home, Clothing, Dining, Entertainment, Other

Categories are stored in `budget_targets` with a `category_type` column (`'fixed' | 'utility' | 'variable'`). Fully add/delete/retype in Settings. Not hardcoded. No DB-level check constraints on category values.

### Payment methods

User-managed via Settings → Payment Methods. Stored in a `payment_methods` table (nickname, payment_due_date, statement_close_date, is_active). The expense form populates from this table. No DB-level check constraints on payment_method values.

---

## Database schema

**`expenses`**: id, description, merchant, amount, date, payment_method (text, stores nickname), category (text), notes, created_at

**`income`**: id, source, paycheck_date, gross_amount, taxes_withheld, net_amount, hours_worked, hourly_rate, notes, created_at

**`budget_targets`**: id, category, monthly_target, is_recurring, category_type ('fixed'|'utility'|'variable', default 'variable'), created_at

**`recurring_expenses`**: id, description, merchant, amount, category, payment_method, notes, type ('subscription'|'utility'), frequency ('monthly'|'weekly'|'biweekly'|'yearly'), day_of_month (int|null), day_of_week (int|null), month_of_year (int|null), start_date, next_due_date, is_active, created_at

**`payment_methods`**: id, nickname, payment_due_date (int, day of month), statement_close_date (int, day of month), is_active, created_at

**`savings_accounts`**: id, name, is_active, created_at

**`savings_contributions`**: id, account_id (→ savings_accounts, cascade), amount, date, notes, created_at

**`savings_goals`**: id, name, target_amount, is_archived, created_at

**`savings_goal_contributions`**: id, goal_id (→ savings_goals, cascade), amount, date, notes, created_at

**`overtime_rules`**: id, label, multiplier, sort_order, created_at — seeded with Regular (1×), Overtime (1.5×), Double Time (2×)

**`income_hours_breakdown`**: id, income_id (→ income), rule_id (→ overtime_rules, nullable), label, multiplier, hours_worked, base_rate, subtotal, created_at

---

## API routes & automation

**`POST /api/process-recurring`** — Called on Add Expense page load. Queries `recurring_expenses` for active records where `next_due_date ≤ today`, inserts any missed expense rows into `expenses`, and advances `next_due_date` to the next occurrence. Can backfill multiple missed occurrences in one call if the app wasn't opened for a while.

**`GET /api/cron/payment-reminders`** — Vercel cron job, runs daily at 8:00 AM (configured in `vercel.json`). Requires `Authorization: Bearer <CRON_SECRET>` header. Proxies to a Supabase Edge Function (`send-payment-reminders`) which sends payment reminder emails based on `payment_methods.payment_due_date` and `statement_close_date`.

**`POST /api/reset-demo`** — Wipes all user data and reloads the demo dataset (April–June 2026). Called by the Settings → Demo Data button.

---

## What's NOT built yet (existing Linear backlog)

These are already ticketed — don't suggest these again:

- **BUD-5** Auth (Supabase magic link login + RLS)
- **BUD-6** CSV export bug with amount filter
- **BUD-7** Negative spending money display on budget formula bar
- **BUD-8** Safari iOS date input rendering bug
- **BUD-9** Supabase Auth + RLS policies
- **BUD-10** Recurring expense templates (quick-add chips)
- **BUD-12** Spending insights / anomaly alerts panel
- **BUD-13** PDF monthly report export
- **BUD-14** Bulk CSV import from bank exports
- **BUD-15** Persist sort/filter prefs in localStorage
- **BUD-16** Keyboard navigation in edit modal
- **BUD-18** Replace inline delete with modal confirmation
- **BUD-19** Dark mode

---

## How I use the app day-to-day

- I log expenses immediately after spending (usually on desktop)
- I check the Budget Overview at the start and end of each month
- I log income once or twice a month when I get paid
- I log savings contributions when I transfer money to savings
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
- New Linear issue drafts (include title, description, priority, and category: Bug / Feature / Improvement)
