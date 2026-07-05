import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    // Delete in FK-safe order
    await supabase.from('income_hours_breakdown').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('savings_contributions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('savings_goal_contributions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('recurring_expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('expenses').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('income').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('savings_goals').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('savings_accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('income_sources').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('budget_targets').delete().neq('category', '')
    await supabase.from('payment_methods').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('app_settings').delete().neq('key', '')
    // Keep seeded system tiers (Regular/Overtime/Double Time at sort_order 1–3)
    await supabase.from('overtime_rules').delete().gt('sort_order', 3)

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('wipe-data error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
