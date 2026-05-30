'use client'

export type MonthValue = { year: number; month: number }

function label(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
}

export function MonthPicker({
  value,
  onChange,
}: {
  value: MonthValue
  onChange: (m: MonthValue) => void
}) {
  const now = new Date()
  const isCurrentMonth = value.year === now.getFullYear() && value.month === now.getMonth() + 1

  function prev() {
    onChange(value.month === 1
      ? { year: value.year - 1, month: 12 }
      : { year: value.year, month: value.month - 1 })
  }

  function next() {
    onChange(value.month === 12
      ? { year: value.year + 1, month: 1 }
      : { year: value.year, month: value.month + 1 })
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={prev}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
        title="Previous month"
      >
        <i className="ti ti-chevron-left" style={{ fontSize: 16 }} />
      </button>

      <span className="text-sm font-semibold text-slate-700 min-w-[130px] text-center select-none">
        {label(value.year, value.month)}
      </span>

      <button
        onClick={next}
        disabled={isCurrentMonth}
        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        title="Next month"
      >
        <i className="ti ti-chevron-right" style={{ fontSize: 16 }} />
      </button>

      {!isCurrentMonth && (
        <button
          onClick={() => onChange({ year: now.getFullYear(), month: now.getMonth() + 1 })}
          className="ml-1 text-xs font-medium"
          style={{ color: '#7F77DD' }}
        >
          Today
        </button>
      )}
    </div>
  )
}
