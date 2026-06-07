import clsx from 'clsx'
import Spinner from './Spinner'

const variants = {
  primary: 'bg-brand hover:bg-brand-hover text-white border border-brand/20',
  secondary: 'bg-dark-elevated hover:bg-dark-hover text-text-primary border border-dark-border',
  danger: 'bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-600/20',
  ghost: 'bg-transparent hover:bg-dark-hover text-text-secondary hover:text-text-primary border border-transparent',
}

const sizes = {
  sm: 'px-3 py-1.5 text-xs rounded',
  md: 'px-4 py-2 text-sm rounded',
  lg: 'px-6 py-2.5 text-base rounded-lg',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  children,
  className,
  ...rest
}) {
  return (
    <button
      disabled={disabled || loading}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-medium transition-default',
        'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-1 focus:ring-offset-dark-base',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  )
}
