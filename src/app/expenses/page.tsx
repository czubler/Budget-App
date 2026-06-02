'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import type { Expense } from '@/lib/types'
import { useCategories } from '@/lib/useCategories'
import { usePaymentMethods } from '@/lib/usePaymentMethods'
import { CategoryBadge } from '@/components/CategoryBadge'
import { CategoryPicker } from '@/components/CategoryPicker'
import type { PaymentMethod } from '@/lib/types'

const PAGE_SIZE = 25

const STATIC_PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Venmo', 'Zelle', 'Check', 'Other']

type SortCol = 'date' | 'description' | 'merchant' | 'category' | 'amount' | 'payment_method'

type Filters = {
  categories: string[]
  paymentMethods: string[]
  startDate: string
  endDate: string
  search: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function withFilters(q: any, f: Filters): any {
  if (f.categories.length > 0) q = q.in('category', f.categories)
  if (f.paymentMethods.length > 0) q = q.in('payment_method', f.paymentMethods)
  if (f.startDate) q = q.gte('date', f.startDate)
  if (f.endDate) q = q.lte('date', f.endDate)
  if (f.search) q = q.or(`description.ilike.%${f.search}%,merchant.ilike.%${f.search}%`)
  return q
}

function useDebounce<T>(value: T, ms: number): T {
  const [dv, setDv] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDv(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return dv
}

function MultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: string[]
  selected: string[]
  onChange: (v: string[]) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const toggle = (opt: string) =>
    onChange(selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt])

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 rounded-lg text-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-w-[145px] justify-between"
      >
        <span className={selected.length === 0 ? 'text-slate-400' : 'text-slate-700'}>
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <svg className="w-3.5 h-3.5 text-slate-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 z-20 bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] py-1 max-h-56 overflow-y-auto">
          {selected.length > 0 && (
            <button
              type="button"
              onClick={() => onChange([])}
              className="w-full text-left px-3 py-1.5 text-xs text-indigo-600 hover:bg-slate-50 font-medium border-b border-slate-100"
            >
              Clear all
            </button>
          )}
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 hover:bg-slate-50 cursor-pointer text-sm text-slate-700 select-none"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => toggle(opt)}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

const inputCls =
  'px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white'

function EditModal({
  expense,
  dbPaymentMethods,
  onClose,
  onSave,
}: {
  expense: Expense
  dbPaymentMethods: PaymentMethod[]
  onClose: () => void
  onSave: (updated: Expense) => void
}) {
  const { names: categories } = useCategories()
  const [form, setForm] = useState({
    description: expense.description ?? '',
    merchant: expense.merchant ?? '',
    amount: String(expense.amount),
    date: expense.date,
    payment_method: expense.payment_method ?? '',
    category: expense.category ?? '',
    notes: expense.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data, error } = await supabase
      .from('expenses')
      .update({
        description: form.description || null,
        merchant: form.merchant || null,
        amount: parseFloat(form.amount),
        date: form.date,
        payment_method: form.payment_method || null,
        category: form.category || null,
        notes: form.notes || null,
      })
      .eq('id', expense.id)
      .select()
      .single()
    setSaving(false)
    if (error) { toast.error('Failed to update expense'); return }
    toast.success('Expense updated')
    onSave(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-slate-800">Edit Expense</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
            <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={`${inputCls} w-full`} placeholder="What was this for?" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Merchant / Store</label>
            <input type="text" value={form.merchant} onChange={(e) => setForm({ ...form, merchant: e.target.value })} className={`${inputCls} w-full`} placeholder="Where did you spend?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount <span className="text-red-400">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm select-none">$</span>
                <input required type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={`${inputCls} w-full pl-7`} placeholder="0.00" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date <span className="text-red-400">*</span></label>
              <input required type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className={`${inputCls} w-full`} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment Method</label>
            <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className={`${inputCls} w-full`}>
              <option value="">Select...</option>
              {dbPaymentMethods.length > 0 && (
                <optgroup label="Cards">
                  {dbPaymentMethods.map((m) => <option key={m.id} value={m.nickname}>{m.nickname}</option>)}
                </optgroup>
              )}
              <optgroup label={dbPaymentMethods.length > 0 ? 'Other' : ''}>
                {STATIC_PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                {/* show legacy value if not already in any list */}
                {form.payment_method &&
                  !dbPaymentMethods.some((m) => m.nickname === form.payment_method) &&
                  !STATIC_PAYMENT_METHODS.includes(form.payment_method) && (
                    <option value={form.payment_method}>{form.payment_method}</option>
                  )}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-xs font-normal text-slate-400">(optional)</span></label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className={`${inputCls} w-full resize-none`} placeholder="Any extra details..." />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-slate-50 font-medium transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-semibold transition-colors">
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function SortIcon({ col, sortCol, sortDir }: { col: SortCol; sortCol: SortCol; sortDir: 'asc' | 'desc' }) {
  if (col !== sortCol) return <span className="ml-1 text-slate-300 font-normal">↕</span>
  return <span className="ml-1 text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ExpensesPage() {
  const { names: categories } = useCategories()
  const { methods: dbPaymentMethods } = usePaymentMethods()
  const _pmSet = new Set([...dbPaymentMethods.map((m) => m.nickname), ...STATIC_PAYMENT_METHODS])
  const paymentMethodOptions = Array.from(_pmSet)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const [filteredTotal, setFilteredTotal] = useState(0)
  const [sortCol, setSortCol] = useState<SortCol>('date')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [filterCategories, setFilterCategories] = useState<string[]>([])
  const [filterPaymentMethods, setFilterPaymentMethods] = useState<string[]>([])
  const [filterStartDate, setFilterStartDate] = useState('')
  const [filterEndDate, setFilterEndDate] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 350)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const filters: Filters = {
    categories: filterCategories,
    paymentMethods: filterPaymentMethods,
    startDate: filterStartDate,
    endDate: filterEndDate,
    search: debouncedSearch,
  }

  const fetchExpenses = useCallback(async () => {
    setLoading(true)
    const f: Filters = {
      categories: filterCategories,
      paymentMethods: filterPaymentMethods,
      startDate: filterStartDate,
      endDate: filterEndDate,
      search: debouncedSearch,
    }

    const start = page * PAGE_SIZE
    const end = start + PAGE_SIZE - 1

    const [{ data, count }, { data: amounts }] = await Promise.all([
      withFilters(supabase.from('expenses').select('*', { count: 'exact' }), f)
        .order(sortCol, { ascending: sortDir === 'asc' })
        .range(start, end),
      withFilters(supabase.from('expenses').select('amount'), f),
    ])

    setExpenses(data ?? [])
    setTotalCount(count ?? 0)
    setFilteredTotal(amounts?.reduce((s: number, e: { amount: unknown }) => s + Number(e.amount), 0) ?? 0)
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sortCol, sortDir, filterCategories, filterPaymentMethods, filterStartDate, filterEndDate, debouncedSearch])

  // Reset to page 0 when any filter or sort changes
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    setPage(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, filterCategories, filterPaymentMethods, filterStartDate, filterEndDate, sortCol, sortDir])

  useEffect(() => { fetchExpenses() }, [fetchExpenses])

  function handleSort(col: SortCol) {
    if (col === sortCol) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortCol(col); setSortDir('asc') }
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from('expenses').delete().eq('id', id)
    if (error) { toast.error('Failed to delete'); return }
    toast.success('Expense deleted')
    setDeleteId(null)
    fetchExpenses()
  }

  function handleEditSave(updated: Expense) {
    setExpenses((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
    setEditingExpense(null)
    // Refresh total in case amount changed
    fetchExpenses()
  }

  async function handleExportCSV() {
    setExporting(true)
    const { data } = await withFilters(supabase.from('expenses').select('*'), filters)
      .order(sortCol, { ascending: sortDir === 'asc' })
    setExporting(false)
    if (!data) return

    const headers = ['Date', 'Description', 'Merchant', 'Category', 'Amount', 'Payment Method', 'Notes']
    const rows = data.map((e: Expense) => [
      e.date,
      e.description ?? '',
      e.merchant ?? '',
      e.category ?? '',
      Number(e.amount).toFixed(2),
      e.payment_method ?? '',
      (e.notes ?? '').replace(/\n/g, ' '),
    ])
    const csv = [headers, ...rows]
      .map((row) => row.map((v: string) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `expenses-${new Date().toISOString().split('T')[0]}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const hasActiveFilters =
    filterCategories.length > 0 || filterPaymentMethods.length > 0 ||
    filterStartDate || filterEndDate || search

  function thCls(col: SortCol) {
    return `px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider cursor-pointer select-none whitespace-nowrap transition-colors hover:bg-slate-100 ${
      sortCol === col ? 'text-indigo-600 bg-indigo-50' : 'text-slate-500'
    }`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold text-slate-800">All Expenses</h1>
        <button
          onClick={handleExportCSV}
          disabled={exporting || totalCount === 0}
          className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-700 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium bg-white shadow-sm"
        >
          {exporting ? 'Exporting…' : '↓ Export CSV'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4 space-y-3 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search description or merchant…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <MultiSelect options={categories} selected={filterCategories} onChange={setFilterCategories} placeholder="Category" />
          <MultiSelect options={paymentMethodOptions} selected={filterPaymentMethods} onChange={setFilterPaymentMethods} placeholder="Payment Method" />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs text-slate-500 font-medium">Date range:</span>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <span className="text-xs text-slate-400">to</span>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          {hasActiveFilters && (
            <button
              onClick={() => {
                setSearch('')
                setFilterCategories([])
                setFilterPaymentMethods([])
                setFilterStartDate('')
                setFilterEndDate('')
              }}
              className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
            >
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 bg-slate-50">
              <tr>
                <th className={thCls('date')} onClick={() => handleSort('date')}>
                  Date <SortIcon col="date" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={thCls('description')} onClick={() => handleSort('description')}>
                  Description <SortIcon col="description" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={thCls('merchant')} onClick={() => handleSort('merchant')}>
                  Merchant <SortIcon col="merchant" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={thCls('category')} onClick={() => handleSort('category')}>
                  Category <SortIcon col="category" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th
                  className={`${thCls('amount')} text-right`}
                  onClick={() => handleSort('amount')}
                >
                  Amount <SortIcon col="amount" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className={thCls('payment_method')} onClick={() => handleSort('payment_method')}>
                  Payment <SortIcon col="payment_method" sortCol={sortCol} sortDir={sortDir} />
                </th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-3 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 7 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    {[20, 32, 24, 16, 14, 20, 24, 16].map((w, j) => (
                      <td key={j} className="px-3 py-3.5">
                        <div className={`h-3 bg-slate-200 animate-pulse rounded w-${w}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-14 text-center text-sm text-slate-400">
                    {hasActiveFilters ? 'No expenses match your filters.' : 'No expenses yet — add one from the home page!'}
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(expense.date)}
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      <span
                        className="block truncate font-medium text-slate-800"
                        title={expense.description ?? ''}
                      >
                        {expense.description || <span className="text-slate-400 font-normal">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 max-w-[140px]">
                      <span
                        className="block truncate text-slate-600"
                        title={expense.merchant ?? ''}
                      >
                        {expense.merchant || <span className="text-slate-400">—</span>}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      {expense.category
                        ? <CategoryBadge category={expense.category} />
                        : <span className="text-slate-400">—</span>
                      }
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right font-semibold text-slate-800">
                      ${Number(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-xs text-slate-500">
                      {expense.payment_method || <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-3 py-3 max-w-[180px]">
                      <span
                        className="block truncate text-xs text-slate-400"
                        title={expense.notes ?? ''}
                      >
                        {expense.notes || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-right">
                      {deleteId === expense.id ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-xs text-slate-500 mr-0.5">Delete?</span>
                          <button
                            onClick={() => handleDelete(expense.id)}
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
                            onClick={() => setEditingExpense(expense)}
                            className="text-xs px-2.5 py-1 border border-slate-300 hover:bg-slate-50 text-slate-600 rounded font-medium transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => setDeleteId(expense.id)}
                            className="text-xs px-2.5 py-1 border border-red-200 hover:bg-red-50 text-red-600 rounded font-medium transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table footer */}
        <div className="px-4 py-3 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-500">
              Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 border border-slate-300 rounded text-xs font-medium text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next →
            </button>
          </div>

          <p className="text-xs text-slate-500">
            <span className="font-semibold text-slate-700">{totalCount.toLocaleString()}</span>{' '}
            {totalCount === 1 ? 'expense' : 'expenses'} totaling{' '}
            <span className="font-semibold text-slate-700">${filteredTotal.toFixed(2)}</span>
          </p>
        </div>
      </div>

      {editingExpense && (
        <EditModal
          expense={editingExpense}
          dbPaymentMethods={dbPaymentMethods}
          onClose={() => setEditingExpense(null)}
          onSave={handleEditSave}
        />
      )}
    </div>
  )
}
