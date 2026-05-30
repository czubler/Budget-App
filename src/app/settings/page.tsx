'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Bone } from '@/components/Skeleton'

type ConnStatus = 'checking' | 'ok' | 'error'
type CatRow = { category: string; monthly_target: string; is_recurring: boolean }

const targetInputCls =
  'w-28 pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-right bg-white'

function RecurringToggle({
  value,
  onChange,
  disabled,
}: {
  value: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs font-medium shrink-0">
      <button
        type="button"
        onClick={() => onChange(true)}
        disabled={disabled}
        className={`px-2.5 py-1 transition-colors ${value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        Fixed
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        disabled={disabled}
        className={`px-2.5 py-1 border-l border-slate-200 transition-colors ${!value ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
      >
        Variable
      </button>
    </div>
  )
}

function CategoryRowItem({
  row,
  disabled,
  deleteConfirm,
  onTargetChange,
  onToggle,
  onDeleteConfirm,
  onDeleteCancel,
  onDelete,
}: {
  row: CatRow
  disabled: boolean
  deleteConfirm: boolean
  onTargetChange: (v: string) => void
  onToggle: (v: boolean) => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{row.category}</span>

      <RecurringToggle value={row.is_recurring} onChange={onToggle} disabled={disabled} />

      <div className="relative shrink-0">
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
        <input
          type="number"
          min="0"
          step="0.01"
          value={row.monthly_target}
          onChange={(e) => onTargetChange(e.target.value)}
          disabled={disabled}
          className={targetInputCls}
        />
      </div>

      {deleteConfirm ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-slate-500">Delete?</span>
          <button
            onClick={onDelete}
            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
          >
            Yes
          </button>
          <button
            onClick={onDeleteCancel}
            className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium transition-colors"
          >
            No
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onDeleteConfirm}
          disabled={disabled}
          className="shrink-0 text-slate-300 hover:text-red-400 transition-colors text-lg leading-none disabled:opacity-50"
          title={`Delete ${row.category}`}
        >
          ✕
        </button>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [rows, setRows] = useState<CatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [connStatus, setConnStatus] = useState<ConnStatus>('checking')
  const [stats, setStats] = useState<{ expenses: number; income: number } | null>(null)
  const [testing, setTesting] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatFixed, setNewCatFixed] = useState(false)
  const [adding, setAdding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  useEffect(() => { init() }, [])

  const fixed = rows.filter((r) => r.is_recurring)
  const variable = rows.filter((r) => !r.is_recurring)

  async function init() {
    setConnStatus('checking')
    setTesting(true)
    try {
      const [
        { data: targetData, error: tErr },
        { count: expCount, error: eErr },
        { count: incCount, error: iErr },
      ] = await Promise.all([
        supabase
          .from('budget_targets')
          .select('*')
          .order('is_recurring', { ascending: false })
          .order('category'),
        supabase.from('expenses').select('*', { count: 'exact', head: true }),
        supabase.from('income').select('*', { count: 'exact', head: true }),
      ])

      if (tErr || eErr || iErr) throw new Error('Query failed')

      setRows(
        targetData?.map((t) => ({
          category: t.category,
          monthly_target: t.monthly_target != null ? String(t.monthly_target) : '0',
          is_recurring: t.is_recurring,
        })) ?? []
      )
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
    const upsertRows = rows.map((r) => ({
      category: r.category,
      monthly_target: parseFloat(r.monthly_target || '0') || 0,
      is_recurring: r.is_recurring,
    }))
    const { error } = await supabase
      .from('budget_targets')
      .upsert(upsertRows, { onConflict: 'category' })
    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Categories & targets saved!')
  }

  async function addCategory() {
    const name = newCatName.trim()
    if (!name) return
    if (rows.some((r) => r.category.toLowerCase() === name.toLowerCase())) {
      toast.error('Category already exists')
      return
    }
    setAdding(true)
    const { error } = await supabase.from('budget_targets').insert({
      category: name,
      monthly_target: 0,
      is_recurring: newCatFixed,
    })
    setAdding(false)
    if (error) { toast.error('Failed to add category'); return }
    setRows((prev) => [
      ...prev,
      { category: name, monthly_target: '0', is_recurring: newCatFixed },
    ])
    setNewCatName('')
    toast.success(`"${name}" added`)
  }

  async function deleteCategory(cat: string) {
    const { error } = await supabase.from('budget_targets').delete().eq('category', cat)
    if (error) { toast.error('Failed to delete'); return }
    setRows((prev) => prev.filter((r) => r.category !== cat))
    setDeleteConfirm(null)
    toast.success(`"${cat}" removed`)
  }

  function updateTarget(cat: string, v: string) {
    setRows((prev) => prev.map((r) => (r.category === cat ? { ...r, monthly_target: v } : r)))
  }

  function toggleFixed(cat: string, v: boolean) {
    setRows((prev) => prev.map((r) => (r.category === cat ? { ...r, is_recurring: v } : r)))
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

      {/* ── Categories & Budget Targets ──────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest">
            Categories & Budget Targets
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
          {loading ? (
            <div className="p-5 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3.5 flex-1" />
                  <Bone className="h-7 w-24 rounded-md" />
                  <Bone className="h-8 w-28" />
                  <Bone className="h-4 w-4 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {fixed.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Fixed / Recurring
                  </h3>
                  {fixed.map((row) => (
                    <CategoryRowItem
                      key={row.category}
                      row={row}
                      disabled={saving}
                      deleteConfirm={deleteConfirm === row.category}
                      onTargetChange={(v) => updateTarget(row.category, v)}
                      onToggle={(v) => toggleFixed(row.category, v)}
                      onDeleteConfirm={() => setDeleteConfirm(row.category)}
                      onDeleteCancel={() => setDeleteConfirm(null)}
                      onDelete={() => deleteCategory(row.category)}
                    />
                  ))}
                </div>
              )}

              {variable.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Variable / Daily
                  </h3>
                  {variable.map((row) => (
                    <CategoryRowItem
                      key={row.category}
                      row={row}
                      disabled={saving}
                      deleteConfirm={deleteConfirm === row.category}
                      onTargetChange={(v) => updateTarget(row.category, v)}
                      onToggle={(v) => toggleFixed(row.category, v)}
                      onDeleteConfirm={() => setDeleteConfirm(row.category)}
                      onDeleteCancel={() => setDeleteConfirm(null)}
                      onDelete={() => deleteCategory(row.category)}
                    />
                  ))}
                </div>
              )}

              {/* Add Category */}
              <div className="p-5 bg-slate-50 rounded-b-xl">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Add Category
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addCategory()}
                    placeholder="Category name"
                    className="flex-1 min-w-[140px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <RecurringToggle value={newCatFixed} onChange={setNewCatFixed} />
                  <button
                    type="button"
                    onClick={addCategory}
                    disabled={!newCatName.trim() || adding}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    {adding ? 'Adding…' : '+ Add'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2.5">
                  Deleting a category will not affect existing expenses that use it. Toggle Fixed ↔ Variable, then hit Save All to apply.
                </p>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  )
}
