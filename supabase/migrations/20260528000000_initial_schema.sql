-- Expenses table
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  description text,
  merchant text,
  amount numeric not null,
  date date not null,
  payment_method text check (
    payment_method in ('Cash', 'Credit Card', 'Debit Card', 'Venmo', 'Zelle', 'Check', 'Other')
  ),
  category text check (
    category in (
      'Rent', 'Gas Bill', 'Electricity', 'Wifi', 'Water', 'Groceries', 'Car Insurance',
      'Subscriptions', 'Transit', 'Social', 'Home', 'Clothing', 'Dining',
      'Entertainment', 'Other'
    )
  ),
  notes text,
  created_at timestamptz default now()
);

-- Income table
create table if not exists income (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  hours_worked numeric,
  hourly_rate numeric,
  paycheck_date date not null,
  gross_amount numeric not null,
  taxes_withheld numeric,
  net_amount numeric generated always as (
    coalesce(gross_amount - coalesce(taxes_withheld, 0), gross_amount)
  ) stored,
  notes text,
  created_at timestamptz default now()
);

-- Budget targets table (monthly expected amounts by category)
create table if not exists budget_targets (
  id uuid primary key default gen_random_uuid(),
  category text unique not null,
  monthly_target numeric,
  is_recurring boolean
);
