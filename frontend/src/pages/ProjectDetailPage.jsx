import { useState, useEffect, useMemo, useCallback, memo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../components/ui/Toast'
import api from '../lib/axios'
import TaskCard from '../components/shared/TaskCard'
import Badge from '../components/ui/Badge'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import ConfirmDeleteModal from '../components/ui/ConfirmDeleteModal'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/shared/EmptyState'
import Avatar from '../components/shared/Avatar'
import { formatDate, formatDueDate } from '../lib/utils'

const STATUSES = ['pending', 'in_progress', 'completed']
const STATUS_LABELS = { pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

const PROJECT_COLORS = [
  '#5E6AD2', '#2D9964', '#CD4945', '#CA8E1B',
  '#2E7CD1', '#8B5CF6', '#EC4899', '#14B8A6',
]

const PROJECT_STATUSES = [
  { value: 'active',    label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived',  label: 'Archived' },
]

const KanbanColumn = memo(function KanbanColumn({ status, tasks, onNewTask, canManage }) {
  const colTasks = useMemo(
    () => tasks.filter((t) => t.status === status),
    [tasks, status],
  )
  return (
    <div className="flex-1 min-w-[260px] flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <Badge variant={status} />
          <span className="text-text-muted text-xs">{colTasks.length}</span>
        </div>
        {canManage && status === 'pending' && (
          <button
            onClick={onNewTask}
            className="text-text-muted hover:text-brand transition-colors text-sm leading-none"
            title="Add task"
          >
            +
          </button>
        )}
      </div>
      <div className="space-y-2 min-h-32">
        {colTasks.map((task) => (
          <TaskCard key={task._id || task.id} task={task} />
        ))}
        {colTasks.length === 0 && (
          <div className="border-2 border-dashed border-dark-border rounded-lg p-4 text-center text-text-muted text-xs">
            No tasks
          </div>
        )}
      </div>
    </div>
  )
})

export default function ProjectDetailPage() {
  const { projectId } = useParams()
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wsId = currentWorkspace?._id || currentWorkspace?.id

  // role comes from workspace membership stored on currentWorkspace
  const role = currentWorkspace?.role
  const canManage = role === 'admin' || role === 'manager'

  // ── Edit project state ───────────────────────────────────────────────────────
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', description: '', status: 'active', color: '#5E6AD2' })
  const [editErrors, setEditErrors] = useState({})

  const updateProjectMutation = useMutation({
    mutationFn: (payload) => api.put(`/projects/${projectId}`, { ...payload, workspaceId: wsId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects', wsId] })
      toast.success('Project updated')
      setShowEditModal(false)
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update project'),
  })

  const deleteProjectMutation = useMutation({
    mutationFn: () => api.delete(`/projects/${projectId}?workspaceId=${wsId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', wsId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', wsId] })
      toast.success('Project deleted')
      navigate('/projects')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete project'),
  })

  const handleUpdateProject = (e) => {
    e.preventDefault()
    const errs = {}
    if (!editForm.name.trim()) errs.name = 'Project name is required'
    if (Object.keys(errs).length) { setEditErrors(errs); return }
    updateProjectMutation.mutate({
      name: editForm.name.trim(),
      description: editForm.description.trim(),
      status: editForm.status,
      color: editForm.color,
    })
  }

  const setEdit = (field) => (e) => {
    setEditForm((f) => ({ ...f, [field]: e.target.value }))
    setEditErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  // ── Task state ───────────────────────────────────────────────────────────────
  const [view, setView] = useState('list')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showTaskModal, setShowTaskModal] = useState(false)
  const [taskForm, setTaskForm] = useState({
    title: '', description: '', status: 'pending', priority: 'medium',
    assignedTo: '', dueDate: '',
  })
  const [taskErrors, setTaskErrors] = useState({})

  // Fetch project — backend: { success, data: { project, taskStats } }
  const { data: projectData, isLoading: projLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => api.get(`/projects/${projectId}?workspaceId=${wsId}`).then((r) => r.data),
    enabled: !!projectId && !!wsId,
  })

  // Fetch tasks — backend: { success, data: { tasks: [...] } }
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', wsId, projectId],
    queryFn: () => api.get(`/tasks?workspaceId=${wsId}&projectId=${projectId}`).then((r) => r.data),
    enabled: !!wsId && !!projectId,
  })

  // Fetch workspace members for assignee dropdown
  // backend: { success, data: { members: [...] } }
  const { data: membersData } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => api.get(`/workspaces/${wsId}/members`).then((r) => r.data),
    enabled: !!wsId,
  })

  const project = projectData?.data?.project
  const taskStats = projectData?.data?.taskStats
  const tasks = tasksData?.data?.tasks || []
  const members = membersData?.data?.members || []

  // Sync edit form when project data first loads (or project changes)
  // Must be declared after `project` to avoid TDZ
  useEffect(() => {
    if (project) {
      setEditForm({
        name: project.name || '',
        description: project.description || '',
        status: project.status || 'active',
        color: project.color || '#5E6AD2',
      })
    }
  }, [project?._id])

  const createTaskMutation = useMutation({
    mutationFn: (payload) => api.post('/tasks', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', wsId, projectId] })
      queryClient.invalidateQueries({ queryKey: ['tasks', wsId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', wsId] })
      toast.success('Task created!')
      closeTaskModal()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
  })

  const closeTaskModal = () => {
    setShowTaskModal(false)
    setTaskForm({ title: '', description: '', status: 'pending', priority: 'medium', assignedTo: '', dueDate: '' })
    setTaskErrors({})
  }

  const handleCreateTask = (e) => {
    e.preventDefault()
    const errs = {}
    if (!taskForm.title.trim()) errs.title = 'Task title is required'
    if (Object.keys(errs).length) { setTaskErrors(errs); return }

    createTaskMutation.mutate({
      title: taskForm.title,
      description: taskForm.description,
      status: taskForm.status,
      priority: taskForm.priority,
      assignedTo: taskForm.assignedTo || undefined,   // backend field name
      dueDate: taskForm.dueDate || undefined,
      projectId,          // link task → project
      workspaceId: wsId,  // link task → workspace (also required by workspaceMiddleware)
    })
  }

  const setTask = (field) => (e) => {
    setTaskForm((f) => ({ ...f, [field]: e.target.value }))
    setTaskErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  const filteredTasks = useMemo(() => {
    const lc = search.toLowerCase()
    return tasks.filter((t) => {
      const matchSearch  = !search || t.title?.toLowerCase().includes(lc)
      const matchStatus  = !filterStatus   || t.status   === filterStatus
      const matchPriority = !filterPriority || t.priority === filterPriority
      return matchSearch && matchStatus && matchPriority
    })
  }, [tasks, search, filterStatus, filterPriority])

  const openTaskModal  = useCallback(() => setShowTaskModal(true), [])
  const openEditModal  = useCallback(() => setShowEditModal(true), [])
  const closeEditModal = useCallback(() => { setShowEditModal(false); setEditErrors({}) }, [])

  if (projLoading) {
    return <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand" /></div>
  }

  if (!project) {
    return <EmptyState icon="▤" title="Project not found" description="This project may have been deleted." />
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div
            className="w-3 h-3 rounded-full mt-1.5 shrink-0"
            style={{ backgroundColor: project.color || '#5E6AD2' }}
          />
          <div>
            {/* Breadcrumb */}
            <div className="flex items-center gap-1 text-xs text-text-muted mb-1">
              <button onClick={() => navigate('/projects')} className="hover:text-text-secondary transition-colors">
                Projects
              </button>
              <span>/</span>
              <span className="text-text-secondary">{project.name}</span>
            </div>
            <h1 className="text-xl font-bold text-text-primary">{project.name}</h1>
            {project.description && (
              <p className="text-text-muted text-sm mt-0.5">{project.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <Badge variant={project.status === 'completed' ? 'completed' : project.status === 'archived' ? 'pending' : 'in_progress'} />
              <span className="text-text-muted text-xs">
                Workspace: <span className="text-text-secondary">{currentWorkspace?.name}</span>
              </span>
              <span className="text-text-muted text-xs">
                Created {formatDate(project.createdAt)}
              </span>
              {taskStats && (
                <span className="text-text-muted text-xs">
                  {taskStats.total} task{taskStats.total !== 1 ? 's' : ''}
                  {taskStats.completed > 0 && ` · ${taskStats.completed} done`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons — Admin/Manager only */}
        {canManage && (
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={openEditModal}>
              Edit Project
            </Button>
            <Button variant="primary" size="sm" onClick={openTaskModal}>
              + New Task
            </Button>
          </div>
        )}
      </div>

      {/* View switcher + filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex gap-1 bg-dark-elevated rounded-lg p-1 shrink-0">
          {['list', 'board'].map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-default ${
                view === v
                  ? 'bg-dark-surface text-text-primary shadow'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {v === 'list' ? '≡ List' : '⊞ Board'}
            </button>
          ))}
        </div>

        <div className="flex gap-2 flex-wrap flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-dark-surface border border-dark-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-text-secondary focus:outline-none focus:border-brand"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="text-xs bg-dark-surface border border-dark-border rounded px-2 py-1.5 text-text-secondary focus:outline-none focus:border-brand"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Content */}
      {tasksLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand" /></div>
      ) : view === 'board' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STATUSES.map((s) => (
            <KanbanColumn
              key={s}
              status={s}
              tasks={filteredTasks}
              canManage={canManage}
              onNewTask={() => {
                setTaskForm((f) => ({ ...f, status: s }))
                setShowTaskModal(true)
              }}
            />
          ))}
        </div>
      ) : filteredTasks.length === 0 ? (
        <EmptyState
          icon="✓"
          title="No tasks found"
          description={
            tasks.length === 0
              ? canManage
                ? 'Create the first task for this project.'
                : 'No tasks have been created yet.'
              : 'No tasks match your current filters.'
          }
          action={canManage && tasks.length === 0 ? { label: '+ New Task', onClick: () => setShowTaskModal(true) } : undefined}
        />
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[90px_1fr_130px_100px_110px_60px] gap-2 px-4 py-2.5 border-b border-dark-border bg-dark-elevated text-text-muted text-xs font-medium">
            <span>ID</span>
            <span>Title</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due Date</span>
            <span>Assignee</span>
          </div>
          {filteredTasks.map((task) => (
            <div
              key={task._id || task.id}
              onClick={() => navigate(`/tasks/${task._id || task.id}`)}
              className="grid grid-cols-[90px_1fr_130px_100px_110px_60px] gap-2 px-4 py-3 border-b border-dark-border last:border-0 hover:bg-dark-elevated cursor-pointer transition-default text-sm group"
            >
              <span className="text-text-muted text-xs font-mono self-center">
                {task.identifier || `#${(task._id || task.id || '').slice(-4)}`}
              </span>
              <span className="text-text-primary self-center truncate group-hover:text-white transition-colors">
                {task.title}
              </span>
              <span className="self-center">
                <Badge variant={task.status === 'in_progress' ? 'in_progress' : task.status === 'completed' ? 'completed' : 'pending'} />
              </span>
              <span className="self-center">
                <Badge variant={task.priority || 'medium'} />
              </span>
              <span className="text-text-muted text-xs self-center">
                {task.dueDate ? formatDueDate(task.dueDate) : '—'}
              </span>
              <span className="self-center">
                {task.assignedTo ? (
                  <Avatar name={task.assignedTo.name || ''} src={task.assignedTo.avatar} size="sm" />
                ) : (
                  <span className="text-text-muted text-xs">—</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create task modal */}
      <Modal isOpen={showTaskModal} onClose={closeTaskModal} title="New Task" size="md">
        <form onSubmit={handleCreateTask} noValidate className="space-y-4">
          {/* Context pill — shows project + workspace linkage */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-dark-elevated border border-dark-border text-text-secondary">
              <span style={{ color: project.color || '#5E6AD2' }}>●</span>
              {project.name}
            </span>
            <span className="text-text-muted text-xs">in</span>
            <span className="text-xs text-text-muted">{currentWorkspace?.name}</span>
          </div>

          <Input
            label="Task title"
            placeholder="Implement feature X..."
            value={taskForm.title}
            onChange={setTask('title')}
            error={taskErrors.title}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Description <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="What needs to be done?"
              value={taskForm.description}
              onChange={setTask('description')}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-default resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Status</label>
              <select
                value={taskForm.status}
                onChange={setTask('status')}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-brand"
              >
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Priority</label>
              <select
                value={taskForm.priority}
                onChange={setTask('priority')}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-brand"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Due Date</label>
              <input
                type="date"
                value={taskForm.dueDate}
                onChange={setTask('dueDate')}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-brand"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Assign to</label>
              <select
                value={taskForm.assignedTo}
                onChange={setTask('assignedTo')}  // matches backend field name
                className="text-sm bg-dark-elevated border border-dark-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-brand"
              >
                <option value="">Unassigned</option>
                {members.map((m) => {
                  const u = m.userId || m.user || m
                  return (
                    <option key={u._id || u.id} value={u._id || u.id}>
                      {u.name} ({m.role})
                    </option>
                  )
                })}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="secondary" size="sm" onClick={closeTaskModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={createTaskMutation.isPending}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Project Confirmation ───────────────────────────────────── */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteProjectMutation.mutate()}
        title="Delete Project"
        description="This will permanently delete the project and all its tasks and comments. This action cannot be undone."
        itemName={project?.name || ''}
        isLoading={deleteProjectMutation.isPending}
      />

      {/* ── Edit Project Modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={showEditModal}
        onClose={closeEditModal}
        title="Edit Project"
        size="md"
      >
        <form onSubmit={handleUpdateProject} noValidate className="space-y-4">

          <Input
            label="Project name"
            placeholder="My Awesome Project"
            value={editForm.name}
            onChange={setEdit('name')}
            error={editErrors.name}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Description <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="What is this project about?"
              value={editForm.description}
              onChange={setEdit('description')}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-default resize-none"
            />
          </div>

          {/* Status */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Status</label>
            <div className="flex gap-2">
              {PROJECT_STATUSES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setEditForm((f) => ({ ...f, status: value }))}
                  className={`flex-1 py-2 text-xs font-medium rounded-lg border transition-all ${
                    editForm.status === value
                      ? value === 'active'
                        ? 'bg-status-in-progress/15 border-status-in-progress/40 text-status-in-progress'
                        : value === 'completed'
                        ? 'bg-status-completed/15 border-status-completed/40 text-status-completed'
                        : 'bg-dark-elevated border-dark-border-strong text-text-secondary'
                      : 'bg-dark-elevated border-dark-border text-text-muted hover:text-text-secondary hover:border-dark-border-strong'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-text-secondary">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PROJECT_COLORS.map((color) => (
                <button
                  type="button"
                  key={color}
                  onClick={() => setEditForm((f) => ({ ...f, color }))}
                  className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                    editForm.color === color
                      ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-surface scale-110'
                      : ''
                  }`}
                  style={{ backgroundColor: color }}
                  title={color}
                />
              ))}
            </div>
          </div>

          {/* Footer: delete (admin/manager) left, save right */}
          <div className="flex items-center justify-between pt-2 border-t border-dark-border">
            {canManage ? (
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false)
                  setShowDeleteModal(true)
                }}
                className="text-xs text-red-400/70 hover:text-red-400 transition-colors font-medium"
              >
                Delete project
              </button>
            ) : (
              <span />
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={closeEditModal}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                loading={updateProjectMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  )
}
