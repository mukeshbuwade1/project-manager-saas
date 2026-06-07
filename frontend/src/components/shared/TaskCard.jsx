import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import Badge from '../ui/Badge'
import Avatar from './Avatar'
import { formatDueDate } from '../../lib/utils'

// Derive badge variant strings outside the component — pure lookups, no closure.
function statusVariant(status) {
  if (status === 'in_progress') return 'in_progress'
  if (status === 'completed')   return 'completed'
  return 'pending'
}

function priorityVariant(priority) {
  if (priority === 'high')   return 'high'
  if (priority === 'medium') return 'medium'
  return 'low'
}

function TaskCard({ task }) {
  const navigate  = useNavigate()
  const taskId    = task._id || task.id
  const assignee  = task.assignedTo || task.assignee

  const handleClick = useCallback(() => {
    navigate(`/tasks/${taskId}`)
  }, [navigate, taskId])

  return (
    <div
      onClick={handleClick}
      className="flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-surface border border-dark-border hover:bg-dark-elevated hover:border-dark-border-strong cursor-pointer transition-default group"
    >
      {/* Identifier */}
      <span className="text-text-muted text-xs font-mono w-16 shrink-0">
        {task.identifier ?? `#${(taskId ?? '').slice(-4)}`}
      </span>

      {/* Title */}
      <span className="flex-1 text-sm text-text-primary truncate group-hover:text-white transition-colors">
        {task.title}
      </span>

      {/* Status + priority badges */}
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={statusVariant(task.status)} />
        <Badge variant={priorityVariant(task.priority)} />
      </div>

      {/* Due date */}
      {task.dueDate && (
        <span className="text-text-muted text-xs shrink-0 w-20 text-right">
          {formatDueDate(task.dueDate)}
        </span>
      )}

      {/* Assignee avatar */}
      {assignee && (
        <Avatar
          name={assignee.name ?? ''}
          src={assignee.avatar}
          size="sm"
        />
      )}
    </div>
  )
}

export default memo(TaskCard)
