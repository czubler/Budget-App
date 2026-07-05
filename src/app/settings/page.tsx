'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { Bone } from '@/components/Skeleton'

type ConnStatus = 'checking' | 'ok' | 'error'
type CatRow = { category: string; monthly_target: string; category_type: 'fixed' | 'variable_monthly' | 'variable_daily' }
type AccountRow = { id: string; name: string; is_active: boolean }
type GoalRow = { id: string; name: string; target_amount: string; is_archived: boolean }
type PaymentMethodRow = { id: string; nickname: string; payment_due_date: string; statement_close_date: string; is_active: boolean }
type OvertimeTierRow = { id: string; label: string; multiplier: string; sort_order: number }
type IncomeSourceRow = { id: string; name: string; hourly_rate: string; is_default: boolean; is_active: boolean }

function ordinal(n: number) {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

const targetInputCls =
  'w-28 pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-right bg-white'

function CategoryTypeSelector({
  value,
  onChange,
  disabled,
}: {
  value: 'fixed' | 'variable_monthly' | 'variable_daily'
  onChange: (v: 'fixed' | 'variable_monthly' | 'variable_daily') => void
  disabled?: boolean
}) {
  const options: { key: 'fixed' | 'variable_monthly' | 'variable_daily'; label: string }[] = [
    { key: 'fixed', label: 'Fixed Monthly' },
    { key: 'variable_monthly', label: 'Variable Monthly' },
    { key: 'variable_daily', label: 'Variable Daily' },
  ]
  return (
    <div className="flex rounded-md border border-slate-200 overflow-hidden text-xs font-medium shrink-0">
      {options.map((opt, i) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          disabled={disabled}
          className={`px-2.5 py-1 transition-colors ${i > 0 ? 'border-l border-slate-200' : ''} ${value === opt.key ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'}`}
        >
          {opt.label}
        </button>
      ))}
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
  onToggle: (v: 'fixed' | 'variable_monthly' | 'variable_daily') => void
  onDeleteConfirm: () => void
  onDeleteCancel: () => void
  onDelete: () => void
}) {
  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
      <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{row.category}</span>

      <CategoryTypeSelector value={row.category_type} onChange={onToggle} disabled={disabled} />

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
  const [newCatType, setNewCatType] = useState<'fixed' | 'variable_monthly' | 'variable_daily'>('variable_daily')
  const [adding, setAdding] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // savings accounts
  const [accounts, setAccounts] = useState<AccountRow[]>([])
  const [newAccountName, setNewAccountName] = useState('')
  const [addingAccount, setAddingAccount] = useState(false)
  const [accountDeleteConfirm, setAccountDeleteConfirm] = useState<string | null>(null)

  // savings goals
  const [goals, setGoals] = useState<GoalRow[]>([])
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalTarget, setNewGoalTarget] = useState('')
  const [addingGoal, setAddingGoal] = useState(false)
  const [goalDeleteConfirm, setGoalDeleteConfirm] = useState<string | null>(null)

  // payment methods
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodRow[]>([])
  const [newMethodNickname, setNewMethodNickname] = useState('')
  const [newMethodDueDate, setNewMethodDueDate] = useState('')
  const [newMethodStatementClose, setNewMethodStatementClose] = useState('')
  const [addingMethod, setAddingMethod] = useState(false)
  const [methodDeleteConfirm, setMethodDeleteConfirm] = useState<string | null>(null)
  const [editingMethodId, setEditingMethodId] = useState<string | null>(null)
  const [editNickname, setEditNickname] = useState('')
  const [editDueDate, setEditDueDate] = useState('')
  const [editStatementClose, setEditStatementClose] = useState('')

  // overtime tiers
  const [overtimeTiers, setOvertimeTiers] = useState<OvertimeTierRow[]>([])
  const [newTierLabel, setNewTierLabel] = useState('')
  const [newTierMultiplier, setNewTierMultiplier] = useState('')
  const [addingTier, setAddingTier] = useState(false)
  const [tierDeleteConfirm, setTierDeleteConfirm] = useState<string | null>(null)
  const [editingTierId, setEditingTierId] = useState<string | null>(null)
  const [editTierLabel, setEditTierLabel] = useState('')
  const [editTierMultiplier, setEditTierMultiplier] = useState('')

  // income sources
  const [incomeSources, setIncomeSources] = useState<IncomeSourceRow[]>([])
  const [newSourceName, setNewSourceName] = useState('')
  const [newSourceRate, setNewSourceRate] = useState('')
  const [addingSource, setAddingSource] = useState(false)
  const [sourceDeleteConfirm, setSourceDeleteConfirm] = useState<string | null>(null)
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)
  const [editSourceName, setEditSourceName] = useState('')
  const [editSourceRate, setEditSourceRate] = useState('')

  // projected income
  const [projectedIncome, setProjectedIncome] = useState('')
  const [savingProjectedIncome, setSavingProjectedIncome] = useState(false)

  // demo data
  const [demoConfirm, setDemoConfirm] = useState(false)
  const [demoResetting, setDemoResetting] = useState(false)

  useEffect(() => { init() }, [])

  const fixed = rows.filter((r) => r.category_type === 'fixed')
  const variableMonthly = rows.filter((r) => r.category_type === 'variable_monthly')
  const variableDaily = rows.filter((r) => r.category_type === 'variable_daily')
  const activeAccounts = accounts.filter((a) => a.is_active)
  const archivedAccounts = accounts.filter((a) => !a.is_active)
  const activeGoals = goals.filter((g) => !g.is_archived)
  const archivedGoals = goals.filter((g) => g.is_archived)
  const activeMethods = paymentMethods.filter((m) => m.is_active)
  const archivedMethods = paymentMethods.filter((m) => !m.is_active)

  async function init() {
    setConnStatus('checking')
    setTesting(true)
    try {
      const [
        { data: targetData, error: tErr },
        { count: expCount, error: eErr },
        { count: incCount, error: iErr },
        { data: acctData, error: aErr },
        { data: goalData, error: gErr },
        { data: pmData, error: pmErr },
        { data: tiersData, error: tiersErr },
        { data: settingsData, error: settingsErr },
        { data: sourcesData },
      ] = await Promise.all([
        supabase
          .from('budget_targets')
          .select('*')
          .order('category_type')
          .order('category'),
        supabase.from('expenses').select('*', { count: 'exact', head: true }),
        supabase.from('income').select('*', { count: 'exact', head: true }),
        supabase.from('savings_accounts').select('id, name, is_active').order('name'),
        supabase.from('savings_goals').select('id, name, target_amount, is_archived').order('name'),
        supabase.from('payment_methods').select('id, nickname, payment_due_date, statement_close_date, is_active').order('nickname'),
        supabase.from('overtime_rules').select('id, label, multiplier, sort_order').order('sort_order'),
        supabase.from('app_settings').select('key, value'),
        supabase.from('income_sources').select('id, name, hourly_rate, is_default, is_active').order('name'),
      ])

      if (tErr || eErr || iErr || aErr || gErr || pmErr || tiersErr || settingsErr) throw new Error('Query failed')

      const piRow = settingsData?.find((r) => r.key === 'projected_monthly_income')
      setProjectedIncome(piRow ? piRow.value : '0')

      setRows(
        targetData?.map((t) => ({
          category: t.category,
          monthly_target: t.monthly_target != null ? String(t.monthly_target) : '0',
          category_type: (t.category_type as 'fixed' | 'variable_monthly' | 'variable_daily') ?? 'variable_daily',
        })) ?? []
      )
      setStats({ expenses: expCount ?? 0, income: incCount ?? 0 })
      setAccounts(acctData ?? [])
      setGoals(
        goalData?.map((g) => ({
          ...g,
          target_amount: String(g.target_amount),
        })) ?? []
      )
      setPaymentMethods(
        pmData?.map((m) => ({
          ...m,
          payment_due_date: m.payment_due_date != null ? String(m.payment_due_date) : '',
          statement_close_date: m.statement_close_date != null ? String(m.statement_close_date) : '',
        })) ?? []
      )
      setOvertimeTiers(
        tiersData?.map((t) => ({
          id: t.id,
          label: t.label,
          multiplier: String(t.multiplier),
          sort_order: t.sort_order,
        })) ?? []
      )
      setIncomeSources(
        sourcesData?.map((s) => ({
          id: s.id,
          name: s.name,
          hourly_rate: s.hourly_rate != null ? String(s.hourly_rate) : '',
          is_default: s.is_default,
          is_active: s.is_active,
        })) ?? []
      )
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
      is_recurring: r.category_type === 'fixed',
      category_type: r.category_type,
    }))
    const { error } = await supabase
      .from('budget_targets')
      .upsert(upsertRows, { onConflict: 'category' })
    setSaving(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Categories & targets saved!')
  }

  async function saveProjectedIncome() {
    const val = parseFloat(projectedIncome)
    if (isNaN(val) || val < 0) return
    setSavingProjectedIncome(true)
    const { error } = await supabase
      .from('app_settings')
      .upsert({ key: 'projected_monthly_income', value: String(val) }, { onConflict: 'key' })
    setSavingProjectedIncome(false)
    if (error) { toast.error('Failed to save'); return }
    toast.success('Projected income saved')
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
      is_recurring: newCatType === 'fixed',
      category_type: newCatType,
    })
    setAdding(false)
    if (error) { toast.error('Failed to add category'); return }
    setRows((prev) => [
      ...prev,
      { category: name, monthly_target: '0', category_type: newCatType },
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

  function setCategoryType(cat: string, v: 'fixed' | 'variable_monthly' | 'variable_daily') {
    setRows((prev) => prev.map((r) => (r.category === cat ? { ...r, category_type: v } : r)))
  }

  // ─── Income Sources ────────────────────────────────────────────────────────

  async function addIncomeSource() {
    const name = newSourceName.trim()
    if (!name) return
    const rate = newSourceRate ? parseFloat(newSourceRate) : null
    setAddingSource(true)
    const { data, error } = await supabase
      .from('income_sources')
      .insert({ name, hourly_rate: rate })
      .select('id, name, hourly_rate, is_default, is_active')
      .single()
    setAddingSource(false)
    if (error) { toast.error('Failed to add source'); return }
    setIncomeSources((prev) =>
      [...prev, { ...data, hourly_rate: data.hourly_rate != null ? String(data.hourly_rate) : '' }]
        .sort((a, b) => a.name.localeCompare(b.name))
    )
    setNewSourceName('')
    setNewSourceRate('')
    toast.success(`"${name}" added`)
  }

  async function saveIncomeSource(id: string) {
    const name = editSourceName.trim()
    if (!name) return
    const rate = editSourceRate ? parseFloat(editSourceRate) : null
    const { error } = await supabase
      .from('income_sources')
      .update({ name, hourly_rate: rate })
      .eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    setIncomeSources((prev) =>
      prev.map((s) => s.id === id ? { ...s, name, hourly_rate: editSourceRate } : s)
    )
    setEditingSourceId(null)
    toast.success('Source updated')
  }

  async function setDefaultSource(id: string) {
    const { error } = await supabase.rpc('set_default_income_source', { source_id: id })
    if (error) {
      // fallback: manual two-step update
      await supabase.from('income_sources').update({ is_default: false }).neq('id', id)
      const { error: e2 } = await supabase.from('income_sources').update({ is_default: true }).eq('id', id)
      if (e2) { toast.error('Failed to set default'); return }
    }
    setIncomeSources((prev) => prev.map((s) => ({ ...s, is_default: s.id === id })))
    toast.success('Default source updated')
  }

  async function archiveSource(id: string, archive: boolean) {
    const { error } = await supabase.from('income_sources').update({ is_active: !archive }).eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    setIncomeSources((prev) => prev.map((s) => s.id === id ? { ...s, is_active: !archive } : s))
    toast.success(archive ? 'Source archived' : 'Source restored')
  }

  async function deleteIncomeSource(id: string, name: string) {
    const { count } = await supabase
      .from('income')
      .select('*', { count: 'exact', head: true })
      .eq('income_source_id', id)
    if ((count ?? 0) > 0) {
      toast.error(`"${name}" has ${count} paycheck${count === 1 ? '' : 's'} — archive it instead`)
      setSourceDeleteConfirm(null)
      return
    }
    const { error } = await supabase.from('income_sources').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setIncomeSources((prev) => prev.filter((s) => s.id !== id))
    setSourceDeleteConfirm(null)
    toast.success(`"${name}" deleted`)
  }

  // ─── Savings Accounts ──────────────────────────────────────────────────────

  async function addAccount() {
    const name = newAccountName.trim()
    if (!name) return
    setAddingAccount(true)
    const { data, error } = await supabase
      .from('savings_accounts')
      .insert({ name })
      .select('id, name, is_active')
      .single()
    setAddingAccount(false)
    if (error) { toast.error('Failed to add account'); return }
    setAccounts((prev) => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)))
    setNewAccountName('')
    toast.success(`"${name}" added`)
  }

  async function archiveAccount(id: string, archive: boolean) {
    const { error } = await supabase
      .from('savings_accounts')
      .update({ is_active: !archive })
      .eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    setAccounts((prev) => prev.map((a) => a.id === id ? { ...a, is_active: !archive } : a))
    toast.success(archive ? 'Account archived' : 'Account restored')
  }

  async function deleteAccount(id: string, name: string) {
    const { error } = await supabase.from('savings_accounts').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setAccountDeleteConfirm(null)
    toast.success(`"${name}" deleted`)
  }

  // ─── Savings Goals ─────────────────────────────────────────────────────────

  async function addGoal() {
    const name = newGoalName.trim()
    const target = parseFloat(newGoalTarget)
    if (!name) return
    if (!target || target <= 0) { toast.error('Enter a valid target amount'); return }
    setAddingGoal(true)
    const { data, error } = await supabase
      .from('savings_goals')
      .insert({ name, target_amount: target })
      .select('id, name, target_amount, is_archived')
      .single()
    setAddingGoal(false)
    if (error) { toast.error('Failed to add goal'); return }
    setGoals((prev) => [...prev, { ...data, target_amount: String(data.target_amount) }].sort((a, b) => a.name.localeCompare(b.name)))
    setNewGoalName('')
    setNewGoalTarget('')
    toast.success(`"${name}" added`)
  }

  async function archiveGoal(id: string, archive: boolean) {
    const { error } = await supabase
      .from('savings_goals')
      .update({ is_archived: archive })
      .eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    setGoals((prev) => prev.map((g) => g.id === id ? { ...g, is_archived: archive } : g))
    toast.success(archive ? 'Goal archived' : 'Goal restored')
  }

  async function deleteGoal(id: string, name: string) {
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setGoals((prev) => prev.filter((g) => g.id !== id))
    setGoalDeleteConfirm(null)
    toast.success(`"${name}" deleted`)
  }

  // ─── Payment Methods ───────────────────────────────────────────────────────

  async function addPaymentMethod() {
    const nickname = newMethodNickname.trim()
    if (!nickname) return
    const dueDate = newMethodDueDate ? parseInt(newMethodDueDate) : null
    if (dueDate !== null && (dueDate < 1 || dueDate > 31)) { toast.error('Due date must be 1–31'); return }
    const statementClose = newMethodStatementClose ? parseInt(newMethodStatementClose) : null
    if (statementClose !== null && (statementClose < 1 || statementClose > 28)) { toast.error('Statement close date must be 1–28'); return }
    setAddingMethod(true)
    const { data, error } = await supabase
      .from('payment_methods')
      .insert({ nickname, payment_due_date: dueDate, statement_close_date: statementClose })
      .select('id, nickname, payment_due_date, statement_close_date, is_active')
      .single()
    setAddingMethod(false)
    if (error) { toast.error('Failed to add payment method'); return }
    setPaymentMethods((prev) =>
      [...prev, {
        ...data,
        payment_due_date: data.payment_due_date != null ? String(data.payment_due_date) : '',
        statement_close_date: data.statement_close_date != null ? String(data.statement_close_date) : '',
      }].sort((a, b) => a.nickname.localeCompare(b.nickname))
    )
    setNewMethodNickname('')
    setNewMethodDueDate('')
    setNewMethodStatementClose('')
    toast.success(`"${nickname}" added`)
  }

  async function savePaymentMethod(id: string) {
    const nickname = editNickname.trim()
    if (!nickname) return
    const dueDate = editDueDate ? parseInt(editDueDate) : null
    if (dueDate !== null && (dueDate < 1 || dueDate > 31)) { toast.error('Due date must be 1–31'); return }
    const statementClose = editStatementClose ? parseInt(editStatementClose) : null
    if (statementClose !== null && (statementClose < 1 || statementClose > 28)) { toast.error('Statement close date must be 1–28'); return }
    const { error } = await supabase
      .from('payment_methods')
      .update({ nickname, payment_due_date: dueDate, statement_close_date: statementClose })
      .eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    setPaymentMethods((prev) =>
      prev.map((m) => m.id === id ? { ...m, nickname, payment_due_date: editDueDate, statement_close_date: editStatementClose } : m)
    )
    setEditingMethodId(null)
    toast.success('Payment method updated')
  }

  async function archivePaymentMethod(id: string, archive: boolean) {
    const { error } = await supabase
      .from('payment_methods')
      .update({ is_active: !archive })
      .eq('id', id)
    if (error) { toast.error('Failed to update'); return }
    setPaymentMethods((prev) => prev.map((m) => m.id === id ? { ...m, is_active: !archive } : m))
    toast.success(archive ? 'Payment method archived' : 'Payment method restored')
  }

  async function deletePaymentMethod(id: string, nickname: string) {
    const { error } = await supabase.from('payment_methods').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    setPaymentMethods((prev) => prev.filter((m) => m.id !== id))
    setMethodDeleteConfirm(null)
    toast.success(`"${nickname}" deleted`)
  }

  // ─── Overtime Tiers ────────────────────────────────────────────────────────

  async function addOvertimeTier() {
    const label = newTierLabel.trim()
    if (!label) return
    const multiplier = parseFloat(newTierMultiplier)
    if (!multiplier || multiplier <= 0) { toast.error('Enter a valid multiplier (e.g. 1.5)'); return }
    const maxOrder = overtimeTiers.reduce((m, t) => Math.max(m, t.sort_order), 0)
    setAddingTier(true)
    const { data, error } = await supabase
      .from('overtime_rules')
      .insert({ label, multiplier, sort_order: maxOrder + 1 })
      .select('id, label, multiplier, sort_order')
      .single()
    setAddingTier(false)
    if (error) { toast.error('Failed to add tier'); return }
    setOvertimeTiers((prev) => [...prev, { ...data, multiplier: String(data.multiplier) }])
    setNewTierLabel('')
    setNewTierMultiplier('')
    toast.success(`"${label}" added`)
  }

  async function saveOvertimeTier(id: string, isRegular: boolean) {
    const label = isRegular ? overtimeTiers.find((t) => t.id === id)!.label : editTierLabel.trim()
    if (!label) return
    const multiplier = parseFloat(editTierMultiplier)
    if (!multiplier || multiplier <= 0) { toast.error('Enter a valid multiplier'); return }
    const updates: Record<string, unknown> = { multiplier }
    if (!isRegular) updates.label = label
    const { error } = await supabase.from('overtime_rules').update(updates).eq('id', id)
    if (error) { toast.error('Failed to update tier'); return }
    setOvertimeTiers((prev) =>
      prev.map((t) => t.id === id ? { ...t, label: isRegular ? t.label : editTierLabel.trim(), multiplier: editTierMultiplier } : t)
    )
    setEditingTierId(null)
    toast.success('Tier updated')
  }

  async function deleteOvertimeTier(id: string, label: string) {
    const { error } = await supabase.from('overtime_rules').delete().eq('id', id)
    if (error) { toast.error('Failed to delete tier'); return }
    setOvertimeTiers((prev) => prev.filter((t) => t.id !== id))
    setTierDeleteConfirm(null)
    toast.success(`"${label}" removed`)
  }

  async function resetDemo() {
    setDemoResetting(true)
    try {
      const res = await fetch('/api/reset-demo', { method: 'POST' })
      if (!res.ok) throw new Error('Request failed')
      toast.success('Demo data loaded!')
      setDemoConfirm(false)
      await init()
    } catch {
      toast.error('Failed to reset demo data')
    } finally {
      setDemoResetting(false)
    }
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-slate-800">Settings</h1>

      {/* ── Projected Income ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Projected Monthly Income
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-xs text-slate-500 mb-3">
            Your expected net income per month. Used on the Budget page to show a projected spending money figure alongside your real logged income.
          </p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
              <input
                type="number"
                min="0"
                step="1"
                value={projectedIncome}
                onChange={(e) => setProjectedIncome(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && saveProjectedIncome()}
                disabled={loading || savingProjectedIncome}
                placeholder="0"
                className="w-40 pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white disabled:bg-slate-50"
              />
            </div>
            <button
              onClick={saveProjectedIncome}
              disabled={loading || savingProjectedIncome}
              className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              {savingProjectedIncome ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </section>

      {/* ── Income Sources ───────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Income Sources
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3.5 flex-1" />
                  <Bone className="h-7 w-20 rounded-md" />
                  <Bone className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Active sources */}
              {incomeSources.filter((s) => s.is_active).length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active</h3>
                  {incomeSources.filter((s) => s.is_active).map((src) => (
                    <div key={src.id} className="py-2.5 border-b border-slate-50 last:border-0">
                      {editingSourceId === src.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={editSourceName}
                            onChange={(e) => setEditSourceName(e.target.value)}
                            placeholder="Source name"
                            className="flex-1 min-w-32 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={editSourceRate}
                              onChange={(e) => setEditSourceRate(e.target.value)}
                              placeholder="Rate/hr"
                              className="w-28 pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-right"
                            />
                          </div>
                          <button
                            onClick={() => saveIncomeSource(src.id)}
                            className="text-xs px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition-colors"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingSourceId(null)}
                            className="text-xs px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <i className="ti ti-briefcase text-slate-400 shrink-0" style={{ fontSize: 15 }} />
                          <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{src.name}</span>
                          <span className="text-xs text-slate-400 shrink-0">
                            {src.hourly_rate ? `$${parseFloat(src.hourly_rate).toFixed(2)}/hr` : '—'}
                          </span>
                          {src.is_default && (
                            <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200 shrink-0">
                              Default
                            </span>
                          )}
                          {!src.is_default && (
                            <button
                              onClick={() => setDefaultSource(src.id)}
                              className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                            >
                              Set default
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingSourceId(src.id)
                              setEditSourceName(src.name)
                              setEditSourceRate(src.hourly_rate)
                            }}
                            className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => archiveSource(src.id, true)}
                            className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                          >
                            Archive
                          </button>
                          {sourceDeleteConfirm === src.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-slate-500">Delete?</span>
                              <button
                                onClick={() => deleteIncomeSource(src.id, src.name)}
                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setSourceDeleteConfirm(null)}
                                className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setSourceDeleteConfirm(src.id)}
                              className="shrink-0 text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Archived sources */}
              {incomeSources.filter((s) => !s.is_active).length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Archived</h3>
                  {incomeSources.filter((s) => !s.is_active).map((src) => (
                    <div key={src.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <i className="ti ti-briefcase text-slate-300 shrink-0" style={{ fontSize: 15 }} />
                      <span className="text-sm text-slate-400 flex-1 min-w-0 truncate">{src.name}</span>
                      <span className="text-xs text-slate-300 shrink-0">
                        {src.hourly_rate ? `$${parseFloat(src.hourly_rate).toFixed(2)}/hr` : '—'}
                      </span>
                      <button
                        onClick={() => archiveSource(src.id, false)}
                        className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add form */}
              <div className="p-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Source</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newSourceName}
                    onChange={(e) => setNewSourceName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addIncomeSource()}
                    placeholder="Source name (e.g. Main Job)"
                    className="flex-1 min-w-40 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={newSourceRate}
                      onChange={(e) => setNewSourceRate(e.target.value)}
                      placeholder="Rate/hr"
                      className="w-28 pl-6 pr-2 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-right"
                    />
                  </div>
                  <button
                    onClick={addIncomeSource}
                    disabled={addingSource || !newSourceName.trim()}
                    className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    {addingSource ? 'Adding…' : '+ Add'}
                  </button>
                </div>
              </div>
            </>
          )}
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
                    Fixed Monthly
                  </h3>
                  {fixed.map((row) => (
                    <CategoryRowItem
                      key={row.category}
                      row={row}
                      disabled={saving}
                      deleteConfirm={deleteConfirm === row.category}
                      onTargetChange={(v) => updateTarget(row.category, v)}
                      onToggle={(v) => setCategoryType(row.category, v)}
                      onDeleteConfirm={() => setDeleteConfirm(row.category)}
                      onDeleteCancel={() => setDeleteConfirm(null)}
                      onDelete={() => deleteCategory(row.category)}
                    />
                  ))}
                </div>
              )}

              {variableMonthly.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Variable Monthly
                  </h3>
                  {variableMonthly.map((row) => (
                    <CategoryRowItem
                      key={row.category}
                      row={row}
                      disabled={saving}
                      deleteConfirm={deleteConfirm === row.category}
                      onTargetChange={(v) => updateTarget(row.category, v)}
                      onToggle={(v) => setCategoryType(row.category, v)}
                      onDeleteConfirm={() => setDeleteConfirm(row.category)}
                      onDeleteCancel={() => setDeleteConfirm(null)}
                      onDelete={() => deleteCategory(row.category)}
                    />
                  ))}
                </div>
              )}

              {variableDaily.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                    Variable Daily
                  </h3>
                  {variableDaily.map((row) => (
                    <CategoryRowItem
                      key={row.category}
                      row={row}
                      disabled={saving}
                      deleteConfirm={deleteConfirm === row.category}
                      onTargetChange={(v) => updateTarget(row.category, v)}
                      onToggle={(v) => setCategoryType(row.category, v)}
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
                  <CategoryTypeSelector value={newCatType} onChange={setNewCatType} />
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
                  Deleting a category will not affect existing expenses that use it. Toggle Fixed Monthly / Variable Monthly / Variable Daily, then hit Save All to apply.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Savings Accounts ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Savings Accounts
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3.5 flex-1" />
                  <Bone className="h-7 w-20 rounded-md" />
                  <Bone className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeAccounts.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active</h3>
                  {activeAccounts.map((acct) => (
                    <div key={acct.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <i className="ti ti-building-bank text-slate-400" style={{ fontSize: 15 }} />
                      <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{acct.name}</span>
                      <button
                        onClick={() => archiveAccount(acct.id, true)}
                        className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Archive
                      </button>
                      {accountDeleteConfirm === acct.id ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-slate-500">Delete?</span>
                          <button
                            onClick={() => deleteAccount(acct.id, acct.name)}
                            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setAccountDeleteConfirm(null)}
                            className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setAccountDeleteConfirm(acct.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                          title={`Delete ${acct.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {archivedAccounts.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Archived</h3>
                  {archivedAccounts.map((acct) => (
                    <div key={acct.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 opacity-60">
                      <i className="ti ti-building-bank text-slate-400" style={{ fontSize: 15 }} />
                      <span className="text-sm text-slate-500 flex-1 min-w-0 truncate line-through">{acct.name}</span>
                      <button
                        onClick={() => archiveAccount(acct.id, false)}
                        className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Account */}
              <div className="p-5 bg-slate-50 rounded-b-xl">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Account</h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newAccountName}
                    onChange={(e) => setNewAccountName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addAccount()}
                    placeholder="e.g. High-yield savings"
                    className="flex-1 px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <button
                    onClick={addAccount}
                    disabled={!newAccountName.trim() || addingAccount}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    {addingAccount ? 'Adding…' : '+ Add'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Payment Methods ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Payment Methods
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3.5 flex-1" />
                  <Bone className="h-3.5 w-16" />
                  <Bone className="h-7 w-16 rounded-md" />
                  <Bone className="h-7 w-14 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeMethods.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active</h3>
                  {activeMethods.map((method) => (
                    <div key={method.id} className="py-2.5 border-b border-slate-50 last:border-0">
                      {editingMethodId === method.id ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          <input
                            type="text"
                            value={editNickname}
                            onChange={(e) => setEditNickname(e.target.value)}
                            placeholder="Nickname"
                            className="flex-1 min-w-[120px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                          />
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-slate-500">Due day</span>
                            <input
                              type="number"
                              min="1"
                              max="31"
                              value={editDueDate}
                              onChange={(e) => setEditDueDate(e.target.value)}
                              placeholder="—"
                              className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="text-xs text-slate-500">Stmt closes</span>
                            <input
                              type="number"
                              min="1"
                              max="28"
                              value={editStatementClose}
                              onChange={(e) => setEditStatementClose(e.target.value)}
                              placeholder="—"
                              className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                            />
                          </div>
                          <button
                            onClick={() => savePaymentMethod(method.id)}
                            disabled={!editNickname.trim()}
                            className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors shrink-0"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingMethodId(null)}
                            className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors shrink-0"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <i className="ti ti-credit-card text-slate-400" style={{ fontSize: 15 }} />
                          <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{method.nickname}</span>
                          {method.payment_due_date && (
                            <span className="text-xs text-slate-400 shrink-0">
                              Due {ordinal(parseInt(method.payment_due_date))}
                            </span>
                          )}
                          {method.statement_close_date && (
                            <span className="text-xs text-slate-400 shrink-0">
                              Closes {ordinal(parseInt(method.statement_close_date))}
                            </span>
                          )}
                          <button
                            onClick={() => {
                              setEditingMethodId(method.id)
                              setEditNickname(method.nickname)
                              setEditDueDate(method.payment_due_date)
                              setEditStatementClose(method.statement_close_date)
                            }}
                            className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => archivePaymentMethod(method.id, true)}
                            className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                          >
                            Archive
                          </button>
                          {methodDeleteConfirm === method.id ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-slate-500">Delete?</span>
                              <button
                                onClick={() => deletePaymentMethod(method.id, method.nickname)}
                                className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                              >
                                Yes
                              </button>
                              <button
                                onClick={() => setMethodDeleteConfirm(null)}
                                className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setMethodDeleteConfirm(method.id)}
                              className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                              title={`Delete ${method.nickname}`}
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {archivedMethods.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Archived</h3>
                  {archivedMethods.map((method) => (
                    <div key={method.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 opacity-60">
                      <i className="ti ti-credit-card text-slate-400" style={{ fontSize: 15 }} />
                      <span className="text-sm text-slate-500 flex-1 min-w-0 truncate line-through">{method.nickname}</span>
                      {method.payment_due_date && (
                        <span className="text-xs text-slate-400 shrink-0">
                          Due {ordinal(parseInt(method.payment_due_date))}
                        </span>
                      )}
                      <button
                        onClick={() => archivePaymentMethod(method.id, false)}
                        className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Payment Method */}
              <div className="p-5 bg-slate-50 rounded-b-xl">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Payment Method</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newMethodNickname}
                    onChange={(e) => setNewMethodNickname(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addPaymentMethod()}
                    placeholder="e.g. Chase Sapphire"
                    className="flex-1 min-w-[140px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Due day</span>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={newMethodDueDate}
                      onChange={(e) => setNewMethodDueDate(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPaymentMethod()}
                      placeholder="—"
                      className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Stmt closes</span>
                    <input
                      type="number"
                      min="1"
                      max="28"
                      value={newMethodStatementClose}
                      onChange={(e) => setNewMethodStatementClose(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addPaymentMethod()}
                      placeholder="—"
                      className="w-16 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={addPaymentMethod}
                    disabled={!newMethodNickname.trim() || addingMethod}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    {addingMethod ? 'Adding…' : '+ Add'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2.5">
                  Due day and statement close are optional. Set both to enable billing-cycle-accurate payment reminder emails. Statement close date capped at 28.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Savings Goals ────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Savings Goals
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3.5 flex-1" />
                  <Bone className="h-3.5 w-20" />
                  <Bone className="h-7 w-20 rounded-md" />
                  <Bone className="h-7 w-16 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {activeGoals.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Active</h3>
                  {activeGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
                      <i className="ti ti-target text-slate-400" style={{ fontSize: 15 }} />
                      <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">{goal.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        ${parseFloat(goal.target_amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <button
                        onClick={() => archiveGoal(goal.id, true)}
                        className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Archive
                      </button>
                      {goalDeleteConfirm === goal.id ? (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-xs text-slate-500">Delete?</span>
                          <button
                            onClick={() => deleteGoal(goal.id, goal.name)}
                            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setGoalDeleteConfirm(null)}
                            className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setGoalDeleteConfirm(goal.id)}
                          className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                          title={`Delete ${goal.name}`}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {archivedGoals.length > 0 && (
                <div className="p-5">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Archived</h3>
                  {archivedGoals.map((goal) => (
                    <div key={goal.id} className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0 opacity-60">
                      <i className="ti ti-target text-slate-400" style={{ fontSize: 15 }} />
                      <span className="text-sm text-slate-500 flex-1 min-w-0 truncate line-through">{goal.name}</span>
                      <span className="text-xs text-slate-400 shrink-0">
                        ${parseFloat(goal.target_amount).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </span>
                      <button
                        onClick={() => archiveGoal(goal.id, false)}
                        className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                      >
                        Restore
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Goal */}
              <div className="p-5 bg-slate-50 rounded-b-xl">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Goal</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                    placeholder="e.g. Emergency fund"
                    className="flex-1 min-w-[140px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <div className="relative shrink-0">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addGoal()}
                      placeholder="Target"
                      className="w-28 pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <button
                    onClick={addGoal}
                    disabled={!newGoalName.trim() || !newGoalTarget || addingGoal}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    {addingGoal ? 'Adding…' : '+ Add'}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Pay Rate Tiers ──────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Pay Rate Tiers
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
          {loading ? (
            <div className="p-5 space-y-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Bone className="h-3.5 flex-1" />
                  <Bone className="h-3.5 w-10" />
                  <Bone className="h-7 w-16 rounded-md" />
                  <Bone className="h-4 w-4 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              {overtimeTiers.length > 0 && (
                <div className="p-5">
                  {overtimeTiers.map((tier) => {
                    const isRegular = tier.label === 'Regular'
                    return (
                      <div key={tier.id} className="py-2.5 border-b border-slate-50 last:border-0">
                        {editingTierId === tier.id ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <input
                              type="text"
                              value={editTierLabel}
                              onChange={(e) => setEditTierLabel(e.target.value)}
                              disabled={isRegular}
                              placeholder="Label"
                              className="flex-1 min-w-[100px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white disabled:bg-slate-50 disabled:text-slate-400"
                            />
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="text-xs text-slate-500">Multiplier</span>
                              <input
                                type="number"
                                min="0.01"
                                step="0.25"
                                value={editTierMultiplier}
                                onChange={(e) => setEditTierMultiplier(e.target.value)}
                                placeholder="e.g. 1.5"
                                className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                              />
                              <span className="text-xs text-slate-400">×</span>
                            </div>
                            <button
                              onClick={() => saveOvertimeTier(tier.id, isRegular)}
                              disabled={!editTierMultiplier}
                              className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium transition-colors shrink-0"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTierId(null)}
                              className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded-lg font-medium transition-colors shrink-0"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-3">
                            <i className="ti ti-clock text-slate-400" style={{ fontSize: 15 }} />
                            <span className="text-sm text-slate-700 flex-1">{tier.label}</span>
                            <span className="text-xs font-mono text-slate-500 shrink-0">{parseFloat(tier.multiplier)}×</span>
                            {isRegular && (
                              <span className="text-xs text-slate-300 shrink-0">system</span>
                            )}
                            <button
                              onClick={() => {
                                setEditingTierId(tier.id)
                                setEditTierLabel(tier.label)
                                setEditTierMultiplier(tier.multiplier)
                              }}
                              className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-500 rounded-lg font-medium transition-colors shrink-0"
                            >
                              Edit
                            </button>
                            {isRegular ? (
                              <span className="w-5 shrink-0" />
                            ) : tierDeleteConfirm === tier.id ? (
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className="text-xs text-slate-500">Delete?</span>
                                <button
                                  onClick={() => deleteOvertimeTier(tier.id, tier.label)}
                                  className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setTierDeleteConfirm(null)}
                                  className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setTierDeleteConfirm(tier.id)}
                                className="text-slate-300 hover:text-red-400 transition-colors text-lg leading-none"
                                title={`Delete ${tier.label}`}
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Add Tier */}
              <div className="p-5 bg-slate-50 rounded-b-xl">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Add Tier</h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    type="text"
                    value={newTierLabel}
                    onChange={(e) => setNewTierLabel(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addOvertimeTier()}
                    placeholder="e.g. Triple Time"
                    className="flex-1 min-w-[120px] px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-xs text-slate-500">Multiplier</span>
                    <input
                      type="number"
                      min="0.01"
                      step="0.25"
                      value={newTierMultiplier}
                      onChange={(e) => setNewTierMultiplier(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addOvertimeTier()}
                      placeholder="e.g. 3.0"
                      className="w-20 px-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-center"
                    />
                    <span className="text-xs text-slate-400">×</span>
                  </div>
                  <button
                    type="button"
                    onClick={addOvertimeTier}
                    disabled={!newTierLabel.trim() || !newTierMultiplier || addingTier}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
                  >
                    {addingTier ? 'Adding…' : '+ Add'}
                  </button>
                </div>
                <p className="text-xs text-slate-400 mt-2.5">
                  These tiers apply when logging paychecks. The Regular tier cannot be deleted. Multipliers apply to your base hourly rate.
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── Demo Data ────────────────────────────────────────────────────── */}
      <section>
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">
          Demo Data
        </h2>
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
          <p className="text-sm text-slate-600 mb-4">
            Wipes all data and loads 3 months of realistic demo data — April through June 2026. Useful for exploring the app before adding real entries.
          </p>
          <ul className="text-xs text-slate-500 space-y-1 mb-4 list-disc list-inside">
            <li>58 expenses across 15 categories</li>
            <li>6 paychecks ($2,000 net each) from Acme Corp</li>
            <li>2 savings accounts + 2 savings goals</li>
            <li>5 payment methods (Chase Sapphire, Apple Card, Wells Fargo Debit, Cash, Venmo)</li>
            <li>Chase Sapphire closes 21st · Apple Card closes 3rd (for payment reminder emails)</li>
            <li>May is intentionally over budget on Dining &amp; Social</li>
          </ul>
          {demoConfirm ? (
            <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <i className="ti ti-alert-triangle text-amber-500" style={{ fontSize: 16 }} />
              <span className="text-sm text-amber-700 flex-1">This will delete all your current data. Continue?</span>
              <button
                onClick={resetDemo}
                disabled={demoResetting}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                {demoResetting ? 'Resetting…' : 'Yes, wipe & reload'}
              </button>
              <button
                onClick={() => setDemoConfirm(false)}
                disabled={demoResetting}
                className="px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-lg transition-colors shrink-0"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setDemoConfirm(true)}
              className="px-4 py-2 border border-slate-300 hover:border-red-300 hover:text-red-600 text-slate-600 text-sm font-medium rounded-lg transition-colors"
            >
              Reset Demo Data
            </button>
          )}
        </div>
      </section>

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
    </div>
  )
}
