export default function ProgressBar({ value = 0, max = 100, color = 'blue', showLabel = true, size = 'md' }) {
  const pct = Math.min(100, Math.max(0, Math.round((value / max) * 100)))

  const colors = {
    blue:   'bg-brand-500',
    green:  'bg-green-500',
    yellow: 'bg-yellow-500',
    red:    'bg-red-500',
    purple: 'bg-purple-500',
  }

  const heights = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

  return (
    <div className="w-full">
      <div className={`w-full bg-surface rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full transition-all duration-500 ${colors[color] || colors.blue}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <div className="flex justify-between mt-1">
          <span className="text-xs text-slate-500">{value} / {max}</span>
          <span className="text-xs text-slate-400 font-medium">{pct}%</span>
        </div>
      )}
    </div>
  )
}
