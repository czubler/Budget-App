'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Expense } from '@/lib/types'
import { useCategories } from '@/lib/useCategories'
import { usePaymentMethods } from '@/lib/usePaymentMethods'
import { CategoryPicker } from '@/components/CategoryPicker'
import { toDateStr, nextOccurrenceAfter } from '@/lib/recurringUtils'

const STATIC_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Venmo', 'Zelle', 'Check', 'Other']

const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

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

type RecurringFrequency = 'monthly' | 'weekly' | 'biweekly' | 'yearly'
type RecurringType = 'subscription' | 'utility'

function SegmentButton({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs font-medium bg-white">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 transition-colors ${
            value === opt.value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
          } ${i > 0 ? 'border-l border-slate-200' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function AddExpensePage() {
  const [form, setForm] = useState(defaultForm())
  const [submitting, setSubmitting] = useState(false)
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const { names: categories } = useCategories()
  const { methods: dbPaymentMethods } = usePaymentMethods()

  // recurring state — defaults to today's day/month so the picker feels pre-filled
  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringType, setRecurringType] = useState<RecurringType>('subscription')
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly')
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState(() => new Date().getDate())
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState(() => new Date().getDay())
  const [recurringMonthOfYear, setRecurringMonthOfYear] = useState(() => new Date().getMonth() + 1)

  useEffect(() => {
    fetchRecent()
    // Auto-generate any overdue recurring expenses on page load
    fetch('/api/process-recurring', { method: 'POST' })
      .then((r) => r.json())
      .then(({ count }) => {
        if (count > 0) {
          toast.success(`${count} recurring expense${count > 1 ? 's' : ''} auto-logged`)
          fetchRecent()
        }
      })
      .catch(() => {})
  }, [])

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

    if (error) {
      setSubmitting(false)
      toast.error('Failed to save expense')
      return
    }

    if (isRecurring) {
      const dom = (recurringFrequency === 'monthly' || recurringFrequency === 'yearly') ? recurringDayOfMonth : null
      const dow = (recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') ? recurringDayOfWeek : null
      const moy = recurringFrequency === 'yearly' ? recurringMonthOfYear : null

      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDate = new Date(form.date + 'T00:00:00')
      const nextDue = nextOccurrenceAfter(today, recurringFrequency, dom, dow, moy, startDate)

      const { error: recErr } = await supabase.from('recurring_expenses').insert({
        description: form.description || null,
        merchant: form.merchant || null,
        amount: parseFloat(form.amount),
        category: form.category || null,
        payment_method: form.payment_method || null,
        notes: form.notes || null,
        type: recurringType,
        frequency: recurringFrequency,
        day_of_month: dom,
        day_of_week: dow,
        month_of_year: moy,
        start_date: form.date,
        next_due_date: toDateStr(nextDue),
        is_active: true,
      })

      if (recErr) {
        toast.error('Expense saved, but failed to create recurring schedule')
      } else {
        toast.success('Recurring expense set up!')
      }
      setIsRecurring(false)
    } else {
      toast.success('Expense added!')
    }

    setSubmitting(false)
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

        {/* ── Recurring toggle ────────────────────────────────────────────── */}
        <div className="pt-1 border-t border-slate-100">
          <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
            <input
              type="checkbox"
              checked={isRecurring}
              onChange={(e) => setIsRecurring(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 accent-indigo-600"
            />
            <span className="text-sm font-medium text-slate-700">Recurring expense</span>
          </label>
        </div>

        {isRecurring && (
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-4 space-y-3.5">

            {/* Type */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Type</span>
              <SegmentButton
                value={recurringType}
                onChange={(v) => setRecurringType(v as RecurringType)}
                options={[
                  { label: 'Subscription', value: 'subscription' },
                  { label: 'Utility', value: 'utility' },
                ]}
              />
            </div>

            {/* Frequency */}
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Repeats</span>
              <SegmentButton
                value={recurringFrequency}
                onChange={(v) => setRecurringFrequency(v as RecurringFrequency)}
                options={[
                  { label: 'Monthly', value: 'monthly' },
                  { label: 'Weekly', value: 'weekly' },
                  { label: 'Bi-weekly', value: 'biweekly' },
                  { label: 'Yearly', value: 'yearly' },
                ]}
              />
            </div>

            {/* Day of month */}
            {recurringFrequency === 'monthly' && (
              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Day</span>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>Every</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={recurringDayOfMonth}
                    onChange={(e) =>
                      setRecurringDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))
                    }
                    className="w-14 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                  />
                  <span>of the month</span>
                </div>
              </div>
            )}

            {/* Day of week (weekly / biweekly) */}
            {(recurringFrequency === 'weekly' || recurringFrequency === 'biweekly') && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Day</span>
                <div className="flex gap-1">
                  {DAYS_SHORT.map((day, i) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => setRecurringDayOfWeek(i)}
                      className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                        recurringDayOfWeek === i
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-300'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Month + day (yearly) */}
            {recurringFrequency === 'yearly' && (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="text-xs font-medium text-slate-500 w-16 shrink-0">Date</span>
                <div className="flex items-center gap-2">
                  <select
                    value={recurringMonthOfYear}
                    onChange={(e) => setRecurringMonthOfYear(parseInt(e.target.value))}
                    className="px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {MONTHS_SHORT.map((m, i) => (
                      <option key={m} value={i + 1}>{m}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={recurringDayOfMonth}
                    onChange={(e) =>
                      setRecurringDayOfMonth(Math.min(31, Math.max(1, parseInt(e.target.value) || 1)))
                    }
                    className="w-14 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                  />
                </div>
              </div>
            )}

            <p className="text-xs text-slate-400">
              Today&apos;s expense is logged immediately. Future occurrences are auto-generated when you open the app.
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors text-base shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : isRecurring ? '+ Add Recurring Expense' : '+ Add Expense'}
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
