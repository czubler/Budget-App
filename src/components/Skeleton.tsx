export function Bone({ className }: { className?: string }) {
  return <div className={`bg-slate-200 animate-pulse rounded ${className ?? ''}`} />
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <Bone className="h-2.5 w-16 mb-2.5" />
      <Bone className="h-7 w-28 mb-1" />
    </div>
  )
}

export function SkeletonTableRows({ cols, rows = 6 }: { cols: number; rows?: number }) {
  const widths = ['w-20', 'w-32', 'w-24', 'w-16', 'w-14', 'w-20', 'w-12', 'w-16']
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <tr key={i} className="border-b border-slate-100 last:border-0">
          {Array.from({ length: cols }).map((_, j) => (
            <td key={j} className="px-3 py-3">
              <Bone className={`h-3 ${widths[j % widths.length]}`} />
            </td>
          ))}
        </tr>
      ))}
    </>
  )
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-8 text-center">
      <p className="text-2xl mb-2">⚠️</p>
      <p className="text-sm font-medium text-red-700 mb-4">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-6 py-14 text-center">
      {icon && <p className="text-4xl mb-3">{icon}</p>}
      <p className="text-sm font-semibold text-slate-600 mb-1">{title}</p>
      {description && <p className="text-xs text-slate-400 mb-4">{description}</p>}
      {action}
    </div>
  )
}
