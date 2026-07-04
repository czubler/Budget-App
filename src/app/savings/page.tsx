'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { SavingsAccount, SavingsContribution, SavingsGoal, SavingsGoalContribution } from '@/lib/types'
import { MonthPicker, type MonthValue } from '@/components/MonthPicker'

function monthRange(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const last = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return { first, last, label }
}

function usd(n: number) {
  return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

// ─── Contribute / Edit Modal ───────────────────────────────────────────────────

type ModalTarget =
  | { type: 'account'; id: string; name: string }
  | { type: 'goal'; id: string; name: string }

type EditingContrib = { id: string; amount: number; date: string; notes: string | null }

function ContributeModal({
  target,
  editing,
  onClose,
  onSaved,
}: {
  target: ModalTarget
  editing?: EditingContrib
  onClose: () => void
  onSaved: () => void
}) {
  const [amount, setAmount] = useState(editing ? String(editing.amount) : '')
  const [date, setDate] = useState(editing?.date ?? todayStr())
  const [notes, setNotes] = useState(editing?.notes ?? '')
  const [saving, setSaving] = useState(false)
  const amtRef = useRef<HTMLInputElement>(null)

  useEffect(() => { amtRef.current?.focus() }, [])

  async function submit() {
    const amt = parseFloat(amount)
    if (!amt || amt <= 0) { toast.error('Enter a valid amount'); return }
    setSaving(true)
    const table = target.type === 'account' ? 'savings_contributions' : 'savings_goal_contributions'

    let error: unknown
    if (editing) {
      ;({ error } = await supabase.from(table).update({
        amount: amt,
        date,
        notes: notes.trim() || null,
      }).eq('id', editing.id))
    } else {
      const fkKey = target.type === 'account' ? 'account_id' : 'goal_id'
      ;({ error } = await supabase.from(table).insert({
        [fkKey]: target.id,
        amount: amt,
        date,
        notes: notes.trim() || null,
      }))
    }

    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success(editing ? 'Contribution updated' : `Contribution added to ${target.name}`)
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {editing ? 'Edit Contribution' : 'Add Contribution'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{target.name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
              <input
                ref={amtRef}
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="0.00"
                className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                style={{ '--tw-ring-color': '#7F77DD' } as React.CSSProperties}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Notes <span className="normal-case font-normal text-slate-400">(optional)</span>
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. paycheck transfer"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-60"
            style={{ backgroundColor: '#7F77DD' }}
          >
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Account Card ──────────────────────────────────────────────────────────────

function AccountCard({
  account,
  totalSaved,
  monthSaved,
  recentContribs,
  monthLabel,
  onContribute,
  onEditContrib,
  onDeleteContrib,
}: {
  account: SavingsAccount
  totalSaved: number
  monthSaved: number
  recentContribs: SavingsContribution[]
  monthLabel: string
  onContribute: () => void
  onEditContrib: (c: SavingsContribution) => void
  onDeleteContrib: (id: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function confirmDelete(id: string) {
    setDeleting(true)
    await onDeleteContrib(id)
    setDeleting(false)
    setDeleteConfirmId(null)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 flex items-center gap-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: '#EDE9FF' }}>
          <i className="ti ti-building-bank" style={{ fontSize: 18, color: '#7F77DD' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-800">{account.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">Total balance: {usd(totalSaved)}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-lg font-bold text-emerald-600">{monthSaved > 0 ? usd(monthSaved) : '—'}</p>
          <p className="text-xs text-slate-400">this month</p>
        </div>
        <button
          onClick={onContribute}
          className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
          style={{ backgroundColor: '#7F77DD' }}
        >
          <i className="ti ti-plus" style={{ fontSize: 12 }} />
          Add
        </button>
      </div>

      {recentContribs.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-5 py-2 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <span>{monthLabel} contributions ({recentContribs.length})</span>
            <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12 }} />
          </button>
          {expanded && (
            <div className="divide-y divide-slate-50">
              {recentContribs.map((c) => (
                <div key={c.id} className="px-5 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">
                      {new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {c.notes && <p className="text-xs text-slate-400 truncate">{c.notes}</p>}
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 shrink-0">{usd(Number(c.amount))}</p>
                  {deleteConfirmId === c.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500">Delete?</span>
                      <button
                        onClick={() => confirmDelete(c.id)}
                        disabled={deleting}
                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:opacity-60"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onEditContrib(c)}
                        className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(c.id)}
                        className="text-xs px-2 py-1 border border-red-200 hover:bg-red-50 text-red-600 rounded font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Goal Card ─────────────────────────────────────────────────────────────────

function GoalCard({
  goal,
  totalSaved,
  monthSaved,
  recentContribs,
  monthLabel,
  onContribute,
  onEditContrib,
  onDeleteContrib,
}: {
  goal: SavingsGoal
  totalSaved: number
  monthSaved: number
  recentContribs: SavingsGoalContribution[]
  monthLabel: string
  onContribute: () => void
  onEditContrib: (c: SavingsGoalContribution) => void
  onDeleteContrib: (id: string) => Promise<void>
}) {
  const [expanded, setExpanded] = useState(false)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const pct = goal.target_amount > 0 ? Math.min((totalSaved / goal.target_amount) * 100, 100) : 0
  const remaining = Math.max(goal.target_amount - totalSaved, 0)
  const done = totalSaved >= goal.target_amount

  async function confirmDelete(id: string) {
    setDeleting(true)
    await onDeleteContrib(id)
    setDeleting(false)
    setDeleteConfirmId(null)
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: done ? '#DCFCE7' : '#EDE9FF' }}
          >
            <i
              className={`ti ${done ? 'ti-star-filled' : 'ti-target'}`}
              style={{ fontSize: 18, color: done ? '#16a34a' : '#7F77DD' }}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-slate-800">{goal.name}</p>
              {done && (
                <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                  Complete!
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Target: {usd(goal.target_amount)}</p>
          </div>
          <div className="text-right shrink-0 mr-2">
            <p className="text-sm font-bold text-emerald-600">{monthSaved > 0 ? usd(monthSaved) : '—'}</p>
            <p className="text-xs text-slate-400">this month</p>
          </div>
          <button
            onClick={onContribute}
            className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors"
            style={{ backgroundColor: '#7F77DD' }}
          >
            <i className="ti ti-plus" style={{ fontSize: 12 }} />
            Add
          </button>
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-500">
            <span>{usd(totalSaved)} saved</span>
            <span className="font-medium">{Math.round(pct)}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${pct}%`, backgroundColor: done ? '#16a34a' : '#7F77DD' }}
            />
          </div>
          {!done && remaining > 0 && (
            <p className="text-xs text-slate-400">{usd(remaining)} to go</p>
          )}
        </div>
      </div>

      {recentContribs.length > 0 && (
        <div className="border-t border-slate-100">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="w-full px-5 py-2 flex items-center justify-between text-xs text-slate-400 hover:bg-slate-50 transition-colors"
          >
            <span>{monthLabel} contributions ({recentContribs.length})</span>
            <i className={`ti ${expanded ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 12 }} />
          </button>
          {expanded && (
            <div className="divide-y divide-slate-50">
              {recentContribs.map((c) => (
                <div key={c.id} className="px-5 py-2.5 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-500">
                      {new Date(c.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                    {c.notes && <p className="text-xs text-slate-400 truncate">{c.notes}</p>}
                  </div>
                  <p className="text-sm font-semibold text-emerald-600 shrink-0">{usd(Number(c.amount))}</p>
                  {deleteConfirmId === c.id ? (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-slate-500">Delete?</span>
                      <button
                        onClick={() => confirmDelete(c.id)}
                        disabled={deleting}
                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium disabled:opacity-60"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => onEditContrib(c)}
                        className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded font-medium transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(c.id)}
                        className="text-xs px-2 py-1 border border-red-200 hover:bg-red-50 text-red-600 rounded font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SavingsPage() {
  const [selectedMonth, setSelectedMonth] = useState<MonthValue>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })
  const [accounts, setAccounts] = useState<SavingsAccount[]>([])
  const [contributions, setContributions] = useState<SavingsContribution[]>([])
  const [monthContribs, setMonthContribs] = useState<SavingsContribution[]>([])
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [goalContribs, setGoalContribs] = useState<SavingsGoalContribution[]>([])
  const [monthGoalContribs, setMonthGoalContribs] = useState<SavingsGoalContribution[]>([])
  const [loading, setLoading] = useState(true)
  const [monthLabel, setMonthLabel] = useState('')
  const [modal, setModal] = useState<ModalTarget | null>(null)
  const [editModal, setEditModal] = useState<{ target: ModalTarget; contrib: EditingContrib } | null>(null)

  useEffect(() => {
    fetchAll(selectedMonth.year, selectedMonth.month)
  }, [selectedMonth])

  async function fetchAll(year: number, month: number) {
    setLoading(true)
    const { first, last, label } = monthRange(year, month)
    setMonthLabel(label)

    const [
      { data: acctData },
      { data: contribData },
      { data: monthContribData },
      { data: goalData },
      { data: goalContribData },
      { data: monthGoalContribData },
    ] = await Promise.all([
      supabase.from('savings_accounts').select('*').eq('is_active', true).order('name'),
      supabase.from('savings_contributions').select('*'),
      supabase.from('savings_contributions').select('*').gte('date', first).lte('date', last),
      supabase.from('savings_goals').select('*').eq('is_archived', false).order('name'),
      supabase.from('savings_goal_contributions').select('*'),
      supabase.from('savings_goal_contributions').select('*').gte('date', first).lte('date', last),
    ])

    setAccounts(acctData ?? [])
    setContributions(contribData ?? [])
    setMonthContribs(monthContribData ?? [])
    setGoals(goalData ?? [])
    setGoalContribs(goalContribData ?? [])
    setMonthGoalContribs(monthGoalContribData ?? [])
    setLoading(false)
  }

  async function deleteAccountContrib(id: string) {
    const { error } = await supabase.from('savings_contributions').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Contribution deleted')
    fetchAll(selectedMonth.year, selectedMonth.month)
  }

  async function deleteGoalContrib(id: string) {
    const { error } = await supabase.from('savings_goal_contributions').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Contribution deleted')
    fetchAll(selectedMonth.year, selectedMonth.month)
  }

  const totalMonthSaved =
    monthContribs.reduce((s, c) => s + Number(c.amount), 0) +
    monthGoalContribs.reduce((s, c) => s + Number(c.amount), 0)

  const totalAllTime =
    contributions.reduce((s, c) => s + Number(c.amount), 0) +
    goalContribs.reduce((s, c) => s + Number(c.amount), 0)

  function accountTotal(id: string) {
    return contributions.filter((c) => c.account_id === id).reduce((s, c) => s + Number(c.amount), 0)
  }
  function accountMonthTotal(id: string) {
    return monthContribs.filter((c) => c.account_id === id).reduce((s, c) => s + Number(c.amount), 0)
  }
  function accountMonthList(id: string): SavingsContribution[] {
    return monthContribs.filter((c) => c.account_id === id).sort((a, b) => b.date.localeCompare(a.date))
  }
  function goalTotal(id: string) {
    return goalContribs.filter((c) => c.goal_id === id).reduce((s, c) => s + Number(c.amount), 0)
  }
  function goalMonthTotal(id: string) {
    return monthGoalContribs.filter((c) => c.goal_id === id).reduce((s, c) => s + Number(c.amount), 0)
  }
  function goalMonthList(id: string): SavingsGoalContribution[] {
    return monthGoalContribs.filter((c) => c.goal_id === id).sort((a, b) => b.date.localeCompare(a.date))
  }

  const skeletonCard = (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-slate-200 animate-pulse shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 bg-slate-200 animate-pulse rounded w-36" />
          <div className="h-2.5 bg-slate-100 animate-pulse rounded w-24" />
        </div>
        <div className="h-5 bg-slate-200 animate-pulse rounded w-16" />
      </div>
    </div>
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-800">Savings</h1>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* ── Summary ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <i className="ti ti-calendar-month" style={{ fontSize: 13 }} />
            Saved This Month
          </p>
          <p className="text-2xl font-bold text-emerald-600">{loading ? '—' : usd(totalMonthSaved)}</p>
          <p className="text-xs text-slate-400 mt-0.5">accounts + goals</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <i className="ti ti-piggy-bank" style={{ fontSize: 13 }} />
            Total Saved
          </p>
          <p className="text-2xl font-bold text-slate-800">{loading ? '—' : usd(totalAllTime)}</p>
          <p className="text-xs text-slate-400 mt-0.5">all time</p>
        </div>
      </div>

      {/* ── Accounts ──────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Accounts</h2>
        {loading ? (
          <div className="space-y-3">{skeletonCard}{skeletonCard}</div>
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-10 text-center">
            <i className="ti ti-building-bank text-slate-300" style={{ fontSize: 36 }} />
            <p className="text-sm text-slate-400 mt-2">No savings accounts yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">Add one in Settings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {accounts.map((acct) => (
              <AccountCard
                key={acct.id}
                account={acct}
                totalSaved={accountTotal(acct.id)}
                monthSaved={accountMonthTotal(acct.id)}
                recentContribs={accountMonthList(acct.id)}
                monthLabel={monthLabel}
                onContribute={() => setModal({ type: 'account', id: acct.id, name: acct.name })}
                onEditContrib={(c) =>
                  setEditModal({
                    target: { type: 'account', id: acct.id, name: acct.name },
                    contrib: { id: c.id, amount: Number(c.amount), date: c.date, notes: c.notes },
                  })
                }
                onDeleteContrib={deleteAccountContrib}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Goals ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Goals</h2>
        {loading ? (
          <div className="space-y-3">{skeletonCard}{skeletonCard}</div>
        ) : goals.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-10 text-center">
            <i className="ti ti-target text-slate-300" style={{ fontSize: 36 }} />
            <p className="text-sm text-slate-400 mt-2">No savings goals yet.</p>
            <p className="text-xs text-slate-400 mt-0.5">Add one in Settings.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                totalSaved={goalTotal(goal.id)}
                monthSaved={goalMonthTotal(goal.id)}
                recentContribs={goalMonthList(goal.id)}
                monthLabel={monthLabel}
                onContribute={() => setModal({ type: 'goal', id: goal.id, name: goal.name })}
                onEditContrib={(c) =>
                  setEditModal({
                    target: { type: 'goal', id: goal.id, name: goal.name },
                    contrib: { id: c.id, amount: Number(c.amount), date: c.date, notes: c.notes },
                  })
                }
                onDeleteContrib={deleteGoalContrib}
              />
            ))}
          </div>
        )}
      </div>

      {modal && (
        <ContributeModal
          target={modal}
          onClose={() => setModal(null)}
          onSaved={() => fetchAll(selectedMonth.year, selectedMonth.month)}
        />
      )}

      {editModal && (
        <ContributeModal
          target={editModal.target}
          editing={editModal.contrib}
          onClose={() => setEditModal(null)}
          onSaved={() => fetchAll(selectedMonth.year, selectedMonth.month)}
        />
      )}
    </div>
  )
}
