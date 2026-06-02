import { useState, useEffect } from 'react'
import { supabase } from './supabase'
import type { PaymentMethod } from './types'

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('payment_methods')
      .select('id, nickname, payment_due_date, is_active, created_at')
      .eq('is_active', true)
      .order('nickname')
      .then(({ data }) => {
        setMethods(data ?? [])
        setLoading(false)
      })
  }, [])

  return { methods, loading }
}
