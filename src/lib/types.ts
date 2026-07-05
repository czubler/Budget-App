export type Expense = {
  id: string
  description: string | null
  merchant: string | null
  amount: number
  date: string
  payment_method: string | null
  category: string | null
  notes: string | null
  created_at: string
}

export type Income = {
  id: string
  source: string
  hours_worked: number | null
  hourly_rate: number | null
  paycheck_date: string
  gross_amount: number
  taxes_withheld: number | null
  net_amount: number | null
  notes: string | null
  created_at: string
}

export type BudgetTarget = {
  id: string
  category: string
  monthly_target: number | null
  is_recurring: boolean | null
  category_type: 'fixed' | 'variable_monthly' | 'variable_daily' | null
}

export type SavingsAccount = {
  id: string
  name: string
  is_active: boolean
  created_at: string
}

export type SavingsContribution = {
  id: string
  account_id: string
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export type SavingsGoal = {
  id: string
  name: string
  target_amount: number
  is_archived: boolean
  created_at: string
}

export type PaymentMethod = {
  id: string
  nickname: string
  payment_due_date: number | null
  is_active: boolean
  created_at: string
}

export type SavingsGoalContribution = {
  id: string
  goal_id: string
  amount: number
  date: string
  notes: string | null
  created_at: string
}

export type OvertimeRule = {
  id: string
  label: string
  multiplier: number
  sort_order: number
  created_at: string
}

export type IncomeHoursBreakdown = {
  id: string
  income_id: string
  rule_id: string | null
  label: string
  multiplier: number
  hours_worked: number
  base_rate: number
  subtotal: number
  created_at: string
}

export type RecurringExpense = {
  id: string
  description: string | null
  merchant: string | null
  amount: number
  category: string | null
  payment_method: string | null
  notes: string | null
  type: 'subscription' | 'utility'
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'yearly'
  day_of_month: number | null
  day_of_week: number | null
  month_of_year: number | null
  start_date: string
  next_due_date: string
  is_active: boolean
  created_at: string
}
