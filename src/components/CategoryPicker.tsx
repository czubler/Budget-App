import { getCategoryConfig } from '@/lib/categoryConfig'

export function CategoryPicker({
  value,
  onChange,
  categories,
}: {
  value: string
  onChange: (v: string) => void
  categories: string[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {categories.map((cat) => {
        const { icon, bg, iconBg, text } = getCategoryConfig(cat)
        const selected = value === cat
        return (
          <button
            key={cat}
            type="button"
            onClick={() => onChange(selected ? '' : cat)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all"
            style={{
              background: selected ? iconBg : bg,
              color: text,
              outline: selected ? `2px solid ${text}` : '2px solid transparent',
              outlineOffset: '1px',
            }}
          >
            <i className={`ti ${icon}`} style={{ fontSize: 11 }} />
            {cat}
          </button>
        )
      })}
    </div>
  )
}
