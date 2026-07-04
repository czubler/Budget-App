import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // Delete in FK-safe order
    await supabase.from('savings_goal_contributions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('savings_contributions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('savings_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('savings_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('income').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('payment_methods').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('budget_targets').delete().neq('category', '')

    // ── Payment Methods ────────────────────────────────────────────────────
    const { error: pmErr } = await supabase
      .from('payment_methods')
      .insert([
        { nickname: 'Chase Sapphire', payment_due_date: 15, statement_close_date: 21, is_active: true },
        { nickname: 'Apple Card', payment_due_date: 27, statement_close_date: 3, is_active: true },
        { nickname: 'Wells Fargo Debit', payment_due_date: null, statement_close_date: null, is_active: true },
        { nickname: 'Cash', payment_due_date: null, statement_close_date: null, is_active: true },
        { nickname: 'Venmo', payment_due_date: null, statement_close_date: null, is_active: true },
      ])
    if (pmErr) throw pmErr

    // expenses.payment_method stores the nickname string directly
    const pmId = (nickname: string) => nickname

    // ── Budget Targets ─────────────────────────────────────────────────────
    const { error: btErr } = await supabase.from('budget_targets').insert([
      { category: 'Rent', monthly_target: 1100, is_recurring: true },
      { category: 'Gas Bill', monthly_target: 50, is_recurring: true },
      { category: 'Electricity', monthly_target: 65, is_recurring: true },
      { category: 'Wifi', monthly_target: 55, is_recurring: true },
      { category: 'Water', monthly_target: 35, is_recurring: true },
      { category: 'Car Insurance', monthly_target: 110, is_recurring: true },
      { category: 'Subscriptions', monthly_target: 40, is_recurring: true },
      { category: 'Transit', monthly_target: 85, is_recurring: true },
      { category: 'Groceries', monthly_target: 300, is_recurring: false },
      { category: 'Dining', monthly_target: 150, is_recurring: false },
      { category: 'Social', monthly_target: 120, is_recurring: false },
      { category: 'Home', monthly_target: 80, is_recurring: false },
      { category: 'Clothing', monthly_target: 80, is_recurring: false },
      { category: 'Entertainment', monthly_target: 60, is_recurring: false },
      { category: 'Other', monthly_target: 50, is_recurring: false },
    ])
    if (btErr) throw btErr

    // ── Income ─────────────────────────────────────────────────────────────
    const { error: incErr } = await supabase.from('income').insert([
      // April — two biweekly paychecks
      { source: 'Acme Corp', paycheck_date: '2026-04-15', hours_worked: 80, hourly_rate: 31.25, gross_amount: 2500, taxes_withheld: 500, net_amount: 2000 },
      { source: 'Acme Corp', paycheck_date: '2026-04-30', hours_worked: 80, hourly_rate: 31.25, gross_amount: 2500, taxes_withheld: 500, net_amount: 2000 },
      // May
      { source: 'Acme Corp', paycheck_date: '2026-05-15', hours_worked: 80, hourly_rate: 31.25, gross_amount: 2500, taxes_withheld: 500, net_amount: 2000 },
      { source: 'Acme Corp', paycheck_date: '2026-05-30', hours_worked: 80, hourly_rate: 31.25, gross_amount: 2500, taxes_withheld: 500, net_amount: 2000 },
      // June
      { source: 'Acme Corp', paycheck_date: '2026-06-13', hours_worked: 80, hourly_rate: 31.25, gross_amount: 2500, taxes_withheld: 500, net_amount: 2000 },
      { source: 'Acme Corp', paycheck_date: '2026-06-27', hours_worked: 80, hourly_rate: 31.25, gross_amount: 2500, taxes_withheld: 500, net_amount: 2000 },
    ])
    if (incErr) throw incErr

    // ── Expenses ───────────────────────────────────────────────────────────
    // April — on or under budget across all categories
    const aprilExpenses = [
      { description: 'Monthly rent', merchant: 'Landlord', amount: 1100, date: '2026-04-01', payment_method: pmId('Chase Sapphire'), category: 'Rent' },
      { description: 'Grocery run', merchant: 'Walmart', amount: 78.50, date: '2026-04-03', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Streaming subscriptions', merchant: 'Netflix / Spotify', amount: 40, date: '2026-04-05', payment_method: pmId('Chase Sapphire'), category: 'Subscriptions' },
      { description: 'Gas bill', merchant: 'SoCal Gas', amount: 52, date: '2026-04-07', payment_method: pmId('Chase Sapphire'), category: 'Gas Bill' },
      { description: 'Electricity', merchant: 'Edison', amount: 63, date: '2026-04-08', payment_method: pmId('Chase Sapphire'), category: 'Electricity' },
      { description: 'Lunch', merchant: 'Chipotle', amount: 14.50, date: '2026-04-10', payment_method: pmId('Cash'), category: 'Dining' },
      { description: 'Home supplies', merchant: 'Target', amount: 42, date: '2026-04-12', payment_method: pmId('Wells Fargo Debit'), category: 'Home' },
      { description: 'Internet bill', merchant: 'Xfinity', amount: 55, date: '2026-04-14', payment_method: pmId('Chase Sapphire'), category: 'Wifi' },
      { description: 'Weekly groceries', merchant: "Trader Joe's", amount: 95.20, date: '2026-04-16', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Water bill', merchant: 'City Water', amount: 35, date: '2026-04-18', payment_method: pmId('Chase Sapphire'), category: 'Water' },
      { description: 'Movie night', merchant: 'AMC Theaters', amount: 28, date: '2026-04-20', payment_method: pmId('Chase Sapphire'), category: 'Entertainment' },
      { description: 'Happy hour', merchant: "O'Brien's Bar", amount: 45, date: '2026-04-22', payment_method: pmId('Venmo'), category: 'Social' },
      { description: 'Car insurance', merchant: 'Geico', amount: 110, date: '2026-04-24', payment_method: pmId('Chase Sapphire'), category: 'Car Insurance' },
      { description: 'Monthly transit pass', merchant: 'Metro', amount: 85, date: '2026-04-25', payment_method: pmId('Chase Sapphire'), category: 'Transit' },
      { description: 'Dinner out', merchant: 'The Italian Place', amount: 62, date: '2026-04-28', payment_method: pmId('Chase Sapphire'), category: 'Dining' },
      { description: 'Bulk groceries', merchant: 'Costco', amount: 110.40, date: '2026-04-29', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Amazon order', merchant: 'Amazon', amount: 38.50, date: '2026-04-06', payment_method: pmId('Apple Card'), category: 'Home' },
      { description: 'Lunch', merchant: 'Blue Bottle Coffee', amount: 18.00, date: '2026-04-23', payment_method: pmId('Apple Card'), category: 'Dining' },
    ]
    // May — over budget on Dining ($267 vs $150) and Social ($130 vs $120)
    const mayExpenses = [
      { description: 'Monthly rent', merchant: 'Landlord', amount: 1100, date: '2026-05-01', payment_method: pmId('Chase Sapphire'), category: 'Rent' },
      { description: 'Weekly groceries', merchant: 'Whole Foods', amount: 88.90, date: '2026-05-02', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Gas bill', merchant: 'SoCal Gas', amount: 58, date: '2026-05-04', payment_method: pmId('Chase Sapphire'), category: 'Gas Bill' },
      { description: 'Electricity', merchant: 'Edison', amount: 71, date: '2026-05-05', payment_method: pmId('Chase Sapphire'), category: 'Electricity' },
      { description: 'Streaming subscriptions', merchant: 'Netflix / Spotify', amount: 40, date: '2026-05-06', payment_method: pmId('Chase Sapphire'), category: 'Subscriptions' },
      { description: 'Internet bill', merchant: 'Xfinity', amount: 55, date: '2026-05-09', payment_method: pmId('Chase Sapphire'), category: 'Wifi' },
      { description: 'Sunday brunch', merchant: 'The Brunch Spot', amount: 48, date: '2026-05-10', payment_method: pmId('Chase Sapphire'), category: 'Dining' },
      { description: 'Water bill', merchant: 'City Water', amount: 35, date: '2026-05-11', payment_method: pmId('Chase Sapphire'), category: 'Water' },
      { description: "Friend's birthday dinner", merchant: 'Nobu', amount: 75, date: '2026-05-12', payment_method: pmId('Venmo'), category: 'Dining' },
      { description: 'Home supplies', merchant: 'Amazon', amount: 34.99, date: '2026-05-14', payment_method: pmId('Chase Sapphire'), category: 'Home' },
      { description: 'Car insurance', merchant: 'Geico', amount: 110, date: '2026-05-15', payment_method: pmId('Chase Sapphire'), category: 'Car Insurance' },
      { description: 'Monthly transit pass', merchant: 'Metro', amount: 85, date: '2026-05-16', payment_method: pmId('Chase Sapphire'), category: 'Transit' },
      { description: 'Weekly groceries', merchant: "Trader Joe's", amount: 92.10, date: '2026-05-18', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Bar night out', merchant: 'The Rooftop', amount: 85, date: '2026-05-20', payment_method: pmId('Venmo'), category: 'Social' },
      { description: 'Concert tickets', merchant: 'Ticketmaster', amount: 55, date: '2026-05-22', payment_method: pmId('Chase Sapphire'), category: 'Entertainment' },
      { description: 'New shirt', merchant: 'H&M', amount: 65, date: '2026-05-24', payment_method: pmId('Chase Sapphire'), category: 'Clothing' },
      { description: 'Happy hour', merchant: 'Park Bar', amount: 45, date: '2026-05-24', payment_method: pmId('Venmo'), category: 'Social' },
      { description: 'Dinner out', merchant: 'Trattoria', amount: 88, date: '2026-05-27', payment_method: pmId('Chase Sapphire'), category: 'Dining' },
      { description: 'Groceries', merchant: 'Safeway', amount: 78, date: '2026-05-28', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Weekend trip meals', merchant: 'Various', amount: 56, date: '2026-05-30', payment_method: pmId('Cash'), category: 'Dining' },
      { description: 'Online clothing', merchant: 'ASOS', amount: 72.00, date: '2026-05-07', payment_method: pmId('Apple Card'), category: 'Clothing' },
      { description: 'Pharmacy', merchant: 'CVS', amount: 24.50, date: '2026-05-23', payment_method: pmId('Apple Card'), category: 'Other' },
    ]
    // June — back on track, partial month
    const juneExpenses = [
      { description: 'Monthly rent', merchant: 'Landlord', amount: 1100, date: '2026-06-01', payment_method: pmId('Chase Sapphire'), category: 'Rent' },
      { description: 'Gas bill', merchant: 'SoCal Gas', amount: 48, date: '2026-06-02', payment_method: pmId('Chase Sapphire'), category: 'Gas Bill' },
      { description: 'Electricity', merchant: 'Edison', amount: 60, date: '2026-06-03', payment_method: pmId('Chase Sapphire'), category: 'Electricity' },
      { description: 'Streaming subscriptions', merchant: 'Netflix / Spotify', amount: 40, date: '2026-06-05', payment_method: pmId('Chase Sapphire'), category: 'Subscriptions' },
      { description: 'Internet bill', merchant: 'Xfinity', amount: 55, date: '2026-06-06', payment_method: pmId('Chase Sapphire'), category: 'Wifi' },
      { description: 'Weekly groceries', merchant: "Trader Joe's", amount: 84.20, date: '2026-06-08', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Water bill', merchant: 'City Water', amount: 35, date: '2026-06-10', payment_method: pmId('Chase Sapphire'), category: 'Water' },
      { description: 'Lunch', merchant: 'Shake Shack', amount: 22, date: '2026-06-11', payment_method: pmId('Cash'), category: 'Dining' },
      { description: 'Car insurance', merchant: 'Geico', amount: 110, date: '2026-06-14', payment_method: pmId('Chase Sapphire'), category: 'Car Insurance' },
      { description: 'Monthly transit pass', merchant: 'Metro', amount: 85, date: '2026-06-15', payment_method: pmId('Chase Sapphire'), category: 'Transit' },
      { description: 'Weekly groceries', merchant: 'Walmart', amount: 67.80, date: '2026-06-18', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Happy hour', merchant: 'The Local', amount: 38, date: '2026-06-20', payment_method: pmId('Venmo'), category: 'Social' },
      { description: 'Cleaning supplies', merchant: 'Amazon', amount: 29.99, date: '2026-06-22', payment_method: pmId('Chase Sapphire'), category: 'Home' },
      { description: 'Dinner date', merchant: 'Osteria', amount: 54, date: '2026-06-25', payment_method: pmId('Chase Sapphire'), category: 'Dining' },
      { description: 'Groceries', merchant: 'Whole Foods', amount: 72.50, date: '2026-06-27', payment_method: pmId('Wells Fargo Debit'), category: 'Groceries' },
      { description: 'Museum tickets', merchant: 'LACMA', amount: 24, date: '2026-06-28', payment_method: pmId('Chase Sapphire'), category: 'Entertainment' },
      { description: 'Home decor', merchant: 'Amazon', amount: 45.00, date: '2026-06-04', payment_method: pmId('Apple Card'), category: 'Home' },
      { description: 'Lunch', merchant: 'Sweetgreen', amount: 16.50, date: '2026-06-16', payment_method: pmId('Apple Card'), category: 'Dining' },
    ]

    const { error: expErr } = await supabase
      .from('expenses')
      .insert([...aprilExpenses, ...mayExpenses, ...juneExpenses])
    if (expErr) throw expErr

    // ── Savings Accounts ───────────────────────────────────────────────────
    const { data: accts, error: acctErr } = await supabase
      .from('savings_accounts')
      .insert([
        { name: 'High-Yield Savings', is_active: true },
        { name: 'Emergency Fund', is_active: true },
      ])
      .select('id, name')
    if (acctErr) throw acctErr

    const acctId = (name: string) => accts!.find((a) => a.name === name)!.id

    // ── Savings Goals ──────────────────────────────────────────────────────
    const { data: goals, error: goalErr } = await supabase
      .from('savings_goals')
      .insert([
        { name: 'Vacation Fund', target_amount: 3000, is_archived: false },
        { name: 'New Laptop', target_amount: 1200, is_archived: false },
      ])
      .select('id, name')
    if (goalErr) throw goalErr

    const goalId = (name: string) => goals!.find((g) => g.name === name)!.id

    // ── Savings Contributions ──────────────────────────────────────────────
    const { error: scErr } = await supabase.from('savings_contributions').insert([
      { account_id: acctId('High-Yield Savings'), amount: 300, date: '2026-04-15', notes: null },
      { account_id: acctId('Emergency Fund'), amount: 150, date: '2026-04-30', notes: null },
      { account_id: acctId('High-Yield Savings'), amount: 200, date: '2026-05-15', notes: 'Less this month — went over on dining' },
      { account_id: acctId('Emergency Fund'), amount: 150, date: '2026-05-30', notes: null },
      { account_id: acctId('High-Yield Savings'), amount: 300, date: '2026-06-15', notes: null },
      { account_id: acctId('Emergency Fund'), amount: 150, date: '2026-06-28', notes: null },
    ])
    if (scErr) throw scErr

    // ── Savings Goal Contributions ─────────────────────────────────────────
    const { error: sgcErr } = await supabase.from('savings_goal_contributions').insert([
      { goal_id: goalId('Vacation Fund'), amount: 100, date: '2026-04-15', notes: null },
      { goal_id: goalId('New Laptop'), amount: 50, date: '2026-04-30', notes: null },
      { goal_id: goalId('Vacation Fund'), amount: 75, date: '2026-05-15', notes: null },
      { goal_id: goalId('New Laptop'), amount: 25, date: '2026-05-30', notes: null },
      { goal_id: goalId('Vacation Fund'), amount: 100, date: '2026-06-15', notes: null },
      { goal_id: goalId('New Laptop'), amount: 50, date: '2026-06-28', notes: null },
    ])
    if (sgcErr) throw sgcErr

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('reset-demo error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
