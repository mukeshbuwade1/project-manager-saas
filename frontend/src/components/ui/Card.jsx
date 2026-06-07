import clsx from 'clsx'

export default function Card({ children, className, padding = true }) {
  return (
    <div className={clsx('glass-card', padding && 'p-5', className)}>
      {children}
    </div>
  )
}
