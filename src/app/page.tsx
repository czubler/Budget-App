'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Expense, OvertimeRule, IncomeSource } from '@/lib/types'
import { useCategories } from '@/lib/useCategories'
import { usePaymentMethods } from '@/lib/usePaymentMethods'
import { CategoryPicker } from '@/components/CategoryPicker'
import { toDateStr, nextOccurrenceAfter } from '@/lib/recurringUtils'

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATIC_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Venmo', 'Zelle', 'Check', 'Other']
const DAYS_SHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const inputCls =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

const dollarFieldCls =
  'w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

function DollarInput({
  value,
  onChange,
  placeholder = '0.00',
  required: req = false,
  highlighted = false,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  highlighted?: boolean
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
      <input
        type="number"
        min="0"
        step="0.01"
        required={req}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${dollarFieldCls} ${highlighted ? 'bg-indigo-50 border-indigo-200' : ''}`}
      />
    </div>
  )
}

function calcBreakdownGross(
  baseRate: string,
  breakdown: Array<{ ruleId: string; hours: string }>,
  rules: OvertimeRule[]
): number {
  const rate = parseFloat(baseRate) || 0
  return breakdown.reduce((sum, b) => {
    const rule = rules.find((r) => r.id === b.ruleId)
    const mult = rule ? Number(rule.multiplier) : 1
    const hrs = parseFloat(b.hours) || 0
    return sum + rate * mult * hrs
  }, 0)
}

function computeNet(gross: string, taxes: string): string {
  const g = parseFloat(gross) || 0
  const t = parseFloat(taxes) || 0
  return g > 0 && g - t >= 0 ? (g - t).toFixed(2) : ''
}

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

// ─── Add Expense Form ─────────────────────────────────────────────────────────

const defaultExpenseForm = (paymentMethod = '') => ({
  description: '',
  merchant: '',
  amount: '',
  date: todayString(),
  payment_method: paymentMethod,
  category: '',
  notes: '',
})

function AddExpenseForm() {
  const [form, setForm] = useState(defaultExpenseForm())
  const [submitting, setSubmitting] = useState(false)
  const [recentExpenses, setRecentExpenses] = useState<Expense[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const descriptionRef = useRef<HTMLInputElement>(null)
  const { names: categories } = useCategories()
  const { methods: dbPaymentMethods } = usePaymentMethods()

  const [isRecurring, setIsRecurring] = useState(false)
  const [recurringType, setRecurringType] = useState<RecurringType>('subscription')
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('monthly')
  const [recurringDayOfMonth, setRecurringDayOfMonth] = useState(() => new Date().getDate())
  const [recurringDayOfWeek, setRecurringDayOfWeek] = useState(() => new Date().getDay())
  const [recurringMonthOfYear, setRecurringMonthOfYear] = useState(() => new Date().getMonth() + 1)

  useEffect(() => {
    fetchRecent()
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
      // non-critical
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
    setForm(defaultExpenseForm(lastPaymentMethod))
    fetchRecent()
    setTimeout(() => descriptionRef.current?.focus(), 50)
  }

  return (
    <div>
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
            Notes <span className="text-xs font-normal text-slate-400">(optional)</span>
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Any extra details..."
            rows={2}
            className={`${inputCls} resize-none`}
          />
        </div>

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

// ─── Add Income Form (full — with overtime tier support) ─────────────────────

function AddIncomeForm() {
  const [form, setForm] = useState({
    source: '',
    income_source_id: '',
    paycheck_date: todayString(),
    hourly_rate: '',
    gross_amount: '',
    taxes_withheld: '',
    net_amount: '',
    notes: '',
  })
  const [netEdited, setNetEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [overtimeRules, setOvertimeRules] = useState<OvertimeRule[]>([])
  const [breakdown, setBreakdown] = useState<Array<{ ruleId: string; hours: string }>>([])
  const [grossLocked, setGrossLocked] = useState(false)
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([])
  const [sourcesLoaded, setSourcesLoaded] = useState(false)
  const firstFieldRef = useRef<HTMLSelectElement | HTMLInputElement | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const [rulesResult, sourcesResult] = await Promise.all([
      supabase.from('overtime_rules').select('id, label, multiplier, sort_order, created_at').order('sort_order'),
      supabase.from('income_sources').select('id, name, hourly_rate, is_default, is_active, created_at').eq('is_active', true).order('name'),
    ])
    const rules: OvertimeRule[] = (rulesResult.data ?? []).map((r) => ({
      id: r.id,
      label: r.label,
      multiplier: Number(r.multiplier),
      sort_order: r.sort_order,
      created_at: r.created_at ?? '',
    }))
    setOvertimeRules(rules)
    setBreakdown(rules.map((r) => ({ ruleId: r.id, hours: '' })))

    const sources: IncomeSource[] = (sourcesResult.data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      hourly_rate: s.hourly_rate != null ? Number(s.hourly_rate) : null,
      is_default: s.is_default,
      is_active: s.is_active,
      created_at: s.created_at ?? '',
    }))
    setIncomeSources(sources)
    setSourcesLoaded(true)

    const defaultSource = sources.find((s) => s.is_default)
    if (defaultSource) {
      setForm((f) => ({
        ...f,
        income_source_id: defaultSource.id,
        source: defaultSource.name,
        hourly_rate: defaultSource.hourly_rate != null ? String(defaultSource.hourly_rate) : '',
      }))
    }
  }

  function handleRateChange(v: string) {
    const gross = calcBreakdownGross(v, breakdown, overtimeRules)
    setForm((f) => {
      const newGross = !grossLocked && gross > 0 ? gross.toFixed(2) : grossLocked ? f.gross_amount : ''
      return {
        ...f,
        hourly_rate: v,
        gross_amount: newGross,
        net_amount: !netEdited ? computeNet(newGross, f.taxes_withheld) : f.net_amount,
      }
    })
  }

  function handleBreakdownChange(ruleId: string, hours: string) {
    const newBreakdown = breakdown.map((b) => (b.ruleId === ruleId ? { ...b, hours } : b))
    setBreakdown(newBreakdown)
    if (!grossLocked) {
      const gross = calcBreakdownGross(form.hourly_rate, newBreakdown, overtimeRules)
      setForm((f) => {
        const newGross = gross > 0 ? gross.toFixed(2) : ''
        return {
          ...f,
          gross_amount: newGross,
          net_amount: !netEdited ? computeNet(newGross, f.taxes_withheld) : f.net_amount,
        }
      })
    }
  }

  function handleGrossManual(v: string) {
    setGrossLocked(true)
    setForm((f) => ({ ...f, gross_amount: v, net_amount: !netEdited ? computeNet(v, f.taxes_withheld) : f.net_amount }))
  }

  function handleTaxesChange(v: string) {
    setForm((f) => ({ ...f, taxes_withheld: v, net_amount: !netEdited ? computeNet(f.gross_amount, v) : f.net_amount }))
  }

  function handleNetChange(v: string) {
    setNetEdited(true)
    setForm((f) => ({ ...f, net_amount: v }))
  }

  function unlockGross() {
    setGrossLocked(false)
    const gross = calcBreakdownGross(form.hourly_rate, breakdown, overtimeRules)
    setForm((f) => ({ ...f, gross_amount: gross > 0 ? gross.toFixed(2) : '' }))
  }

  function handleSourceSelect(sourceId: string) {
    const source = incomeSources.find((s) => s.id === sourceId)
    if (!source) {
      setForm((f) => ({ ...f, income_source_id: '', source: '' }))
      return
    }
    const rate = source.hourly_rate != null ? String(source.hourly_rate) : ''
    const gross = rate ? calcBreakdownGross(rate, breakdown, overtimeRules) : 0
    setForm((f) => ({
      ...f,
      income_source_id: source.id,
      source: source.name,
      hourly_rate: rate,
      gross_amount: !grossLocked && gross > 0 ? gross.toFixed(2) : f.gross_amount,
      net_amount: !netEdited ? computeNet(!grossLocked && gross > 0 ? gross.toFixed(2) : f.gross_amount, f.taxes_withheld) : f.net_amount,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const filledBreakdown = breakdown.filter((b) => parseFloat(b.hours) > 0)
    const totalHours = filledBreakdown.reduce((sum, b) => sum + (parseFloat(b.hours) || 0), 0)
    const { data: incomeData, error } = await supabase
      .from('income')
      .insert({
        source: form.source,
        income_source_id: form.income_source_id || null,
        paycheck_date: form.paycheck_date,
        hours_worked: totalHours > 0 ? totalHours : null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        gross_amount: parseFloat(form.gross_amount),
        taxes_withheld: form.taxes_withheld ? parseFloat(form.taxes_withheld) : null,
        net_amount: form.net_amount ? parseFloat(form.net_amount) : null,
        notes: form.notes || null,
      })
      .select()
      .single()
    if (error) { toast.error('Failed to save income'); setSubmitting(false); return }

    if (filledBreakdown.length > 0 && form.hourly_rate && incomeData) {
      const baseRate = parseFloat(form.hourly_rate)
      const rows = filledBreakdown.map((b) => {
        const rule = overtimeRules.find((r) => r.id === b.ruleId)!
        const hrs = parseFloat(b.hours)
        const mult = Number(rule.multiplier)
        return {
          income_id: incomeData.id,
          rule_id: b.ruleId,
          label: rule.label,
          multiplier: mult,
          hours_worked: hrs,
          base_rate: baseRate,
          subtotal: parseFloat((baseRate * mult * hrs).toFixed(2)),
        }
      })
      const { error: bErr } = await supabase.from('income_hours_breakdown').insert(rows)
      if (bErr) toast.error('Income saved, but breakdown failed to save')
    }

    setSubmitting(false)
    toast.success('Income logged!')
    const defaultSource = incomeSources.find((s) => s.is_default)
    setForm({
      source: defaultSource?.name ?? '',
      income_source_id: defaultSource?.id ?? '',
      paycheck_date: todayString(),
      hourly_rate: defaultSource?.hourly_rate != null ? String(defaultSource.hourly_rate) : '',
      gross_amount: '',
      taxes_withheld: '',
      net_amount: '',
      notes: '',
    })
    setNetEdited(false)
    setGrossLocked(false)
    setBreakdown(overtimeRules.map((r) => ({ ruleId: r.id, hours: '' })))
  }

  const showBreakdownTable = overtimeRules.length > 0 && !!form.hourly_rate

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Source <span className="text-red-400">*</span>
        </label>
        {sourcesLoaded && incomeSources.length > 0 ? (
          <select
            ref={firstFieldRef as React.RefObject<HTMLSelectElement>}
            required
            value={form.income_source_id}
            onChange={(e) => handleSourceSelect(e.target.value)}
            className={inputCls}
          >
            <option value="">Select a source…</option>
            {incomeSources.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        ) : (
          <input
            ref={firstFieldRef as React.RefObject<HTMLInputElement>}
            required
            type="text"
            value={form.source}
            onChange={(e) => setForm({ ...form, source: e.target.value })}
            placeholder="Main Job, Freelance, Side Project…"
            className={inputCls}
          />
        )}
        {sourcesLoaded && incomeSources.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">
            No sources yet.{' '}
            <Link href="/settings" className="underline hover:text-slate-600">Add sources in Settings.</Link>
          </p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Paycheck Date <span className="text-red-400">*</span>
        </label>
        <input
          required
          type="date"
          value={form.paycheck_date}
          onChange={(e) => setForm({ ...form, paycheck_date: e.target.value })}
          className={inputCls}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate</label>
        <DollarInput
          value={form.hourly_rate}
          onChange={handleRateChange}
          placeholder="Optional — enter to use breakdown table"
        />
      </div>

      {showBreakdownTable && (
        <div className="rounded-lg border border-indigo-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-indigo-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-semibold text-indigo-600">Tier</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-indigo-600">Effective Rate</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-indigo-600">Hours</th>
                <th className="px-3 py-2 text-right text-xs font-semibold text-indigo-600">Subtotal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-indigo-50">
              {breakdown.map((b) => {
                const rule = overtimeRules.find((r) => r.id === b.ruleId)
                const mult = rule ? Number(rule.multiplier) : 1
                const effectiveRate = (parseFloat(form.hourly_rate) || 0) * mult
                const hrs = parseFloat(b.hours) || 0
                const subtotal = effectiveRate * hrs
                return (
                  <tr key={b.ruleId} className="bg-white">
                    <td className="px-3 py-2 text-slate-700 font-medium">{rule?.label}</td>
                    <td className="px-3 py-2 text-right text-slate-500 text-xs whitespace-nowrap">
                      ${effectiveRate.toFixed(2)}/hr
                    </td>
                    <td className="px-3 py-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={b.hours}
                        onChange={(e) => handleBreakdownChange(b.ruleId, e.target.value)}
                        placeholder="0"
                        className="w-20 px-2 py-1 border border-slate-300 rounded text-sm text-right focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-700 whitespace-nowrap">
                      {subtotal > 0 ? `$${subtotal.toFixed(2)}` : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-indigo-50">
                <td colSpan={3} className="px-3 py-2 text-right text-xs font-semibold text-indigo-600">Total</td>
                <td className="px-3 py-2 text-right font-bold text-indigo-700">
                  ${calcBreakdownGross(form.hourly_rate, breakdown, overtimeRules).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-sm font-medium text-slate-700">
            Gross Amount <span className="text-red-400">*</span>
          </label>
          {grossLocked && showBreakdownTable && (
            <button
              type="button"
              onClick={unlockGross}
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium transition-colors"
            >
              ↺ Use breakdown total
            </button>
          )}
          {!grossLocked && showBreakdownTable && form.gross_amount && (
            <span className="text-xs text-indigo-400">auto-calculated</span>
          )}
        </div>
        <DollarInput
          value={form.gross_amount}
          onChange={handleGrossManual}
          required
          highlighted={!grossLocked && !!form.gross_amount && showBreakdownTable}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Taxes Withheld</label>
          <DollarInput value={form.taxes_withheld} onChange={handleTaxesChange} placeholder="0.00" />
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <label className="text-sm font-medium text-slate-700">Net Amount</label>
            {!netEdited && form.net_amount && (
              <span className="text-xs font-normal text-indigo-500">auto-calculated</span>
            )}
          </div>
          <DollarInput
            value={form.net_amount}
            onChange={handleNetChange}
            highlighted={!netEdited && !!form.net_amount}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Notes <span className="text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Any extra details…"
          className={`${inputCls} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors text-base shadow-sm cursor-pointer disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : '+ Log Income'}
      </button>
    </form>
  )
}

// ─── Add Savings Form (condensed) ─────────────────────────────────────────────

function AddSavingsForm() {
  const [targetType, setTargetType] = useState<'account' | 'goal'>('account')
  const [accounts, setAccounts] = useState<{ id: string; name: string }[]>([])
  const [goals, setGoals] = useState<{ id: string; name: string }[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayString())
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const amtRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    async function load() {
      const [{ data: accts }, { data: gls }] = await Promise.all([
        supabase.from('savings_accounts').select('id, name').eq('is_active', true).order('name'),
        supabase.from('savings_goals').select('id, name').eq('is_archived', false).order('name'),
      ])
      if (accts) setAccounts(accts)
      if (gls) setGoals(gls)
    }
    load()
    amtRef.current?.focus()
  }, [])

  useEffect(() => { setSelectedId('') }, [targetType])

  const options = targetType === 'account' ? accounts : goals

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    if (!selectedId) { toast.error(`Select a${targetType === 'account' ? 'n account' : ' goal'}`); return }
    setSubmitting(true)

    const table = targetType === 'account' ? 'savings_contributions' : 'savings_goal_contributions'
    const fkKey = targetType === 'account' ? 'account_id' : 'goal_id'

    const { error } = await supabase.from(table).insert({
      [fkKey]: selectedId,
      amount: amt,
      date,
      notes: notes.trim() || null,
    })

    setSubmitting(false)
    if (error) { toast.error('Failed to save'); return }
    const targetName = options.find((o) => o.id === selectedId)?.name ?? ''
    toast.success(`Contribution added${targetName ? ` to ${targetName}` : ''}`)
    setAmount('')
    setNotes('')
    setTimeout(() => amtRef.current?.focus(), 50)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">Contribute to</label>
        <div className="flex rounded-md border border-slate-200 overflow-hidden text-sm font-medium bg-white w-fit">
          {(['account', 'goal'] as const).map((t, i) => (
            <button
              key={t}
              type="button"
              onClick={() => setTargetType(t)}
              className={`px-4 py-2 transition-colors ${
                targetType === t ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'
              } ${i > 0 ? 'border-l border-slate-200' : ''}`}
            >
              {t === 'account' ? 'Account' : 'Goal'}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {targetType === 'account' ? 'Account' : 'Goal'} <span className="text-red-400">*</span>
        </label>
        <select
          required
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={inputCls}
        >
          <option value="">Select {targetType === 'account' ? 'an account' : 'a goal'}…</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        {options.length === 0 && (
          <p className="text-xs text-slate-400 mt-1">
            No {targetType}s yet.{' '}
            <Link href="/settings" className="underline hover:text-slate-600">Add one in Settings.</Link>
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Amount <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
            <input
              ref={amtRef}
              required
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
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
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Notes <span className="text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any extra details..."
          rows={2}
          className={`${inputCls} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-lg transition-colors text-base shadow-sm cursor-pointer disabled:cursor-not-allowed"
      >
        {submitting ? 'Saving…' : '+ Log Contribution'}
      </button>
    </form>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────

function AddPageContent() {
  const searchParams = useSearchParams()
  const tab = searchParams.get('tab') ?? 'expense'

  return (
    <div>
      {tab === 'expense' && <AddExpenseForm />}
      {tab === 'income' && <AddIncomeForm />}
      {tab === 'savings' && <AddSavingsForm />}
    </div>
  )
}

export default function AddPage() {
  return (
    <Suspense>
      <AddPageContent />
    </Suspense>
  )
}
