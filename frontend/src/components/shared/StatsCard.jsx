import { memo, useMemo } from 'react'
import clsx from 'clsx'

const COLOR_MAP = {
  brand:  'text-brand bg-brand/10',
  green:  'text-green-400 bg-green-500/10',
  yellow: 'text-yellow-400 bg-yellow-500/10',
  blue:   'text-blue-400 bg-blue-500/10',
  red:    'text-red-400 bg-red-500/10',
}

function StatsCard({ title, value, icon, color = 'brand', subtitle }) {
  const iconClass = useMemo(
    () => clsx('p-2.5 rounded-lg text-xl', COLOR_MAP[color] ?? COLOR_MAP.brand),
    [color],
  )

  return (
    <div className="glass-card p-5 flex items-start gap-4">
      <div className={iconClass}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-text-muted text-xs font-medium uppercase tracking-wide mb-1">
          {title}
        </p>
        <p className="text-2xl font-bold text-text-primary">{value ?? '—'}</p>
        {subtitle && (
          <p className="text-text-muted text-xs mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  )
}

export default memo(StatsCard)
