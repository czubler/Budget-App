'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Bone } from '@/components/Skeleton'

const FIXED = ['Rent', 'Gas Bill', 'Electricity', 'Wifi', 'Water', 'Car Insurance', 'Subscriptions', 'Transit']
const VARIABLE = ['Groceries', 'Social', 'Home', 'Clothing', 'Dining', 'Entertainment', 'Other']
const ALL = [...FIXED, ...VARIABLE]

type ConnStatus = 'checking' | 'ok' | 'error'

const inputCls =
  'w-28 pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-right bg-white'

function CategoryRow({
  cat,
  value,
  disabled,
  onChange,
}: {
  cat: string
  value: string
  disabled: boolean
  onChange: (v: string) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <label className="text-sm text-slate-700 min-w-0 truncate flex-1" htmlFor={`t-${cat}`}>
        {cat}
      </label>
      <div className="relative shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
        <input
          id={`t-${cat}`}
          type="number"
          min="0"
          step="0.01"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={inputCls}
        />
      </div>
    </div>
  )
}

export default function SettingsPage() {
  const [targets, setTargets] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connStatus, setConnStatus] = useState<ConnStatus>('checking')
  const [stats, setStats] = useState<{ expenses: number; income: number } | null>(null)
  const [testing, setTesting] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    setConnStatus('checking')
    setTesting(true)
    try {
      const [
        { data: targetData, error: tErr },
        { count: expCount, error: eErr },
        { count: incCount, error: iErr },
      ] = await Promise.all([
        supabase.from('budget_targets').select('*'),
        supabase.from('expenses').select('*', { count: 'exact', head: true }),
        supabase.from('income').select('*', { count: 'exact', head: true }),
      ])

      if (tErr || eErr || iErr) throw new Error('Query failed')

      const init: Record<string, string> = {}
      ALL.forEach((cat) => {
        const found = targetData?.find((t) => t.category === cat)
        init[cat] = found?.monthly_target != null ? String(found.monthly_target) : '0'
      })
      setTargets(init)
      setStats({ expenses: expCount ?? 0, income: incCount ?? 0 })
      setConnStatus('ok')
    } catch {
      setConnStatus('error')
    } finally {
      setLoading(false)
      setTesting(false)
    }
  }

  async function saveAll() {
    setSaving(true)
    const rows = ALL.map((cat) => ({
      category: cat,
      monthly_target: parseFloat(targets[cat] || '0') || 0,
      is_recurring: FIXED.includes(cat),
    }))
    const { error } = await supabase.from('budget_targets').upsert(rows, { onConflict: 'category' })
    setSaving(false)
    if (error) { toast.error('Failed to save targets'); return }
    toast.success('All budget targets saved!')
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-slate-800">Settings</h1>

      {/* ── Connection Status ────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Supabase Connection
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-700 mb-0.5">Project URL</p>
              <p className="text-xs text-slate-400 font-mono break-all">
                {supabaseUrl || <span className="text-red-400">NEXT_PUBLIC_SUPABASE_URL not set</span>}
              </p>
            </div>
            <span
              className={`shrink-0 flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                connStatus === 'ok' ? 'bg-emerald-50 text-emerald-700' :
                connStatus === 'error' ? 'bg-red-50 text-red-600' :
                'bg-slate-100 text-slate-500'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  connStatus === 'ok' ? 'bg-emerald-500' :
                  connStatus === 'error' ? 'bg-red-500 animate-pulse' :
                  'bg-slate-400 animate-pulse'
                }`}
              />
              {connStatus === 'ok' ? 'Connected' : connStatus === 'error' ? 'Error' : 'Checking…'}
            </span>
          </div>

          {/* Stats */}
          {loading ? (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((i) => (
                <div key={i} className="bg-slate-50 rounded-lg px-4 py-3">
                  <Bone className="h-2.5 w-20 mb-2" />
                  <Bone className="h-6 w-12" />
                </div>
              ))}
            </div>
          ) : stats ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Expenses logged</p>
                <p className="text-xl font-bold text-slate-800">{stats.expenses.toLocaleString()}</p>
              </div>
              <div className="bg-slate-50 rounded-lg px-4 py-3">
                <p className="text-xs text-slate-400 mb-0.5">Income entries</p>
                <p className="text-xl font-bold text-slate-800">{stats.income.toLocaleString()}</p>
              </div>
            </div>
          ) : null}

          <button
            onClick={init}
            disabled={testing}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium disabled:opacity-50 transition-colors"
          >
            {testing ? '↺ Testing…' : '↺ Test connection'}
          </button>
        </div>
      </section>

      {/* ── Budget Targets ───────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Monthly Budget Targets
          </h2>
          <button
            onClick={saveAll}
            disabled={saving || loading}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {saving ? 'Saving…' : 'Save All'}
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {/* Fixed */}
          <div className="p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Fixed / Recurring
            </h3>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIXED.map((cat) => (
                  <div key={cat} className="flex items-center justify-between gap-3">
                    <Bone className="h-3.5 flex-1" />
                    <Bone className="h-8 w-28 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {FIXED.map((cat) => (
                  <CategoryRow
                    key={cat}
                    cat={cat}
                    value={targets[cat] ?? '0'}
                    disabled={saving}
                    onChange={(v) => setTargets((p) => ({ ...p, [cat]: v }))}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Variable */}
          <div className="p-5">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
              Variable / Daily
            </h3>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VARIABLE.map((cat) => (
                  <div key={cat} className="flex items-center justify-between gap-3">
                    <Bone className="h-3.5 flex-1" />
                    <Bone className="h-8 w-28 shrink-0" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VARIABLE.map((cat) => (
                  <CategoryRow
                    key={cat}
                    cat={cat}
                    value={targets[cat] ?? '0'}
                    disabled={saving}
                    onChange={(v) => setTargets((p) => ({ ...p, [cat]: v }))}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400 mt-2 px-1">
          These targets also appear as inline-editable cells on the Budget Overview page.
        </p>
      </section>
    </div>
  )
}
