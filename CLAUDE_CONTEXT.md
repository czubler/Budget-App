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

**Add Expense (`/`)** — Home page. Quick form to log an expense: description, merchant, amount, date, payment method, category (chip picker), notes. Shows 5 most recent expenses below.

**All Expenses (`/expenses`)** — Paginated table (25/page) of every expense. Debounced search, multi-select category + payment method filters, date range picker, sortable columns, inline edit modal, inline delete, running total for filtered view, CSV export. Category column shows colored `CategoryBadge`.

**Income (`/income`)** — Log a paycheck: source, date, hours worked, hourly rate, gross, taxes withheld, net (auto-calculated but overridable). Monthly summary cards: Gross / Taxes / Net / Effective Tax Rate. Full history table with edit + delete. Has **month picker** to view any past month.

**Savings (`/savings`)** — Track savings contributions to accounts and goal buckets. Month picker at top. Two summary cards (this month total, all-time total). **Accounts section**: each active account shows total balance, this month's contributions, expandable monthly contribution history, "+ Add" button opens a contribute modal. **Goals section**: each active goal shows name, target amount, progress bar (purple fill → green when complete), "Complete!" badge, expandable monthly history, "+ Add" button. Contribute modal works for both account and goal contributions.

**Budget Overview (`/budget`)** — Has **month picker** to view any past month. Three sections:
1. Summary banner: Net Income / Expenses / Net for the selected month
2. Formula bar: income − fixed − variable − savings = spending money (savings now pulls real data from savings_contributions + savings_goal_contributions)
3. Budget vs. Actual table: Fixed and Variable sections, each category with inline-editable monthly target, actual spent, remaining, color progress bar
4. Charts: bar chart (spending by category), line chart (6-month income vs. expenses trend), donut chart (expense breakdown)

**Settings (`/settings`)** — Four sections:
1. Supabase connection status + live record counts
2. **Categories & Budget Targets**: add, delete, toggle Fixed ↔ Variable, set monthly targets — full CRUD on `budget_targets`
3. **Savings Accounts**: add, archive/restore, delete — manages `savings_accounts`
4. **Savings Goals**: add (name + target amount), archive/restore, delete — manages `savings_goals`

### UI / design system

- Purple/blue theme: brand color `#7F77DD`, icon tint `#AFA9EC`
- Per-category colored `CategoryBadge` component (icon circle + pill label)
- `CategoryPicker` chip grid replacing native `<select>` everywhere
- `MonthPicker` component: `← Month Year →` navigator, disabled past current month, "Today" snap-back button
- Navigation: 5 tabs (Add Expense, Expenses, Income, Savings, Budget) + Settings gear

### Categories (configurable via Settings)

Fixed/Recurring: Rent, Gas Bill, Electricity, Wifi, Water, Car Insurance, Subscriptions, Transit

Variable/Daily: Groceries, Social, Home, Clothing, Dining, Entertainment, Other

Categories are stored in `budget_targets` — fully add/delete/toggle in Settings, not hardcoded.

### Payment methods

Cash, Credit Card, Debit Card, Venmo, Zelle, Check, Other

---

## Database schema

**`expenses`**: id, description, merchant, amount, date, payment_method, category, notes, created_at

**`income`**: id, source, paycheck_date, gross_amount, taxes_withheld, net_amount, hours_worked, hourly_rate, notes, created_at

**`budget_targets`**: id, category, monthly_target, is_recurring, created_at

**`savings_accounts`**: id, name, is_active, created_at

**`savings_contributions`**: id, account_id (→ savings_accounts, cascade), amount, date, notes, created_at

**`savings_goals`**: id, name, target_amount, is_archived, created_at

**`savings_goal_contributions`**: id, goal_id (→ savings_goals, cascade), amount, date, notes, created_at

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
- New Linear issue drafts (include title, description, priority, and which category: Bug / Feature / Improvement)
