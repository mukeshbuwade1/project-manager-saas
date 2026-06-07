import { memo, useCallback } from 'react'
import Button from '../ui/Button'

function EmptyState({ icon, title, description, action }) {
  // Stable handler — avoids creating a new function on every render when
  // this component is used inside memoized parent trees.
  const handleAction = useCallback(() => {
    action?.onClick?.()
  }, [action?.onClick])

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="text-5xl mb-4 opacity-40">{icon}</div>
      )}
      <h3 className="text-base font-semibold text-text-primary mb-2">{title}</h3>
      {description && (
        <p className="text-text-muted text-sm max-w-xs mb-6">{description}</p>
      )}
      {action && (
        <Button
          variant={action.variant ?? 'primary'}
          onClick={handleAction}
          size="md"
        >
          {action.label}
        </Button>
      )}
    </div>
  )
}

export default memo(EmptyState)
