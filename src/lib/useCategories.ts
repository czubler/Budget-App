import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export function useCategories() {
  const [names, setNames] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('budget_targets')
      .select('category')
      .order('category')
      .then(({ data }) => {
        setNames(data?.map((r) => r.category) ?? [])
        setLoading(false)
      })
  }, [])

  return { names, loading }
}
