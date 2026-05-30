'use client'

import dynamic from 'next/dynamic'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { BudgetTarget } from '@/lib/types'
import type { CategoryAmount, MonthTrend } from './BudgetCharts'

const BudgetCharts = dynamic(() => import('./BudgetCharts'), { ssr: false })

// ─── constants ────────────────────────────────────────────────────────────────

const FIXED_CATEGORIES = ['Rent', 'Gas Bill', 'Electricity', 'Wifi', 'Water', 'Car Insurance', 'Subscriptions', 'Transit']
const VARIABLE_CATEGORIES = ['Groceries', 'Social', 'Home', 'Clothing', 'Dining', 'Entertainment', 'Other']
const ALL_CATEGORIES = [...FIXED_CATEGORIES, ...VARIABLE_CATEGORIES]

// ─── helpers ──────────────────────────────────────────────────────────────────

function currentMonthRange() {
  const now = new Date()
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const label = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return { first, last, label }
}

function last6MonthRanges() {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    const y = d.getFullYear()
    const m = d.getMonth() + 1
    const first = `${y}-${String(m).padStart(2, '0')}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    return { first, last, label: `${MONTH_NAMES[m - 1]} '${String(y).slice(2)}` }
  })
}

function usd(n: number, opts?: { sign?: boolean }) {
  const s = n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (opts?.sign && n > 0) return `+$${s}`
  if (n < 0) return `-$${Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  return `$${s}`
}

function progressColor(actual: number, budget: number) {
  if (budget === 0) return 'bg-slate-300'
  const pct = actual / budget
  if (pct >= 1) return 'bg-red-500'
  if (pct >= 0.8) return 'bg-amber-400'
  return 'bg-emerald-500'
}

// ─── sub-components ───────────────────────────────────────────────────────────

function BannerCard({
  emoji, label, value, sub, highlight,
}: {
  emoji: string; label: string; value: string; sub?: string; highlight?: 'green' | 'red'
}) {
  const valueColor =
    highlight === 'green' ? 'text-emerald-600' :
    highlight === 'red' ? 'text-red-500' :
    'text-slate-800'
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 flex flex-col gap-1">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{emoji} {label}</p>
      <p className={`text-2xl font-bold tracking-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-xs text-slate-400">{sub}</p>}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{children}</h2>
  )
}

// ─── inline edit cell ─────────────────────────────────────────────────────────

function BudgetCell({
  category,
  currentValue,
  onSave,
}: {
  category: string
  currentValue: number
  onSave: (category: string, value: number) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function startEdit() {
    setDraft(currentValue > 0 ? String(currentValue) : '')
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 30)
  }

  async function commit() {
    const val = parseFloat(draft)
    if (isNaN(val) || val < 0) { setEditing(false); return }
    setSaving(true)
    await onSave(category, val)
    setSaving(false)
    setEditing(false)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter') commit()
    if (e.key === 'Escape') setEditing(false)
  }

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[110px]">
        <span className="text-slate-400 text-xs">$</span>
        <input
          ref={inputRef}
          autoFocus
          type="number"
          min="0"
          step="0.01"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={commit}
          className="w-20 px-1.5 py-0.5 border border-indigo-400 rounded text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
          disabled={saving}
        />
        <button
          onMouseDown={(e) => { e.preventDefault(); commit() }}
          className="text-emerald-600 hover:text-emerald-700 text-sm leading-none"
          title="Save"
        >✓</button>
        <button
          onMouseDown={(e) => { e.preventDefault(); setEditing(false) }}
          className="text-slate-400 hover:text-slate-600 text-sm leading-none"
          title="Cancel"
        >✕</button>
      </div>
    )
  }

  return (
    <button
      onClick={startEdit}
      className="group flex items-center gap-1 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
      title="Click to edit"
    >
      {currentValue > 0 ? usd(currentValue) : <span className="text-slate-400">Set target</span>}
      <span className="opacity-0 group-hover:opacity-100 text-xs text-slate-400 transition-opacity">✏</span>
    </button>
  )
}

// ─── budget table section ─────────────────────────────────────────────────────

function BudgetTableSection({
  title,
  categories,
  targets,
  expensesByCategory,
  onSaveTarget,
}: {
  title: string
  categories: string[]
  targets: BudgetTarget[]
  expensesByCategory: Record<string, number>
  onSaveTarget: (category: string, value: number) => Promise<void>
}) {
  const rows = categories.map((cat) => {
    const target = targets.find((t) => t.category === cat)
    const budget = Number(target?.monthly_target ?? 0)
    const actual = expensesByCategory[cat] ?? 0
    const diff = budget - actual
    const pct = budget > 0 ? (actual / budget) * 100 : null
    return { cat, budget, actual, diff, pct }
  })

  const sectionBudget = rows.reduce((s, r) => s + r.budget, 0)
  const sectionActual = rows.reduce((s, r) => s + r.actual, 0)

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h3>
        <span className="text-xs text-slate-400">
          {usd(sectionActual)} / {sectionBudget > 0 ? usd(sectionBudget) : 'no targets set'}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Monthly Target</th>
              <th className="py-2 px-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actual</th>
              <th className="py-2 px-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Remaining</th>
              <th className="py-2 px-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider min-w-[130px]">% Used</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map(({ cat, budget, actual, diff, pct }) => (
              <tr key={cat} className="hover:bg-slate-50 transition-colors">
                <td className="py-2.5 px-3 font-medium text-slate-800 whitespace-nowrap">{cat}</td>
                <td className="py-2.5 px-3">
                  <BudgetCell category={cat} currentValue={budget} onSave={onSaveTarget} />
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap font-medium text-slate-700">
                  {actual > 0 ? usd(actual) : <span className="text-slate-400">—</span>}
                </td>
                <td className="py-2.5 px-3 text-right whitespace-nowrap">
                  {budget > 0 ? (
                    <span className={diff >= 0 ? 'text-emerald-600 font-medium' : 'text-red-500 font-medium'}>
                      {diff >= 0 ? usd(diff) : `-${usd(Math.abs(diff))}`}
                    </span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${progressColor(actual, budget)}`}
                        style={{ width: budget > 0 ? `${Math.min((actual / budget) * 100, 100)}%` : '0%' }}
                      />
                    </div>
                    <span className={`text-xs font-medium w-10 text-right shrink-0 ${
                      pct === null ? 'text-slate-400' :
                      pct >= 100 ? 'text-red-500' :
                      pct >= 80 ? 'text-amber-500' : 'text-emerald-600'
                    }`}>
                      {pct !== null ? `${Math.round(pct)}%` : '—'}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function BudgetPage() {
  const [monthIncome, setMonthIncome] = useState(0)
  const [monthExpenses, setMonthExpenses] = useState(0)
  const [expensesByCategory, setExpensesByCategory] = useState<Record<string, number>>({})
  const [fixedExpenses, setFixedExpenses] = useState(0)
  const [variableExpenses, setVariableExpenses] = useState(0)
  const [budgetTargets, setBudgetTargets] = useState<BudgetTarget[]>([])
  const [trendData, setTrendData] = useState<MonthTrend[]>([])
  const [categoryData, setCategoryData] = useState<CategoryAmount[]>([])
  const [monthLabel, setMonthLabel] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setMonthLabel(currentMonthRange().label)
    fetchAll()
  }, [])

  async function fetchAll() {
    setLoading(true)
    const { first: mStart, last: mEnd } = currentMonthRange()
    const months = last6MonthRanges()
    const sixStart = months[0].first

    const [
      { data: incomeMonth },
      { data: expMonth },
      { data: income6mo },
      { data: exp6mo },
      { data: targets },
    ] = await Promise.all([
      supabase.from('income').select('net_amount').gte('paycheck_date', mStart).lte('paycheck_date', mEnd),
      supabase.from('expenses').select('amount, category').gte('date', mStart).lte('date', mEnd),
      supabase.from('income').select('net_amount, paycheck_date').gte('paycheck_date', sixStart),
      supabase.from('expenses').select('amount, date').gte('date', sixStart),
      supabase.from('budget_targets').select('*'),
    ])

    // Current month totals
    const netIncome = incomeMonth?.reduce((s, r) => s + Number(r.net_amount ?? 0), 0) ?? 0
    const totalExp = expMonth?.reduce((s, r) => s + Number(r.amount), 0) ?? 0

    // Expenses by category
    const byCat: Record<string, number> = {}
    expMonth?.forEach((e) => {
      const cat = e.category || 'Other'
      byCat[cat] = (byCat[cat] ?? 0) + Number(e.amount)
    })

    const fixedTotal = FIXED_CATEGORIES.reduce((s, c) => s + (byCat[c] ?? 0), 0)
    const variableTotal = VARIABLE_CATEGORIES.reduce((s, c) => s + (byCat[c] ?? 0), 0)

    // Category chart data (all known categories, filter zeros in chart)
    const catChartData = ALL_CATEGORIES
      .map((c) => ({ category: c, amount: byCat[c] ?? 0 }))
      .filter((d) => d.amount > 0)

    // 6-month trend
    const trend = months.map(({ first, last, label }) => {
      const inc = income6mo
        ?.filter((r) => r.paycheck_date >= first && r.paycheck_date <= last)
        .reduce((s, r) => s + Number(r.net_amount ?? 0), 0) ?? 0
      const exp = exp6mo
        ?.filter((r) => r.date >= first && r.date <= last)
        .reduce((s, r) => s + Number(r.amount), 0) ?? 0
      return { month: label, income: inc, expenses: exp }
    })

    setMonthIncome(netIncome)
    setMonthExpenses(totalExp)
    setExpensesByCategory(byCat)
    setFixedExpenses(fixedTotal)
    setVariableExpenses(variableTotal)
    setBudgetTargets(targets ?? [])
    setCategoryData(catChartData)
    setTrendData(trend)
    setLoading(false)
  }

  async function handleSaveTarget(category: string, value: number) {
    const { error } = await supabase
      .from('budget_targets')
      .upsert(
        { category, monthly_target: value, is_recurring: FIXED_CATEGORIES.includes(category) },
        { onConflict: 'category' }
      )
    if (error) { toast.error('Failed to save target'); return }
    setBudgetTargets((prev) => {
      const exists = prev.some((t) => t.category === category)
      if (exists) return prev.map((t) => t.category === category ? { ...t, monthly_target: value } : t)
      return [...prev, { id: '', category, monthly_target: value, is_recurring: FIXED_CATEGORIES.includes(category) }]
    })
    toast.success(`${category} target saved`)
  }

  const net = monthIncome - monthExpenses
  const netPositive = net >= 0
  const savings = 0
  const personalSpending = monthIncome - fixedExpenses - variableExpenses - savings

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-slate-800">Budget Overview</h1>

      {/* ── Section 1: Monthly Summary ─────────────────────────────────────── */}
      <div>
        <SectionHeading>{monthLabel}</SectionHeading>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
          <BannerCard
            emoji="💰"
            label="Net Income"
            value={loading ? '—' : usd(monthIncome)}
            sub="from income table"
          />
          <BannerCard
            emoji="💸"
            label="Expenses"
            value={loading ? '—' : usd(monthExpenses)}
            sub="all categories"
          />
          <BannerCard
            emoji="🏦"
            label="Net"
            value={loading ? '—' : (netPositive ? `+${usd(net)}` : `-${usd(Math.abs(net))}`)}
            sub="income − expenses"
            highlight={loading ? undefined : netPositive ? 'green' : 'red'}
          />
        </div>

        {/* Formula bar */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-3.5">
          <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">Monthly spending breakdown</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-semibold text-emerald-600">{usd(monthIncome)}</span>
            <span className="text-slate-400">income</span>

            <span className="text-slate-300 mx-1">−</span>

            <span className="font-semibold text-slate-700">{usd(fixedExpenses)}</span>
            <span className="text-slate-400">fixed</span>

            <span className="text-slate-300 mx-1">−</span>

            <span className="font-semibold text-slate-700">{usd(variableExpenses)}</span>
            <span className="text-slate-400">variable</span>

            <span className="text-slate-300 mx-1">−</span>

            <span className="font-semibold text-slate-400">{usd(savings)}</span>
            <span className="text-slate-400">savings</span>

            <span className="text-slate-300 mx-1">=</span>

            <span className={`font-bold text-base ${personalSpending >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {personalSpending >= 0 ? usd(personalSpending) : `-${usd(Math.abs(personalSpending))}`}
            </span>
            <span className="text-slate-500 font-medium">spending money</span>
          </div>
        </div>
      </div>

      {/* ── Section 2: Budget vs. Actual ───────────────────────────────────── */}
      <div>
        <SectionHeading>Budget vs. Actual — {monthLabel}</SectionHeading>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-7">
          {loading ? (
            <div className="space-y-7">
              {[8, 7].map((rows, gi) => (
                <div key={gi} className={gi === 1 ? 'pt-6 border-t border-slate-100' : ''}>
                  <div className="h-3 bg-slate-200 animate-pulse rounded w-36 mb-4" />
                  {Array.from({ length: rows }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 py-2.5 border-b border-slate-100 last:border-0">
                      <div className="h-3 bg-slate-200 animate-pulse rounded w-28 flex-1" />
                      <div className="h-3 bg-slate-200 animate-pulse rounded w-16" />
                      <div className="h-3 bg-slate-200 animate-pulse rounded w-14" />
                      <div className="h-3 bg-slate-200 animate-pulse rounded w-14" />
                      <div className="h-2 bg-slate-200 animate-pulse rounded w-24" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <>
              <BudgetTableSection
                title="Fixed / Recurring"
                categories={FIXED_CATEGORIES}
                targets={budgetTargets}
                expensesByCategory={expensesByCategory}
                onSaveTarget={handleSaveTarget}
              />
              <div className="border-t border-slate-100 pt-6">
                <BudgetTableSection
                  title="Variable / Daily"
                  categories={VARIABLE_CATEGORIES}
                  targets={budgetTargets}
                  expensesByCategory={expensesByCategory}
                  onSaveTarget={handleSaveTarget}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Section 3: Charts ──────────────────────────────────────────────── */}
      <div>
        <SectionHeading>Charts</SectionHeading>
        {loading ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-10 text-center text-sm text-slate-400">
            Loading charts…
          </div>
        ) : (
          <BudgetCharts categoryData={categoryData} trendData={trendData} />
        )}
      </div>
    </div>
  )
}
