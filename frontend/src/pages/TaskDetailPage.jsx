import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../components/ui/Toast'
import api from '../lib/axios'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import Avatar from '../components/shared/Avatar'
import { formatDate, toInputDate } from '../lib/utils'

export default function TaskDetailPage() {
  const { taskId } = useParams()
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wsId = currentWorkspace?._id || currentWorkspace?.id

  const [editTitle, setEditTitle] = useState(false)
  const [titleVal, setTitleVal] = useState('')
  const [commentText, setCommentText] = useState('')

  const role = currentWorkspace?.role
  const canManage = role === 'admin' || role === 'manager'

  const { data: taskData, isLoading } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => api.get(`/tasks/${taskId}?workspaceId=${wsId}`).then((r) => r.data),
    enabled: !!taskId && !!wsId,
  })

  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: ['comments', taskId],
    // GET /api/comments/:taskId — workspaceId in query string for middleware
    queryFn: () => api.get(`/comments/${taskId}?workspaceId=${wsId}`).then((r) => r.data),
    enabled: !!taskId && !!wsId,
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => api.get(`/workspaces/${wsId}/members`).then((r) => r.data),
    enabled: !!wsId,
  })

  // backend: { success, data: { task } } / { data: { comments } } / { data: { members } }
  const task = taskData?.data?.task
  const comments = commentsData?.data?.comments || []
  const members = membersData?.data?.members || []

  useEffect(() => {
    if (task?.title) setTitleVal(task.title)
  }, [task?.title])

  const updateMutation = useMutation({
    // PUT /api/tasks/:id — full field update, workspaceId in body for middleware
    mutationFn: (updates) => api.put(`/tasks/${taskId}`, { ...updates, workspaceId: wsId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', wsId] })
      toast.success('Task updated')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  })

  const deleteMutation = useMutation({
    // DELETE /api/tasks/:id — workspaceId in query string for middleware
    mutationFn: () => api.delete(`/tasks/${taskId}?workspaceId=${wsId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', wsId] })
      toast.success('Task deleted')
      navigate(-1)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Delete failed'),
  })

  const commentMutation = useMutation({
    // POST /api/comments — backend expects taskId + message fields
    mutationFn: (message) => api.post('/comments', { taskId, message, workspaceId: wsId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', taskId] })
      setCommentText('')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to add comment'),
  })

  const handleTitleSave = () => {
    if (titleVal.trim() && titleVal !== task?.title) {
      updateMutation.mutate({ title: titleVal.trim() })
    }
    setEditTitle(false)
  }

  if (isLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand" /></div>
  }

  if (!task) {
    return (
      <div className="text-center py-16 text-text-muted">
        <p>Task not found</p>
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="mt-4">
          Go back
        </Button>
      </div>
    )
  }

  const projectId = task.project?._id || task.project?.id || task.projectId
  const projectName = task.project?.name || 'Project'

  return (
    <div className="space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs text-text-muted">
        <Link to="/dashboard" className="hover:text-text-secondary transition-colors">Dashboard</Link>
        <span>/</span>
        {projectId && (
          <>
            <Link to={`/projects/${projectId}`} className="hover:text-text-secondary transition-colors">
              {projectName}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-text-primary font-medium font-mono">
          {task.identifier || `#${taskId.slice(-6)}`}
        </span>
      </nav>

      <div className="flex gap-6 flex-col lg:flex-row">
        {/* Left: Main content (2/3) */}
        <div className="flex-1 space-y-5 min-w-0">
          {/* Title */}
          <div>
            {editTitle ? (
              <div className="flex gap-2 items-start">
                <input
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleTitleSave()
                    if (e.key === 'Escape') { setEditTitle(false); setTitleVal(task.title) }
                  }}
                  autoFocus
                  className="flex-1 text-xl font-bold bg-transparent border-b-2 border-brand text-text-primary focus:outline-none pb-1"
                />
              </div>
            ) : (
              <h1
                className="text-xl font-bold text-text-primary cursor-text hover:text-white transition-colors"
                onClick={() => setEditTitle(true)}
                title="Click to edit"
              >
                {task.title}
              </h1>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">Description</h3>
            <DescriptionEditor task={task} onSave={(desc) => updateMutation.mutate({ description: desc })} />
          </div>

          {/* Comments */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-text-muted uppercase tracking-wide">
              Comments ({comments.length})
            </h3>

            {commentsLoading ? (
              <Spinner size="sm" className="text-brand" />
            ) : comments.length === 0 ? (
              <p className="text-text-muted text-sm">No comments yet.</p>
            ) : (
              <div className="space-y-3">
                {comments.map((c) => {
                  // backend populates 'authorId', not 'author'
                  const author = c.authorId
                  return (
                    <div key={c._id || c.id} className="flex gap-3">
                      <Avatar name={author?.name || 'U'} src={author?.avatar} size="sm" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-xs font-semibold text-text-primary">
                            {author?.name || 'Unknown'}
                          </span>
                          <span className="text-text-muted text-xs">{formatDate(c.createdAt)}</span>
                        </div>
                        {/* backend stores comment text as 'message', not 'content' */}
                        <p className="text-sm text-text-secondary bg-dark-elevated rounded-lg px-3 py-2 whitespace-pre-wrap break-words">
                          {c.message}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Add comment */}
            <div className="flex gap-3 pt-2">
              <Avatar name={user?.name || ''} size="sm" />
              <div className="flex-1">
                <textarea
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-default resize-none"
                />
                <div className="flex justify-end mt-2">
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!commentText.trim()}
                    loading={commentMutation.isPending}
                    onClick={() => commentText.trim() && commentMutation.mutate(commentText.trim())}
                  >
                    Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Metadata sidebar (1/3) */}
        <div className="lg:w-64 shrink-0 space-y-4">
          <div className="glass-card p-4 space-y-4">
            {/* Status */}
            <MetaField label="Status">
              <select
                value={task.status}
                onChange={(e) => updateMutation.mutate({ status: e.target.value })}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-brand w-full"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </MetaField>

            {/* Priority */}
            <MetaField label="Priority">
              <select
                value={task.priority}
                onChange={(e) => updateMutation.mutate({ priority: e.target.value })}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-brand w-full"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </MetaField>

            {/* Assignee */}
            <MetaField label="Assignee">
              <select
                value={task.assignedTo?._id || ''}
                onChange={(e) => updateMutation.mutate({ assignedTo: e.target.value || null })}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-brand w-full"
              >
                <option value="">Unassigned</option>
                {members.map((m) => {
                  const u = m.userId || m.user || m
                  return (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.name}
                    </option>
                  )
                })}
              </select>
            </MetaField>

            {/* Due date */}
            <MetaField label="Due Date">
              <input
                type="date"
                value={toInputDate(task.dueDate)}
                onChange={(e) => updateMutation.mutate({ dueDate: e.target.value })}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-2 py-1.5 text-text-primary focus:outline-none focus:border-brand w-full"
              />
            </MetaField>

            {/* Project link */}
            {projectId && (
              <MetaField label="Project">
                <Link
                  to={`/projects/${projectId}`}
                  className="text-sm text-brand hover:text-brand-muted transition-colors"
                >
                  {projectName}
                </Link>
              </MetaField>
            )}

            {/* Created */}
            <MetaField label="Created">
              <span className="text-sm text-text-secondary">{formatDate(task.createdAt)}</span>
            </MetaField>
          </div>

          {/* Danger zone */}
          {canManage && (
            <Button
              variant="danger"
              size="sm"
              className="w-full"
              loading={deleteMutation.isPending}
              onClick={() => {
                if (window.confirm('Delete this task? This cannot be undone.')) {
                  deleteMutation.mutate()
                }
              }}
            >
              Delete Task
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function MetaField({ label, children }) {
  return (
    <div>
      <p className="text-xs text-text-muted font-medium uppercase tracking-wide mb-1.5">{label}</p>
      {children}
    </div>
  )
}

function DescriptionEditor({ task, onSave }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(task.description || '')

  useEffect(() => {
    setValue(task.description || '')
  }, [task.description])

  if (editing) {
    return (
      <div className="space-y-2">
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          autoFocus
          className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-brand text-text-primary placeholder:text-text-muted focus:outline-none resize-none"
          placeholder="Describe the task..."
        />
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={() => { onSave(value); setEditing(false) }}>
            Save
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { setValue(task.description || ''); setEditing(false) }}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      onClick={() => setEditing(true)}
      className="min-h-[80px] px-3 py-2 rounded bg-dark-elevated border border-dark-border text-sm text-text-secondary cursor-text hover:border-dark-border-strong transition-colors"
    >
      {value ? (
        <p className="whitespace-pre-wrap">{value}</p>
      ) : (
        <p className="text-text-muted">Click to add a description...</p>
      )}
    </div>
  )
}
