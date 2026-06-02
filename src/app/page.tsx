'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Expense } from '@/lib/types'
import { useCategories } from '@/lib/useCategories'
import { usePaymentMethods } from '@/lib/usePaymentMethods'
import { CategoryPicker } from '@/components/CategoryPicker'

const STATIC_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Venmo', 'Zelle', 'Check', 'Other']

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })
}

const defaultForm = (paymentMethod = '') => ({
  description: '',
  merchant: '',
  amount: '',
  date: todayString(),
  payment_method: paymentMethod,
  category: '',
  notes: '',
})

const inputCls =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

export default function AddExpensePage() {
  const [form, setForm] = useState(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const { names: categories } = useCategories()
  const { methods: dbPaymentMethods } = usePaymentMethods()

  useEffect(() => { fetchRecent() }, [])

  // "/" key focuses the description field from anywhere on the page
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (
        e.key === '/' &&
        !(e.target instanceof HTMLInputElement) &&
        !(e.target instanceof HTMLTextAreaElement) &&
        !(e.target instanceof HTMLSelectElement)
      ) {
        e.preventDefault()
        descriptionRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  async function fetchRecent() {
    setRecentLoading(true)
    try {
      const { data } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5)
      if (data) setRecentExpenses(data)
    } catch {
      // silently fail — recent list is non-critical
    } finally {
      setRecentLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const lastPaymentMethod = form.payment_method

    const { error } = await supabase.from('expenses').insert({
      description: form.description || null,
      merchant: form.merchant || null,
      amount: parseFloat(form.amount),
      date: form.date,
      payment_method: form.payment_method || null,
      category: form.category || null,
      notes: form.notes || null,
    })

    setSubmitting(false)

    if (error) {
      toast.error('Failed to save expense')
      return
    }

    toast.success('Expense added!')
    setForm(defaultForm(lastPaymentMethod))
    fetchRecent()
    setTimeout(() => descriptionRef.current?.focus(), 50)
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-800 mb-5">Quick Add Expense</h1>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <input
            ref={descriptionRef}
            autoFocus
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="What was this for?"
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Merchant / Store</label>
          <input
            type="text"
            value={form.merchant}
            onChange={(e) => setForm({ ...form, merchant: e.target.value })}
            placeholder="Where did you spend?"
            className={inputCls}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Amount <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
              <input
                required
                type="number"
                min="0"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                placeholder="0.00"
                className={`${inputCls} pl-7`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Date <span className="text-red-400">*</span>
            </label>
            <input
              required
              type="date"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              className={inputCls}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
          <select
            value={form.payment_method}
            onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
            className={inputCls}
          >
            <option value="">Select...</option>
            {dbPaymentMethods.length > 0 && (
              <optgroup label="Cards">
                {dbPaymentMethods.map((m) => (
                  <option key={m.id} value={m.nickname}>{m.nickname}</option>
                ))}
              </optgroup>
            )}
            <optgroup label={dbPaymentMethods.length > 0 ? 'Other' : ''}>
              {STATIC_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <CategoryPicker
            value={form.category}
            onChange={(v) => setForm({ ...form, category: v })}
            categories={categories}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Notes{' '}
            <span className="text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any extra details..."
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors text-base shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : '+ Add Expense'}
        </button>
      </form>

      <div className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Recent Expenses
          </h2>
          <span className="text-xs text-slate-400">
            Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-slate-500 font-mono">/</kbd> to quick-add
          </span>
        </div>
        <div className="space-y-2">
          {recentLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3">
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="h-3 bg-slate-200 animate-pulse rounded w-40" />
                  <div className="h-2.5 bg-slate-200 animate-pulse rounded w-28" />
                </div>
                <div className="h-3.5 bg-slate-200 animate-pulse rounded w-14 ml-4 shrink-0" />
              </div>
            ))
          ) : recentExpenses.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 px-4 py-6 text-center">
              <p className="text-sm text-slate-400">No expenses yet — add your first one above!</p>
            </div>
          ) : (
            recentExpenses.map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate">
                    {expense.description || expense.merchant || 'Unnamed expense'}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatDate(expense.date)}
                    {expense.category && ` · ${expense.category}`}
                    {expense.payment_method && ` · ${expense.payment_method}`}
                  </p>
                </div>
                <span className="ml-4 text-sm font-semibold text-slate-800 shrink-0">
                  ${Number(expense.amount).toFixed(2)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
