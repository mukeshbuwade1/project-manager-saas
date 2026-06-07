import { useState, useMemo, useCallback, useEffect, memo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../components/ui/Toast'
import api from '../lib/axios'
import ProjectCard from '../components/shared/ProjectCard'
import EmptyState from '../components/shared/EmptyState'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'

const STATUS_TABS = ['all', 'active', 'completed', 'archived']

const PROJECT_COLORS = [
  '#5E6AD2', '#2D9964', '#CD4945', '#CA8E1B',
  '#2E7CD1', '#8B5CF6', '#EC4899', '#14B8A6',
]

// ─── Animated loading overlay (inside modal) ──────────────────────────────────

function CreatingOverlay({ phase, projectName, color }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-6 animate-fade-up">

      {phase === 'creating' ? (
        <>
          {/* Spinning ring with color dot */}
          <div className="relative w-20 h-20">
            {/* Outer track */}
            <div className="absolute inset-0 rounded-full border-4 border-dark-border" />
            {/* Spinning arc */}
            <div
              className="absolute inset-0 rounded-full border-4 border-transparent animate-spin"
              style={{ borderTopColor: color }}
            />
            {/* Inner pulsing dot */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div
                className="w-6 h-6 rounded-full animate-pulse"
                style={{ backgroundColor: color + '40' }}
              >
                <div
                  className="w-full h-full rounded-full scale-[0.55]"
                  style={{ backgroundColor: color }}
                />
              </div>
            </div>
          </div>

          {/* Text */}
          <div className="text-center space-y-2">
            <p className="text-text-primary font-semibold text-base">
              Creating your project
            </p>
            {/* Bouncing dots */}
            <div className="flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    backgroundColor: color,
                    animation: `dot-bounce 1.2s ease-in-out infinite`,
                    animationDelay: `${i * 0.18}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          {/* Success ring + checkmark */}
          <div className="relative w-20 h-20 animate-scale-in">
            {/* Ripple */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                backgroundColor: color + '20',
                animation: 'ripple 1s ease-out infinite',
              }}
            />
            {/* Circle */}
            <div
              className="absolute inset-0 rounded-full border-4"
              style={{ borderColor: color }}
            />
            {/* Checkmark */}
            <svg
              className="absolute inset-0 w-full h-full p-4"
              viewBox="0 0 24 24"
              fill="none"
            >
              <polyline
                points="4,13 9,18 20,7"
                stroke={color}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="44"
                style={{ animation: 'check-draw 0.4s ease forwards 0.1s', strokeDashoffset: 44 }}
              />
            </svg>
          </div>

          {/* Text — slides up */}
          <div className="text-center space-y-1 animate-slide-up-fade">
            <p className="text-text-muted text-sm">Navigating you into</p>
            <p className="font-bold text-lg" style={{ color }}>
              "{projectName}"
            </p>
          </div>

          {/* Progress bar */}
          <div className="w-40 h-0.5 rounded-full bg-dark-border overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                backgroundColor: color,
                width: '100%',
                animation: 'progress-fill 1.1s ease forwards',
              }}
            />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const wsId = currentWorkspace?._id || currentWorkspace?.id

  const role = currentWorkspace?.role
  const canCreate = role === 'admin' || role === 'manager'

  const [tab, setTab] = useState('all')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', color: PROJECT_COLORS[0] })
  const [errors, setErrors] = useState({})

  // Animation phases: null → 'creating' → 'navigating'
  const [createPhase, setCreatePhase] = useState(null) // null | 'creating' | 'navigating'
  const [createdProject, setCreatedProject] = useState(null)

  // Open the create modal automatically when navigated here with { openCreate: true }
  // (e.g. from the Dashboard "New Project" empty-state button).
  useEffect(() => {
    if (location.state?.openCreate && canCreate) {
      setShowModal(true)
      // Clear the flag so a page refresh doesn't re-open the modal
      window.history.replaceState({}, '')
    }
  }, []) // intentionally empty — run once on mount only

  const { data, isLoading } = useQuery({
    queryKey: ['projects', wsId],
    queryFn: () => api.get(`/projects?workspaceId=${wsId}`).then((r) => r.data),
    enabled: !!wsId,
  })

  const projects = data?.data?.projects || []

  const createMutation = useMutation({
    mutationFn: (payload) => api.post('/projects', payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['projects', wsId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', wsId] })
      const p = res.data?.data?.project
      setCreatedProject(p)
      setCreatePhase('navigating')               // switch to phase 2

      setTimeout(() => {
        setShowModal(false)
        setCreatePhase(null)
        setCreatedProject(null)
        setForm({ name: '', description: '', color: PROJECT_COLORS[0] })
        if (p?._id || p?.id) navigate(`/projects/${p._id || p.id}`)
      }, 1400)                                   // brief pause to read the message
    },
    onError: (err) => {
      setCreatePhase(null)                       // reset on error so form re-appears
      toast.error(err.response?.data?.message || 'Failed to create project')
    },
  })

  const handleCreate = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Project name is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setCreatePhase('creating')                   // start phase 1
    createMutation.mutate({ ...form, workspaceId: wsId })
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  const filtered = useMemo(() => {
    const lc = search.toLowerCase()
    return projects.filter((p) => {
      const matchesTab =
        tab === 'all' ||
        (tab === 'active' && p.status !== 'completed' && p.status !== 'archived') ||
        p.status === tab
      const matchesSearch =
        !search ||
        p.name?.toLowerCase().includes(lc) ||
        p.description?.toLowerCase().includes(lc)
      return matchesTab && matchesSearch
    })
  }, [projects, tab, search])

  const handleSearch = useCallback((e) => setSearch(e.target.value), [])
  const openModal    = useCallback(() => setShowModal(true), [])
  const closeModal   = useCallback(() => {
    if (createPhase) return   // block dismiss while API is in flight
    setShowModal(false)
    setErrors({})
  }, [createPhase])

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Projects</h1>
          <p className="text-text-muted text-xs mt-0.5">
            {currentWorkspace?.name} · {projects.length} project{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        {canCreate && (
          <Button variant="primary" size="sm" onClick={openModal}>
            + New Project
          </Button>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-1 bg-dark-elevated rounded-lg p-1">
          {STATUS_TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-default capitalize ${
                tab === t
                  ? 'bg-dark-surface text-text-primary shadow'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search projects..."
            value={search}
            onChange={handleSearch}
            className="w-full pl-9 pr-3 py-2 text-sm bg-dark-surface border border-dark-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand" /></div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="▤"
          title={search ? 'No matching projects' : 'No projects yet'}
          description={
            search
              ? 'Try a different search term.'
              : canCreate
              ? 'Create your first project to get started.'
              : 'No projects have been created in this workspace yet.'
          }
          action={canCreate && !search ? { label: '+ New Project', onClick: openModal } : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((p) => (
            <ProjectCard
              key={p._id || p.id}
              project={p}
              onClick={() => navigate(`/projects/${p._id || p.id}`)}
            />
          ))}
        </div>
      )}

      {/* Create project modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={createPhase ? '' : 'New Project'}
        size="md"
      >
        {/* ── Animation overlay while creating / navigating ── */}
        {createPhase ? (
          <CreatingOverlay
            phase={createPhase}
            projectName={createdProject?.name || form.name}
            color={form.color}
          />
        ) : (
          /* ── Normal form ── */
          <form onSubmit={handleCreate} noValidate className="space-y-4">
            <Input
              label="Project name"
              placeholder="My Awesome Project"
              value={form.name}
              onChange={set('name')}
              error={errors.name}
              autoFocus
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-secondary">
                Description <span className="text-text-muted font-normal">(optional)</span>
              </label>
              <textarea
                placeholder="What is this project about?"
                value={form.description}
                onChange={set('description')}
                rows={3}
                className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-default resize-none"
              />
            </div>

            {/* Color picker */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-text-secondary">Color</label>
              <div className="flex gap-2 flex-wrap">
                {PROJECT_COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => setForm((f) => ({ ...f, color }))}
                    className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${
                      form.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-dark-surface scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            {/* Workspace label */}
            <div className="flex items-center gap-2 py-1 px-3 rounded bg-dark-elevated border border-dark-border">
              <span className="text-text-muted text-xs">Workspace:</span>
              <span className="text-text-secondary text-xs font-medium">{currentWorkspace?.name}</span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" size="sm" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm">
                Create Project
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  )
}
