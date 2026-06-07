import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../components/ui/Toast'
import api from '../lib/axios'
import Badge from '../components/ui/Badge'
import Avatar from '../components/shared/Avatar'
import EmptyState from '../components/shared/EmptyState'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import { formatDate, formatDueDate } from '../lib/utils'

const STATUS_TABS = ['all', 'pending', 'in_progress', 'completed']
const STATUS_LABELS = { all: 'All', pending: 'Pending', in_progress: 'In Progress', completed: 'Completed' }

export default function TasksPage() {
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wsId = currentWorkspace?._id || currentWorkspace?.id

  const role = currentWorkspace?.role
  const canManage = role === 'admin' || role === 'manager'

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', status: 'pending', priority: 'medium',
    projectId: '', assignedTo: '', dueDate: '',
  })
  const [errors, setErrors] = useState({})

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['tasks', wsId],
    queryFn: () => api.get(`/tasks?workspaceId=${wsId}`).then((r) => r.data),
    enabled: !!wsId,
  })

  const { data: projectsData } = useQuery({
    queryKey: ['projects', wsId],
    queryFn: () => api.get(`/projects?workspaceId=${wsId}`).then((r) => r.data),
    enabled: !!wsId,
  })

  const { data: membersData } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => api.get(`/workspaces/${wsId}/members`).then((r) => r.data),
    enabled: !!wsId,
  })

  const tasks = tasksData?.data?.tasks || []
  const projects = projectsData?.data?.projects || []
  const members = membersData?.data?.members || []

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/tasks', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', wsId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', wsId] })
      toast.success('Task created!')
      closeModal()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to create task'),
  })

  const closeModal = () => {
    setShowModal(false)
    setForm({ title: '', description: '', status: 'pending', priority: 'medium', projectId: '', assignedTo: '', dueDate: '' })
    setErrors({})
  }

  const handleCreate = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = 'Task title is required'
    if (!form.projectId) errs.projectId = 'Project is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    createMutation.mutate({ ...form, workspaceId: wsId, assignedTo: form.assignedTo || undefined, dueDate: form.dueDate || undefined })
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  const filtered = tasks.filter((t) => {
    const matchTab = tab === 'all' || t.status === tab
    const matchSearch = !search || t.title?.toLowerCase().includes(search.toLowerCase())
    const matchPriority = !filterPriority || t.priority === filterPriority
    return matchTab && matchSearch && matchPriority
  })

  return (
    <div className="space-y-5">
      {/* Header — same structure as ProjectsPage */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Tasks</h1>
          <p className="text-text-muted text-xs mt-0.5">
            {currentWorkspace?.name} · {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
            + New Task
          </Button>
        )}
      </div>

      {/* Filter bar — same layout as ProjectsPage */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-dark-elevated rounded-lg p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-default ${
                tab === t
                  ? 'bg-dark-surface text-text-primary shadow'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {STATUS_LABELS[t]}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-dark-surface border border-dark-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>

        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-xs bg-dark-surface border border-dark-border rounded px-3 py-2 text-text-secondary focus:outline-none focus:border-brand shrink-0"
        >
          <option value="">All Priorities</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
      </div>

      {/* Content — table list (different from Projects grid) */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="✓"
          title={search || filterPriority || tab !== 'all' ? 'No matching tasks' : 'No tasks yet'}
          description={
            search || filterPriority || tab !== 'all'
              ? 'Try adjusting your filters.'
              : canManage
              ? 'Create your first task to get started.'
              : 'No tasks have been created in this workspace yet.'
          }
          action={canManage && !search && !filterPriority && tab === 'all' ? { label: '+ New Task', onClick: () => setShowModal(true) } : undefined}
        />
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[80px_1fr_160px_130px_100px_110px_52px] gap-2 px-4 py-2.5 border-b border-dark-border bg-dark-elevated text-text-muted text-xs font-medium">
            <span>ID</span>
            <span>Title</span>
            <span>Project</span>
            <span>Status</span>
            <span>Priority</span>
            <span>Due Date</span>
            <span>Assignee</span>
          </div>

          {filtered.map((task) => {
            const project = projects.find((p) => (p._id || p.id) === (task.projectId?._id || task.projectId?.id || task.projectId))
            return (
              <div
                key={task._id || task.id}
                onClick={() => navigate(`/tasks/${task._id || task.id}`)}
                className="grid grid-cols-[80px_1fr_160px_130px_100px_110px_52px] gap-2 px-4 py-3 border-b border-dark-border last:border-0 hover:bg-dark-elevated cursor-pointer transition-default text-sm group"
              >
                <span className="text-text-muted text-xs font-mono self-center truncate">
                  {task.identifier || `#${(task._id || task.id || '').slice(-4)}`}
                </span>
                <span className="text-text-primary self-center truncate group-hover:text-white transition-colors">
                  {task.title}
                </span>
                <span className="self-center">
                  {project ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); navigate(`/projects/${project._id || project.id}`) }}
                      className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-brand transition-colors truncate max-w-full"
                    >
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: project.color || '#5E6AD2' }}
                      />
                      <span className="truncate">{project.name}</span>
                    </button>
                  ) : (
                    <span className="text-text-muted text-xs">—</span>
                  )}
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
            )
          })}
        </div>
      )}

      {/* Create task modal */}
      <Modal isOpen={showModal} onClose={closeModal} title="New Task" size="md">
        <form onSubmit={handleCreate} noValidate className="space-y-4">
          <Input
            label="Task title"
            placeholder="Implement feature X..."
            value={form.title}
            onChange={set('title')}
            error={errors.title}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">
              Description <span className="text-text-muted font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="What needs to be done?"
              value={form.description}
              onChange={set('description')}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-default resize-none"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Project</label>
            <select
              value={form.projectId}
              onChange={set('projectId')}
              className={`text-sm bg-dark-elevated border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-brand ${errors.projectId ? 'border-red-500' : 'border-dark-border'}`}
            >
              <option value="">Select a project</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>{p.name}</option>
              ))}
            </select>
            {errors.projectId && <p className="text-xs text-red-400">{errors.projectId}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Status</label>
              <select
                value={form.status}
                onChange={set('status')}
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
                value={form.priority}
                onChange={set('priority')}
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
                value={form.dueDate}
                onChange={set('dueDate')}
                className="text-sm bg-dark-elevated border border-dark-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-brand"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">Assign to</label>
              <select
                value={form.assignedTo}
                onChange={set('assignedTo')}
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
            <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={createMutation.isPending}>
              Create Task
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
