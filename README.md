# Budget App

A personal budget tracker built with Next.js 14, TypeScript, Tailwind CSS, and Supabase. Log expenses and income, set monthly budget targets, and visualize spending trends — all in a clean, mobile-friendly UI.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | [Next.js 14](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styling | [Tailwind CSS](https://tailwindcss.com/) |
| Database | [Supabase](https://supabase.com/) (PostgreSQL) |
| Charts | [Recharts](https://recharts.org/) |
| Toasts | [react-hot-toast](https://react-hot-toast.com/) |
| Fonts | Geist (local) |

---

## Pages

### ➕ Add Expense (`/`)
Quick-add form for logging an expense. Fields: description, merchant, amount, date, payment method, category, and notes. Shows the 5 most recent expenses below the form. Press `/` anywhere on the page to jump focus to the description field.

### 📋 All Expenses (`/expenses`)
Paginated table (25 rows/page) of every expense. Features:
- Debounced search across description and merchant
- Multi-select filters for category and payment method
- Date range filter
- Sortable columns (click any header)
- Inline edit modal and inline delete confirmation
- Running total for the current filtered view
- CSV export of all matching rows

### 💰 Income (`/income`)
Log paycheck entries with gross amount, taxes withheld, and auto-calculated net (overridable). Monthly summary cards show Gross, Taxes Withheld, Net Income, and Effective Tax Rate for the current month. Full income history table with edit and delete.

### 📊 Budget Overview (`/budget`)
Monthly budget dashboard with three sections:
1. **Summary banner** — Total Income, Total Expenses, and Net Savings cards for the current month
2. **Budget vs. Actual table** — Every category with its monthly target (inline-editable), amount spent, remaining budget, and an animated progress bar
3. **Charts** — Bar chart (budget vs. actual by category), line chart (income vs. expenses trend over 6 months), and donut chart (spending breakdown)

### ⚙️ Settings (`/settings`)
- Supabase connection status with live counts of expense and income records
- Monthly budget targets editor for all 15 categories, grouped into Fixed/Recurring and Variable/Daily sections

---

## Setup

### Prerequisites
- Node.js 18.17 or later
- A [Supabase](https://supabase.com/) project

### 1. Clone the repo

```bash
git clone <your-repo-url>
cd Budget-App
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env.local` file in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find both values in your Supabase project under **Project Settings → API**.

### 4. Run database migrations

In your Supabase project, open the **SQL Editor** and run the files in order from the `supabase/migrations/` directory:

1. `20260528000000_initial_schema.sql` — creates the `expenses`, `income`, and `budget_targets` tables
2. `20260528000001_income_net_editable.sql` — makes the `net_amount` column manually writable
3. `20260529000000_seed_budget_targets.sql` — seeds default budget targets (edit amounts to match your budget)

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Screenshots

### Add Expense
<!-- screenshot: add-expense.png -->

### All Expenses
<!-- screenshot: all-expenses.png -->

### Income
<!-- screenshot: income.png -->

### Budget Overview
<!-- screenshot: budget-overview.png -->

### Settings
<!-- screenshot: settings.png -->

---

## Project Structure

```
src/
├── app/
│   ├── page.tsx              # Add Expense (/)
│   ├── expenses/page.tsx     # All Expenses (/expenses)
│   ├── income/page.tsx       # Income (/income)
│   ├── budget/
│   │   ├── page.tsx          # Budget Overview (/budget)
│   │   └── BudgetCharts.tsx  # Recharts components (lazy-loaded)
│   ├── settings/page.tsx     # Settings (/settings)
│   ├── error.tsx             # Route-level error boundary
│   ├── global-error.tsx      # Root-level error boundary
│   └── layout.tsx            # Root layout (nav + toaster)
├── components/
│   ├── Navigation.tsx        # Top nav bar
│   ├── Skeleton.tsx          # Bone, SkeletonCard, ErrorState, EmptyState
│   └── ErrorBoundary.tsx     # React class error boundary
└── lib/
    ├── supabase.ts           # Supabase client
    └── types.ts              # Shared TypeScript types
supabase/
└── migrations/               # SQL migration files
```

---

## Database Schema

### `expenses`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| description | text | Optional |
| merchant | text | Optional |
| amount | numeric | Required |
| date | date | Required |
| payment_method | text | Optional |
| category | text | Optional |
| notes | text | Optional |
| created_at | timestamptz | Auto-set |

### `income`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| source | text | Required |
| paycheck_date | date | Required |
| gross_amount | numeric | Required |
| taxes_withheld | numeric | Optional |
| net_amount | numeric | Optional, manually editable |
| hours_worked | numeric | Optional |
| hourly_rate | numeric | Optional |
| notes | text | Optional |
| created_at | timestamptz | Auto-set |

### `budget_targets`
| Column | Type | Notes |
|--------|------|-------|
| id | uuid | Primary key |
| category | text | Unique, matches expense categories |
| monthly_target | numeric | |
| is_recurring | boolean | Fixed vs. variable |
| updated_at | timestamptz | Auto-updated |

---

## Future Work

See [LINEAR_ISSUES.md](./LINEAR_ISSUES.md) for a full list of planned bug fixes, features, and improvements including authentication, recurring expense templates, month navigation, and dark mode.
