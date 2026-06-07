import { memo, useMemo } from 'react'
import clsx from 'clsx'

const SIZE_CLASSES = {
  sm: 'w-6 h-6 text-xs',
  md: 'w-8 h-8 text-sm',
  lg: 'w-10 h-10 text-base',
  xl: 'w-14 h-14 text-xl',
}

const COLOR_POOL = [
  'bg-purple-600', 'bg-blue-600', 'bg-green-600', 'bg-amber-600',
  'bg-red-600',    'bg-indigo-600', 'bg-teal-600', 'bg-rose-600',
]

function nameToColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + hash * 31
  return COLOR_POOL[Math.abs(hash) % COLOR_POOL.length]
}

function getInitials(name) {
  if (!name) return '?'
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

function Avatar({ name = '', src, size = 'md', className }) {
  const sizeClass  = SIZE_CLASSES[size] ?? SIZE_CLASSES.md
  const colorClass = useMemo(() => nameToColor(name), [name])
  const initials   = useMemo(() => getInitials(name), [name])

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={clsx('rounded-full object-cover shrink-0', sizeClass, className)}
      />
    )
  }

  return (
    <div
      className={clsx(
        'rounded-full flex items-center justify-center font-semibold text-white shrink-0',
        sizeClass,
        colorClass,
        className,
      )}
      title={name}
    >
      {initials}
    </div>
  )
}

export default memo(Avatar)
