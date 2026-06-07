import { memo } from 'react'
import clsx from 'clsx'

const VARIANT_STYLES = {
  pending:     'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  in_progress: 'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  completed:   'bg-green-500/15 text-green-400 border border-green-500/20',
  high:        'bg-red-500/15 text-red-400 border border-red-500/20',
  medium:      'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20',
  low:         'bg-blue-500/15 text-blue-400 border border-blue-500/20',
  info:        'bg-brand/15 text-brand border border-brand/20',
  default:     'bg-dark-elevated text-text-secondary border border-dark-border',
}

const VARIANT_LABELS = {
  pending:     'Pending',
  in_progress: 'In Progress',
  completed:   'Completed',
  high:        'High',
  medium:      'Medium',
  low:         'Low',
}

const BASE_CLASS = 'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium'

function Badge({ variant = 'default', children, className }) {
  return (
    <span
      className={clsx(
        BASE_CLASS,
        VARIANT_STYLES[variant] ?? VARIANT_STYLES.default,
        className
      )}
    >
      {children ?? VARIANT_LABELS[variant] ?? variant}
    </span>
  )
}

export default memo(Badge)
