import { useState, useMemo, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import api from '../lib/axios'
import StatsCard from '../components/shared/StatsCard'
import ProjectCard from '../components/shared/ProjectCard'
import TaskCard from '../components/shared/TaskCard'
import EmptyState from '../components/shared/EmptyState'
import Spinner from '../components/ui/Spinner'

const STATUS_TABS = ['all', 'pending', 'in_progress', 'completed']

const TAB_LABELS = {
  all:         'All',
  in_progress: 'In Progress',
  pending:     'Pending',
  completed:   'Completed',
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// Stable empty-state action objects — defined outside the component so they
// are not recreated on every render (memoized EmptyState won't needlessly re-render).
const NEW_PROJECT_ACTION = { label: 'New Project' } // onClick wired below via useCallback

export default function DashboardPage() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const navigate = useNavigate()
  const wsId = currentWorkspace?._id || currentWorkspace?.id

  const [search, setSearch]       = useState('')
  const [statusTab, setStatusTab] = useState('all')

  // ── Data fetching ───────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['dashboard', wsId],
    queryFn: () => api.get(`/dashboard/stats?workspaceId=${wsId}`).then((r) => r.data),
    enabled: !!wsId,
  })

  const { data: projectsData, isLoading: projLoading } = useQuery({
    queryKey: ['projects', wsId],
    queryFn: () => api.get(`/projects?workspaceId=${wsId}&limit=6`).then((r) => r.data),
    enabled: !!wsId,
  })

  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks', wsId],
    queryFn: () => api.get(`/tasks?workspaceId=${wsId}&limit=20`).then((r) => r.data),
    enabled: !!wsId,
  })

  const projects = useMemo(() => projectsData?.data?.projects || [], [projectsData])
  const allTasks = useMemo(() => tasksData?.data?.tasks || [], [tasksData])
  const statsData = stats?.data

  // ── Derived / filtered lists ────────────────────────────────────────────────
  const filteredTasks = useMemo(() => {
    const lc = search.toLowerCase()
    return allTasks.filter((t) => {
      const matchesSearch = !search
        || t.title?.toLowerCase().includes(lc)
        || t.identifier?.toLowerCase().includes(lc)
      const matchesStatus = statusTab === 'all' || t.status === statusTab
      return matchesSearch && matchesStatus
    })
  }, [allTasks, search, statusTab])

  const filteredProjects = useMemo(() => {
    const lc = search.toLowerCase()
    return projects.filter((p) =>
      !search
        || p.name?.toLowerCase().includes(lc)
        || p.description?.toLowerCase().includes(lc)
    )
  }, [projects, search])

  // ── Stats cards config ──────────────────────────────────────────────────────
  const statsCards = useMemo(() => [
    {
      title: 'Total Projects',
      value: statsData?.totalProjects ?? projects.length,
      icon:  '▤',
      color: 'brand',
    },
    {
      title: 'Total Tasks',
      value: statsData?.totalTasks ?? allTasks.length,
      icon:  '✓',
      color: 'blue',
    },
    {
      title: 'Completed',
      value: statsData?.completedTasks
        ?? allTasks.filter((t) => t.status === 'completed').length,
      icon:  '◎',
      color: 'green',
    },
    {
      title: 'Pending',
      value: statsData?.pendingTasks
        ?? allTasks.filter((t) => t.status === 'pending').length,
      icon:  '◷',
      color: 'yellow',
    },
  ], [statsData, projects.length, allTasks])

  // ── Stable callbacks ────────────────────────────────────────────────────────
  const handleSearch    = useCallback((e) => setSearch(e.target.value), [])
  const goToProjects    = useCallback(() => navigate('/projects'), [navigate])
  // Navigates to /projects AND signals it to open the create modal immediately
  const goToCreateProject = useCallback(
    () => navigate('/projects', { state: { openCreate: true } }),
    [navigate],
  )
  const newProjectAction = useMemo(
    () => ({ ...NEW_PROJECT_ACTION, onClick: goToCreateProject }),
    [goToCreateProject],
  )

  const isLoading = statsLoading || projLoading || tasksLoading

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-text-primary">
            {getGreeting()}, {user?.name?.split(' ')[0] || 'there'}
          </h1>
          <p className="text-text-muted text-sm mt-0.5">
            {currentWorkspace?.name} — overview of your workspace
          </p>
        </div>

        {/* Search */}
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="search"
            placeholder="Search projects & tasks..."
            value={search}
            onChange={handleSearch}
            className="w-full sm:w-64 pl-9 pr-3 py-2 text-sm bg-dark-surface border border-dark-border rounded text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
          />
        </div>
      </div>

      {/* Stats */}
      {isLoading ? (
        <div className="flex items-center justify-center h-24">
          <Spinner size="md" className="text-brand" />
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statsCards.map((s) => (
            <StatsCard key={s.title} {...s} />
          ))}
        </div>
      )}

      {/* Recent Projects */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Recent Projects</h2>
          <button
            onClick={goToProjects}
            className="text-xs text-brand hover:text-brand-muted transition-colors"
          >
            View all
          </button>
        </div>

        {projLoading ? (
          <div className="flex justify-center py-8"><Spinner className="text-brand" /></div>
        ) : filteredProjects.length === 0 ? (
          <EmptyState
            icon="▤"
            title="No projects yet"
            description="Create your first project to get started."
            action={newProjectAction}
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProjects.slice(0, 6).map((p) => (
              <ProjectCardWithNav key={p._id || p.id} project={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Tasks */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-text-primary">Recent Tasks</h2>
          <div className="flex items-center gap-1">
            {STATUS_TABS.map((tab) => (
              <TabButton
                key={tab}
                tab={tab}
                active={statusTab === tab}
                onSelect={setStatusTab}
              />
            ))}
          </div>
        </div>

        {tasksLoading ? (
          <div className="flex justify-center py-8"><Spinner className="text-brand" /></div>
        ) : filteredTasks.length === 0 ? (
          <EmptyState
            icon="✓"
            title="No tasks found"
            description="Tasks assigned in your workspace will appear here."
          />
        ) : (
          <div className="space-y-1.5">
            {filteredTasks.slice(0, 10).map((task) => (
              <TaskCard key={task._id || task.id} task={task} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Sub-components extracted to avoid inline callbacks on memoized children ──

import { memo } from 'react'

// Wraps ProjectCard with its own navigate callback so the parent list doesn't
// need to create a new closure per card on every render.
const ProjectCardWithNav = memo(function ProjectCardWithNav({ project }) {
  const navigate = useNavigate()
  const handleClick = useCallback(
    () => navigate(`/projects/${project._id || project.id}`),
    [navigate, project._id, project.id],
  )
  return <ProjectCard project={project} onClick={handleClick} />
})

// Status tab button — memoized so only the active tab re-renders on change.
const TabButton = memo(function TabButton({ tab, active, onSelect }) {
  const handleClick = useCallback(() => onSelect(tab), [onSelect, tab])
  return (
    <button
      onClick={handleClick}
      className={`px-2.5 py-1 rounded text-xs font-medium transition-default capitalize ${
        active
          ? 'bg-brand/15 text-brand'
          : 'text-text-muted hover:text-text-secondary hover:bg-dark-hover'
      }`}
    >
      {TAB_LABELS[tab] ?? tab}
    </button>
  )
})
