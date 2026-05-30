'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Income } from '@/lib/types'
import { Bone } from '@/components/Skeleton'
import { MonthPicker, type MonthValue } from '@/components/MonthPicker'

// ─── helpers ──────────────────────────────────────────────────────────────────

function todayString() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDate(s: string) {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function monthRange(year: number, month: number) {
  const first = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const last = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const label = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  return { first, last, label }
}

function computeNet(gross: string, taxes: string): string {
  const g = parseFloat(gross) || 0
  const t = parseFloat(taxes) || 0
  return g > 0 && g - t >= 0 ? (g - t).toFixed(2) : ''
}

// ─── styles ───────────────────────────────────────────────────────────────────

const fieldCls =
  'w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

const dollarFieldCls =
  'w-full pl-7 pr-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

// ─── types ────────────────────────────────────────────────────────────────────

type FormState = {
  source: string
  paycheck_date: string
  hours_worked: string
  hourly_rate: string
  gross_amount: string
  taxes_withheld: string
  net_amount: string
  notes: string
}

const defaultForm = (): FormState => ({
  source: '',
  paycheck_date: todayString(),
  hours_worked: '',
  hourly_rate: '',
  gross_amount: '',
  taxes_withheld: '',
  net_amount: '',
  notes: '',
})

// ─── DollarInput ──────────────────────────────────────────────────────────────

function DollarInput({
  value,
  onChange,
  placeholder = '0.00',
  required,
  highlighted,
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
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${dollarFieldCls} ${highlighted ? 'bg-indigo-50 border-indigo-200 focus:border-transparent' : ''}`}
      />
    </div>
  )
}

// ─── SummaryCard ──────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  sub,
  colors,
}: {
  label: string
  value: string
  sub?: string
  colors: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${colors}`}>
      <p className="text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-60">{label}</p>
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      {sub && <p className="text-xs mt-1 opacity-50">{sub}</p>}
    </div>
  )
}

// ─── IncomeForm (shared by add + edit) ────────────────────────────────────────

function IncomeForm({
  form,
  setForm,
  netEdited,
  onGrossChange,
  onTaxesChange,
  onNetChange,
  onSubmit,
  submitting,
  submitLabel,
  onCancel,
}: {
  form: FormState
  setForm: (f: FormState) => void
  netEdited: boolean
  onGrossChange: (v: string) => void
  onTaxesChange: (v: string) => void
  onNetChange: (v: string) => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  submitLabel: string
  onCancel?: () => void
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Source */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Source <span className="text-red-400">*</span>
        </label>
        <input
          required
          type="text"
          value={form.source}
          onChange={(e) => setForm({ ...form, source: e.target.value })}
          placeholder="Main Job, Freelance, Side Project…"
          className={fieldCls}
        />
      </div>

      {/* Paycheck Date + Hours */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Paycheck Date <span className="text-red-400">*</span>
          </label>
          <input
            required
            type="date"
            value={form.paycheck_date}
            onChange={(e) => setForm({ ...form, paycheck_date: e.target.value })}
            className={fieldCls}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hours Worked</label>
          <input
            type="number"
            min="0"
            step="0.5"
            value={form.hours_worked}
            onChange={(e) => setForm({ ...form, hours_worked: e.target.value })}
            placeholder="Optional"
            className={fieldCls}
          />
        </div>
      </div>

      {/* Hourly Rate + Gross */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Hourly Rate</label>
          <DollarInput
            value={form.hourly_rate}
            onChange={(v) => setForm({ ...form, hourly_rate: v })}
            placeholder="Optional"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Gross Amount <span className="text-red-400">*</span>
          </label>
          <DollarInput value={form.gross_amount} onChange={onGrossChange} required />
        </div>
      </div>

      {/* Taxes + Net */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Taxes Withheld</label>
          <DollarInput value={form.taxes_withheld} onChange={onTaxesChange} placeholder="0.00" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-1.5">
            Net Amount
            {!netEdited && form.net_amount && (
              <span className="text-xs font-normal text-indigo-500">auto-calculated</span>
            )}
          </label>
          <DollarInput
            value={form.net_amount}
            onChange={onNetChange}
            highlighted={!netEdited && !!form.net_amount}
          />
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1">
          Notes <span className="text-xs font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Any extra details…"
          className={`${fieldCls} resize-none`}
        />
      </div>

      {/* Actions */}
      {onCancel ? (
        <div className="flex gap-3 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {submitting ? 'Saving…' : submitLabel}
          </button>
        </div>
      ) : (
        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-emerald-400 text-white font-semibold rounded-lg transition-colors text-base shadow-sm cursor-pointer disabled:cursor-not-allowed"
        >
          {submitting ? 'Saving…' : submitLabel}
        </button>
      )}
    </form>
  )
}

// ─── EditModal ────────────────────────────────────────────────────────────────

function EditModal({
  income,
  onClose,
  onSave,
}: {
  income: Income
  onClose: () => void
  onSave: (updated: Income) => void
}) {
  const [form, setForm] = useState<FormState>({
    source: income.source,
    paycheck_date: income.paycheck_date,
    hours_worked: income.hours_worked != null ? String(income.hours_worked) : '',
    hourly_rate: income.hourly_rate != null ? String(income.hourly_rate) : '',
    gross_amount: String(income.gross_amount),
    taxes_withheld: income.taxes_withheld != null ? String(income.taxes_withheld) : '',
    net_amount: income.net_amount != null ? String(income.net_amount) : '',
    notes: income.notes ?? '',
  })
  const [netEdited, setNetEdited] = useState(true)
  const [saving, setSaving] = useState(false)

  const handleGross = (v: string) =>
    setForm((f) => ({ ...f, gross_amount: v, net_amount: netEdited ? f.net_amount : computeNet(v, f.taxes_withheld) }))
  const handleTaxes = (v: string) =>
    setForm((f) => ({ ...f, taxes_withheld: v, net_amount: netEdited ? f.net_amount : computeNet(f.gross_amount, v) }))
  const handleNet = (v: string) => { setNetEdited(true); setForm((f) => ({ ...f, net_amount: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('income')
      .update({
        source: form.source,
        paycheck_date: form.paycheck_date,
        hours_worked: form.hours_worked ? parseFloat(form.hours_worked) : null,
        hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
        gross_amount: parseFloat(form.gross_amount),
        taxes_withheld: form.taxes_withheld ? parseFloat(form.taxes_withheld) : null,
        net_amount: form.net_amount ? parseFloat(form.net_amount) : null,
        notes: form.notes || null,
      })
      .eq('id', income.id)
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Failed to update income'); return }
    toast.success('Income updated')
    onSave(data)
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-slate-800">Edit Income Entry</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5">
          <IncomeForm
            form={form}
            setForm={setForm}
            netEdited={netEdited}
            onGrossChange={handleGross}
            onTaxesChange={handleTaxes}
            onNetChange={handleNet}
            onSubmit={handleSubmit}
            submitting={saving}
            submitLabel="Save Changes"
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IncomePage() {
  const [form, setForm] = useState<FormState>(defaultForm())
  const [netEdited, setNetEdited] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [history, setHistory] = useState<Income[]>([])
  const [summary, setSummary] = useState({ gross: 0, taxes: 0, net: 0, taxRate: 0 })
  const [monthLabel, setMonthLabel] = useState('')
  const [editingIncome, setEditingIncome] = useState<Income | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMonth, setSelectedMonth] = useState<MonthValue>(() => {
    const now = new Date()
    return { year: now.getFullYear(), month: now.getMonth() + 1 }
  })

  useEffect(() => {
    fetchData(selectedMonth.year, selectedMonth.month)
  }, [selectedMonth])

  async function fetchData(year: number, month: number) {
    setLoading(true)
    try {
      const { first, last, label } = monthRange(year, month)
      setMonthLabel(label)
      const [{ data: all }, { data: monthData }] = await Promise.all([
        supabase.from('income').select('*').order('paycheck_date', { ascending: false }),
        supabase
          .from('income')
          .select('gross_amount, taxes_withheld, net_amount')
          .gte('paycheck_date', first)
          .lte('paycheck_date', last),
      ])
      setHistory(all ?? [])
      const gross = monthData?.reduce((s, r) => s + Number(r.gross_amount), 0) ?? 0
      const taxes = monthData?.reduce((s, r) => s + Number(r.taxes_withheld ?? 0), 0) ?? 0
      const net = monthData?.reduce((s, r) => s + Number(r.net_amount ?? 0), 0) ?? 0
      setSummary({ gross, taxes, net, taxRate: gross > 0 ? (taxes / gross) * 100 : 0 })
    } catch {
      toast.error('Failed to load income data')
    } finally {
      setLoading(false)
    }
  }

  const handleGross = (v: string) =>
    setForm((f) => ({ ...f, gross_amount: v, net_amount: netEdited ? f.net_amount : computeNet(v, f.taxes_withheld) }))
  const handleTaxes = (v: string) =>
    setForm((f) => ({ ...f, taxes_withheld: v, net_amount: netEdited ? f.net_amount : computeNet(f.gross_amount, v) }))
  const handleNet = (v: string) => { setNetEdited(true); setForm((f) => ({ ...f, net_amount: v })) }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const { error } = await supabase.from('income').insert({
      source: form.source,
      paycheck_date: form.paycheck_date,
      hours_worked: form.hours_worked ? parseFloat(form.hours_worked) : null,
      hourly_rate: form.hourly_rate ? parseFloat(form.hourly_rate) : null,
      gross_amount: parseFloat(form.gross_amount),
      taxes_withheld: form.taxes_withheld ? parseFloat(form.taxes_withheld) : null,
      net_amount: form.net_amount ? parseFloat(form.net_amount) : null,
      notes: form.notes || null,
    })
    setSubmitting(false)
    if (error) { toast.error('Failed to save income'); return }
    toast.success('Income logged!')
    setForm(defaultForm())
    setNetEdited(false)
    fetchData(selectedMonth.year, selectedMonth.month)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('income').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Income deleted')
    setDeleteId(null)
    fetchData(selectedMonth.year, selectedMonth.month)
  }

  function handleEditSave(updated: Income) {
    setHistory((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    setEditingIncome(null)
    fetchData(selectedMonth.year, selectedMonth.month)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">Income</h1>
        <MonthPicker value={selectedMonth} onChange={setSelectedMonth} />
      </div>

      {/* Add income form */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Log Income</h2>
        <IncomeForm
          form={form}
          setForm={setForm}
          netEdited={netEdited}
          onGrossChange={handleGross}
          onTaxesChange={handleTaxes}
          onNetChange={handleNet}
          onSubmit={handleSubmit}
          submitting={submitting}
          submitLabel="+ Log Income"
        />
      </div>

      {/* Monthly summary */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">{monthLabel}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {loading ? (
          [
            'bg-emerald-50 border-emerald-100',
            'bg-rose-50 border-rose-100',
            'bg-indigo-50 border-indigo-100',
            'bg-amber-50 border-amber-100',
          ].map((colors) => (
            <div key={colors} className={`rounded-xl border p-4 ${colors}`}>
              <Bone className="h-2.5 w-20 mb-3" />
              <Bone className="h-7 w-28" />
            </div>
          ))
        ) : (
          <>
            <SummaryCard
              label="Gross Income"
              value={`$${summary.gross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              colors="bg-emerald-50 border-emerald-100 text-emerald-800"
            />
            <SummaryCard
              label="Taxes Withheld"
              value={`$${summary.taxes.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              colors="bg-rose-50 border-rose-100 text-rose-800"
            />
            <SummaryCard
              label="Net Income"
              value={`$${summary.net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              colors="bg-indigo-50 border-indigo-100 text-indigo-800"
            />
            <SummaryCard
              label="Effective Tax Rate"
              value={`${summary.taxRate.toFixed(1)}%`}
              sub={summary.gross > 0
                ? `$${summary.taxes.toFixed(0)} of $${summary.gross.toFixed(0)}`
                : 'No income this month'}
              colors="bg-amber-50 border-amber-100 text-amber-800"
            />
          </>
        )}
      </div>

      {/* History table */}
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Income History</h2>

      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Date', 'Source', 'Gross', 'Taxes', 'Net', 'Hours', 'Rate', 'Notes', 'Actions'].map((h, i) => (
                    <th key={h} className={`px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${i >= 2 && i <= 6 ? 'text-right' : i === 8 ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[20, 32, 20, 20, 20, 12, 16, 28, 20].map((w, j) => (
                      <td key={j} className="px-3 py-3.5">
                        <Bone className={`h-3 w-${w}`} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : history.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-sm text-slate-400">
          No income logged yet — add your first entry above!
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 bg-slate-50">
                <tr>
                  {['Date', 'Source', 'Gross', 'Taxes', 'Net', 'Hours', 'Rate', 'Notes', 'Actions'].map((h, i) => (
                    <th
                      key={h}
                      className={`px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap ${
                        i >= 2 && i <= 6 ? 'text-right' : i === 8 ? 'text-right' : 'text-left'
                      }`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {history.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(entry.paycheck_date)}
                    </td>
                    <td className="px-3 py-3 font-medium text-slate-800 max-w-[140px]">
                      <span className="block truncate" title={entry.source}>{entry.source}</span>
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap font-semibold text-emerald-700">
                      ${Number(entry.gross_amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-rose-600">
                      {entry.taxes_withheld != null
                        ? `$${Number(entry.taxes_withheld).toFixed(2)}`
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap font-semibold text-indigo-700">
                      {entry.net_amount != null
                        ? `$${Number(entry.net_amount).toFixed(2)}`
                        : <span className="text-slate-400 font-normal">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-slate-500">
                      {entry.hours_worked != null ? entry.hours_worked : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 text-right whitespace-nowrap text-slate-500">
                      {entry.hourly_rate != null
                        ? `$${Number(entry.hourly_rate).toFixed(2)}`
                        : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 max-w-[160px]">
                      <span className="block truncate text-xs text-slate-400" title={entry.notes ?? ''}>
                        {entry.notes || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      {deleteId === entry.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-slate-500 mr-0.5">Delete?</span>
                          <button
                            onClick={() => handleDelete(entry.id)}
                            className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded font-medium transition-colors"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteId(null)}
                            className="text-xs px-2 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium transition-colors"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingIncome(entry)}
                            className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(entry.id)}
                            className="text-xs px-2.5 py-1 border border-red-200 hover:bg-red-50 text-red-600 rounded font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editingIncome && (
        <EditModal
          income={editingIncome}
          onClose={() => setEditingIncome(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
