import { getCategoryConfig } from '@/lib/categoryConfig'

export function CategoryBadge({ category }: { category: string }) {
  const { icon, bg, iconBg, text } = getCategoryConfig(category)
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      <span
        className="flex items-center justify-center w-4 h-4 rounded-full shrink-0"
        style={{ background: iconBg }}
      >
        <i className={`ti ${icon}`} style={{ fontSize: 9, color: text }} />
      </span>
      {category}
    </span>
  )
}
