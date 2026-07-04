import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const edgeFnUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-payment-reminders`

  const res = await fetch(edgeFnUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  })

  const data = await res.json()
  return NextResponse.json(data, { status: res.ok ? 200 : 500 })
}
