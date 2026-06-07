import { memo, useMemo } from 'react'
import Badge from '../ui/Badge'
import { formatDate } from '../../lib/utils'

const DEFAULT_COLOR = '#5E6AD2'

function statusVariant(status) {
  if (status === 'completed')   return 'completed'
  if (status === 'in_progress') return 'in_progress'
  return 'pending'
}

function ProjectCard({ project, onClick }) {
  // Memoize the style object so a new reference isn't created on every render.
  const dotStyle = useMemo(
    () => ({ backgroundColor: project.color ?? DEFAULT_COLOR }),
    [project.color],
  )

  return (
    <div
      onClick={onClick}
      className="glass-card p-5 cursor-pointer hover:border-dark-border-strong hover:bg-dark-elevated transition-default group"
    >
      {/* Color dot + name */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0" style={dotStyle} />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary group-hover:text-white transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-text-muted text-xs mt-0.5 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4">
        <Badge variant={statusVariant(project.status)} />
        <div className="flex items-center gap-3 text-text-muted text-xs">
          {project.taskCount !== undefined && (
            <span>{project.taskCount} tasks</span>
          )}
          <span>{formatDate(project.createdAt)}</span>
        </div>
      </div>
    </div>
  )
}

export default memo(ProjectCard)
