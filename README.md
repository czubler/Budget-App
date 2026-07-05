# Budget App

A personal budget tracker built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. Log expenses, paychecks, and savings contributions; set monthly budget targets; and visualize spending trends — all in a clean, fast UI.

Live at: **https://budget-app-bay-omega.vercel.app**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Database | [Supabase](https://supabase.com/) (PostgreSQL) |
| Charts | [Recharts](https://recharts.org/) |
| Icons | [Tabler Icons](https://tabler.io/icons) (webfont CDN) |
| Toasts | [react-hot-toast](https://react-hot-toast.com/) |
| Deployment | [Vercel](https://vercel.com/) (push to `main` auto-deploys) |

---

## Navigation

Three top-level sections with a context-sensitive sub-tab row:

- **Log** (`/`) — entry forms. Sub-tabs: Expense | Income | Savings
- **Ledger** (`/expenses`, `/income`, `/savings`) — history only. Sub-tabs: Expenses | Paychecks | Savings
- **Insights** (`/budget`) — budget overview and charts
- **Settings gear** (always visible) — `/settings`

---

## Pages

### Log (`/`)

Tab-driven via `?tab=expense|income|savings` (default: expense).

**Expense tab** — Full expense form: description, merchant, amount, date, payment method (user-managed cards + static fallbacks), category (chip picker), notes. Press `/` anywhere to focus the description field. Shows 5 most recent expenses below the form. On load, calls `/api/process-recurring` to auto-generate any overdue recurring entries. Recurring expense checkbox expands a scheduling panel (type, frequency, day picker).

**Income tab** — Paycheck form with source dropdown (populated from `income_sources`; pre-selects default source and auto-fills hourly rate). If no sources are configured, falls back to a free-text field. Entering a rate reveals a per-tier breakdown table (Regular / Overtime / Double Time). Gross auto-calculated from breakdown; net auto-calculated from gross minus taxes; both overridable. Saves to `income` + optionally `income_hours_breakdown`.

**Savings tab** — Contribution form: Account or Goal type picker, dropdown of active accounts/goals, amount, date, notes. Saves to `savings_contributions` or `savings_goal_contributions`.

### All Expenses (`/expenses`)

Paginated table (25/page). Debounced search, multi-select category + payment method filters, date range picker, sortable columns, inline edit modal, inline delete, running total for filtered view, CSV export. Category column shows colored badges.

### Paychecks (`/income`)

History-only view. Month picker at top. Source filter dropdown (All / by source / Unassigned) scopes both the history table and the monthly summary cards (Gross / Taxes / Net / Effective Tax Rate). Each row expands to show overtime tier breakdown. No add form — income is logged from Log > Income.

### Savings (`/savings`)

History-only view. Month picker at top. Accounts section and Goals section each show balance/progress, expandable monthly history, and Edit + Delete per contribution. Goals show a progress bar that fills purple and turns green when complete. No add form — contributions are logged from Log > Savings.

### Budget Overview (`/budget`)

Month picker to view any past month. Contains:

1. **Summary banner** — Net Income / Expenses / Net for the month
2. **Overhead card** — fixed total + variable monthly projected (set amounts only, not actual)
3. **Dual formula bars** — Real (actual income) and Projected (projected income from Settings), each showing: income − fixed − variable monthly − variable daily − savings = spending money
4. **Month-end Surplus card** — amber banner for past months with unswept surplus; "Log as savings" opens a sweep modal
5. **Budget vs. Actual table** — three sections (Fixed Monthly / Variable Monthly / Variable Daily) with inline-editable targets and progress bars
6. **Charts** — bar chart, 6-month line chart, donut chart

### Settings (`/settings`)

1. **Projected Monthly Income** — used on the Projected formula bar
2. **Categories & Budget Targets** — full CRUD; Fixed Monthly / Variable Monthly / Variable Daily type selector
3. **Savings Accounts** — add, archive/restore, delete
4. **Payment Methods** — add (nickname + optional due date + statement close date), edit, archive/restore, delete
5. **Savings Goals** — add (name + target amount), archive/restore, delete
6. **Pay Rate Tiers** — add/edit/delete overtime tiers; Regular is system-protected
7. **Income Sources** — add/edit/archive/restore/delete; set one as default (auto-selected in Log > Income)
8. **Data Management** — Reset Demo Data (loads 3 months of realistic April–June 2026 entries) or Wipe All Data (modal confirm, deletes everything, keeps system overtime tiers)
9. **Supabase Connection** — project URL, live record counts, health check

---

## Setup

### Prerequisites

- Node.js 18.17 or later
- A [Supabase](https://supabase.com/) project

### 1. Clone and install

```bash
git clone <your-repo-url>
cd Budget-App
npm install
```

### 2. Environment variables

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 3. Database

Run the SQL migrations in your Supabase project (SQL Editor), in order from `supabase/migrations/`.

### 4. Dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/process-recurring` | POST | Auto-generates overdue recurring expense entries |
| `/api/reset-demo` | POST | Wipes all data, loads April–June 2026 demo dataset |
| `/api/wipe-data` | POST | Deletes all user data; preserves system overtime tiers |
| `/api/cron/payment-reminders` | GET | Vercel cron (daily 8 AM); proxies to Supabase Edge Function for payment reminder emails |

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx                      # Log (/) — Expense, Income, Savings forms
│   ├── expenses/page.tsx             # Ledger — All Expenses
│   ├── income/page.tsx               # Ledger — Paychecks history
│   ├── savings/page.tsx              # Ledger — Savings history
│   ├── budget/
│   │   ├── page.tsx                  # Insights — Budget Overview
│   │   └── BudgetCharts.tsx          # Recharts components (lazy-loaded)
│   ├── settings/page.tsx             # Settings
│   ├── api/
│   │   ├── process-recurring/        # Recurring expense auto-generation
│   │   ├── reset-demo/               # Demo data reset
│   │   ├── wipe-data/                # Full data wipe
│   │   └── cron/payment-reminders/   # Payment reminder cron
│   └── layout.tsx                    # Root layout (nav + toaster)
├── components/
│   ├── Navigation.tsx                # Top nav (Log / Ledger / Insights + sub-tabs)
│   ├── CategoryPicker.tsx            # Chip-grid category selector
│   ├── MonthPicker.tsx               # ← Month Year → navigator
│   └── Skeleton.tsx                  # Loading skeleton components
└── lib/
    ├── supabase.ts                   # Supabase client
    ├── types.ts                      # Shared TypeScript types
    ├── useCategories.ts              # Category names hook
    ├── usePaymentMethods.ts          # Payment methods hook
    └── recurringUtils.ts             # Next-occurrence date calculation
```
