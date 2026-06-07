import clsx from 'clsx'

export default function Input({
  label,
  error,
  placeholder,
  type = 'text',
  className,
  id,
  ...rest
}) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="text-sm font-medium text-text-secondary">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        placeholder={placeholder}
        className={clsx(
          'w-full px-3 py-2 text-sm rounded',
          'bg-dark-surface border text-text-primary placeholder:text-text-muted',
          'focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand',
          'transition-default',
          error
            ? 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30'
            : 'border-dark-border',
          className
        )}
        {...rest}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
