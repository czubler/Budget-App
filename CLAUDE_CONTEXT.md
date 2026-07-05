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
- Deployed on **Vercel** via GitHub integration (push to `main` auto-deploys)
- Live at: `https://budget-app-bay-omega.vercel.app`

---

## What's already built

### Navigation

Three top-level sections with a context-sensitive sub-tab row beneath:

- **Add** — active when on `/`. Sub-tabs: Expense | Income | Savings (switch via `?tab=` URL param)
- **Ledger** — active on `/expenses`, `/income`, `/savings`. Sub-tabs: Expenses | Paychecks | Savings
- **Insights** — links to `/budget`
- **Settings gear** (far right, always visible) — links to `/settings`

### Pages

**Add (`/`)** — Tab-driven home page via `?tab=expense|income|savings` URL param (default: expense).

- **Expense tab** — Full expense form: description, merchant, amount, date, payment method (dropdown — user-managed cards under "Cards" optgroup, static fallbacks: Cash, Credit Card, Debit Card, Venmo, Zelle, Check, Other), category (chip picker), notes. Press `/` from anywhere to focus the description field. Shows 5 most recent expenses below the form. On page load calls `/api/process-recurring` to auto-generate overdue recurring entries (toast if new rows added). Recurring expense checkbox expands a panel: type (subscription / utility), frequency (monthly / weekly / biweekly / yearly), day picker. Current expense logs immediately; a `recurring_expenses` row is inserted for future auto-generation.

- **Income tab** — Full paycheck form: source (required), paycheck date (required), hourly rate (optional — entering it reveals a per-tier breakdown table if overtime rules exist), gross amount (auto-calculated from breakdown or manual override), taxes withheld, net amount (auto-calculated from gross − taxes, overridable), notes. Saves to `income` table; if breakdown was filled, also saves rows to `income_hours_breakdown`.

- **Savings tab** — Contribution form: Account or Goal type picker (segmented button), dropdown of active accounts/goals (loaded from DB), amount (required), date (required), notes. Saves to `savings_contributions` or `savings_goal_contributions` based on selection.

**All Expenses (`/expenses`)** — Paginated table (25/page) of every expense. Debounced search, multi-select category + payment method filters, date range picker, sortable columns, inline edit modal, inline delete, running total for filtered view, CSV export. Category column shows colored `CategoryBadge`.

**Paychecks (`/income`)** — History-only Ledger view. Month picker at top. Monthly summary cards: Gross / Taxes / Net / Effective Tax Rate. Full history table with edit + delete; each row is expandable to show overtime tier breakdown. No add form — income is logged from Add > Income tab.

**Savings (`/savings`)** — History-only Ledger view. Month picker at top. Two summary cards (this month total, all-time total). **Accounts section**: each active account shows total balance, this month's contributions, expandable monthly contribution history, each contribution row has Edit + Delete. **Goals section**: each active goal shows name, target amount, progress bar (purple fill → green when complete), "Complete!" badge, expandable monthly history, each contribution row has Edit + Delete. No "+ Add" buttons — contributions are logged from Add > Savings tab. Edit/delete of existing contributions still uses the ContributeModal.

**Budget Overview (`/budget`)** — Has **month picker** to view any past month. Five sections:

1. **Summary banner**: Net Income / Expenses / Net for the selected month.

2. **Overhead card** (static, always visible): Shows fixed monthly total (sum of `monthly_target` for all `fixed` categories), variable monthly projected (sum of `monthly_target` for all `variable_monthly` categories), and combined overhead = fixed + variable monthly. Uses set/projected amounts only — not actual spend.

3. **Dual formula bars** (side by side):
   - **Real**: actual logged income − fixed deduction − var. monthly deduction − var. daily expenses − savings = spending money
   - **Projected**: projected monthly income (from Settings) − same deductions = projected spending money
   - If projected income is not set, the Projected bar shows "— set in Settings" with a link.
   - Formula deduction logic: Fixed always deducts `monthly_target` regardless of actual spend. Variable Monthly deducts `max(monthly_target, actual_spend)` per category. Variable Daily deducts actual spend only.
   - Savings deduction pulls real data from `savings_contributions` + `savings_goal_contributions`.

4. **Month-end Surplus card**: Shown for past months with income > 0 and unswept surplus — amber banner with "Log as savings" button that opens a sweep modal (account picker, amount pre-filled, date pre-filled to last day of month). Turns green "Fully allocated ✓" after sweeping.

5. **Budget vs. Actual table**: Three distinct sections with different column layouts:
   - **Fixed Monthly**: Category | Set Amount (inline-editable) | Actual Logged | Difference. No progress bar. Difference = actual − set; green if ≤ 0, red if > 0.
   - **Variable Monthly**: Category | Monthly Projection (inline-editable) | Actual | Difference | % Used with progress bar.
   - **Variable Daily**: Category | Monthly Target (inline-editable) | Actual | Remaining | % Used with progress bar.

6. **Charts**: bar chart (spending by category), line chart (6-month income vs. expenses trend), donut chart (expense breakdown).

**Settings (`/settings`)** — Eight sections:

1. **Projected Monthly Income**: Single number field for expected monthly net income. Saves to `app_settings` table. Shown on Budget page Projected formula bar.

2. **Categories & Budget Targets**: Add, delete, toggle Fixed Monthly / Variable Monthly / Variable Daily (three-way selector), set monthly targets — full CRUD on `budget_targets`. Three display sections matching the type names. Amount input is editable inline; save with "Save All" button.

3. **Savings Accounts**: add, archive/restore, delete — manages `savings_accounts`.

4. **Payment Methods**: add (nickname + optional due date + optional statement close date), edit, archive/restore, delete — manages `payment_methods` table. `expenses.payment_method` stores the nickname string.

5. **Savings Goals**: add (name + target amount), archive/restore, delete — manages `savings_goals`.

6. **Pay Rate Tiers**: add/edit/delete overtime tiers (label + multiplier). Regular tier is system-protected (can't delete, can't rename). Used in the income entry form to calculate gross from a tier breakdown. Stored in `overtime_rules`.

7. **Demo Data**: "Reset Demo Data" button with a confirmation warning — wipes all data (including `recurring_expenses` and `income_hours_breakdown`) and loads 3 months of realistic demo entries (April–June 2026). Also seeds `projected_monthly_income = $4,000`. Demo categories are correctly typed on reset.

8. **Supabase Connection**: project URL, live record counts, connection health check.

---

## Budget category model

Categories have three types, stored as `category_type` in `budget_targets`:

| Type | DB value | Label in UI | Formula behavior | Table columns |
|------|----------|-------------|-----------------|---------------|
| Fixed Monthly | `'fixed'` | Fixed Monthly | Always deducts `monthly_target` | Set Amount / Actual / Difference (no bar) |
| Variable Monthly | `'variable_monthly'` | Variable Monthly | Deducts `max(target, actual)` | Projection / Actual / Difference / % Used |
| Variable Daily | `'variable_daily'` | Variable Daily | Deducts actual spend only | Target / Actual / Remaining / % Used |

DB CHECK constraint enforces: `category_type IN ('fixed', 'variable_monthly', 'variable_daily')`.

Default demo categories:
- **Fixed Monthly**: Rent, Car Insurance, Subscriptions, Transit
- **Variable Monthly**: Gas Bill, Electricity, Wifi, Water
- **Variable Daily**: Groceries, Dining, Social, Home, Clothing, Entertainment, Other

---

## UI / design system

- Purple/blue theme: brand color `#7F77DD`, icon tint `#AFA9EC`
- Per-category colored `CategoryBadge` component (icon circle + pill label)
- `CategoryPicker` chip grid replacing native `<select>` everywhere
- `MonthPicker` component: `← Month Year →` navigator, disabled past current month, "Today" snap-back button
- Navigation: 3 top-level sections (Add / Ledger / Insights) with context-sensitive sub-tab row + Settings gear. Sub-tabs for Add: Expense | Income | Savings. Sub-tabs for Ledger: Expenses | Paychecks | Savings.

---

## Database schema

**`expenses`**: id, description, merchant, amount, date, payment_method (text, stores nickname), category (text), notes, created_at

**`income`**: id, source, paycheck_date, gross_amount, taxes_withheld, net_amount, hours_worked, hourly_rate, notes, created_at

**`budget_targets`**: id, category, monthly_target, is_recurring, category_type (`'fixed'|'variable_monthly'|'variable_daily'`, CHECK constraint), created_at

**`recurring_expenses`**: id, description, merchant, amount, category, payment_method, notes, type (`'subscription'|'utility'`), frequency (`'monthly'|'weekly'|'biweekly'|'yearly'`), day_of_month (int|null), day_of_week (int|null), month_of_year (int|null), start_date, next_due_date, is_active, created_at

**`payment_methods`**: id, nickname, payment_due_date (int, day of month), statement_close_date (int, day of month), is_active, created_at

**`savings_accounts`**: id, name, is_active, created_at

**`savings_contributions`**: id, account_id (→ savings_accounts, cascade), amount, date, notes, created_at

**`savings_goals`**: id, name, target_amount, is_archived, created_at

**`savings_goal_contributions`**: id, goal_id (→ savings_goals, cascade), amount, date, notes, created_at

**`overtime_rules`**: id, label, multiplier, sort_order, created_at — seeded with Regular (1×), Overtime (1.5×), Double Time (2×)

**`income_hours_breakdown`**: id, income_id (→ income), rule_id (→ overtime_rules, nullable), label, multiplier, hours_worked, base_rate, subtotal, created_at

**`app_settings`**: key (TEXT PRIMARY KEY), value (TEXT) — currently stores `projected_monthly_income`

---

## API routes & automation

**`POST /api/process-recurring`** — Called on Add Expense page load. Queries `recurring_expenses` for active records where `next_due_date ≤ today`, inserts any missed expense rows into `expenses`, and advances `next_due_date` to the next occurrence. Can backfill multiple missed occurrences in one call if the app wasn't opened for a while.

**`GET /api/cron/payment-reminders`** — Vercel cron job, runs daily at 8:00 AM (configured in `vercel.json`). Requires `Authorization: Bearer <CRON_SECRET>` header. Proxies to a Supabase Edge Function (`send-payment-reminders`) which sends payment reminder emails based on `payment_methods.payment_due_date` and `statement_close_date`.

**`POST /api/reset-demo`** — Wipes all user data (all tables including `recurring_expenses`, `income_hours_breakdown`, `app_settings` projected income gets reset to $4,000) and reloads the demo dataset (April–June 2026). Called by the Settings → Demo Data button.

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
