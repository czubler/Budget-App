import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { toDateStr, nextOccurrenceAfter } from '@/lib/recurringUtils'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: recurring, error } = await supabase
      .from('recurring_expenses')
      .select('*')
      .eq('is_active', true)
      .lte('next_due_date', toDateStr(today))

    if (error) throw error
    if (!recurring || recurring.length === 0) return NextResponse.json({ count: 0 })

    let totalCount = 0

    for (const record of recurring) {
      const startDate = new Date(record.start_date + 'T00:00:00')
      let currentDate = new Date(record.next_due_date + 'T00:00:00')
      const expensesToInsert: object[] = []

      while (currentDate <= today) {
        expensesToInsert.push({
          description: record.description,
          merchant: record.merchant,
          amount: record.amount,
          date: toDateStr(currentDate),
          payment_method: record.payment_method,
          category: record.category,
          notes: record.notes,
        })
        currentDate = nextOccurrenceAfter(
          currentDate,
          record.frequency,
          record.day_of_month,
          record.day_of_week,
          record.month_of_year,
          startDate
        )
      }

      if (expensesToInsert.length > 0) {
        const { error: insertErr } = await supabase.from('expenses').insert(expensesToInsert)
        if (insertErr) throw insertErr
        totalCount += expensesToInsert.length
      }

      const { error: updateErr } = await supabase
        .from('recurring_expenses')
        .update({ next_due_date: toDateStr(currentDate) })
        .eq('id', record.id)
      if (updateErr) throw updateErr
    }

    return NextResponse.json({ count: totalCount })
  } catch (err) {
    console.error('process-recurring error', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
