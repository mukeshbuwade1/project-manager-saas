import clsx from 'clsx'

const sizes = {
  sm: 'w-3.5 h-3.5 border-2',
  md: 'w-5 h-5 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-3',
}

export default function Spinner({ size = 'md', className }) {
  return (
    <div
      className={clsx(
        'rounded-full border-transparent border-t-current animate-spin',
        sizes[size],
        className
      )}
      style={{ borderTopColor: 'currentColor' }}
    />
  )
}
