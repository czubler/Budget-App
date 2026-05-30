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

export type SavingsGoalContribution = {
  id: string
  goal_id: string
  amount: number
  date: string
  notes: string | null
  created_at: string
}
