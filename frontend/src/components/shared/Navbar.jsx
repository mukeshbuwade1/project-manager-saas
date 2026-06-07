import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useWorkspace } from '../../context/WorkspaceContext'
import Avatar from './Avatar'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/projects': 'Projects',
  '/members': 'Members',
  '/settings': 'Settings',
}

export default function Navbar({ onMenuToggle }) {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const location = useLocation()

  const pathBase = '/' + location.pathname.split('/')[1]
  const pageTitle = pageTitles[pathBase] || 'ProjectFlow'

  return (
    <header className="h-14 flex items-center gap-4 px-4 border-b border-dark-border bg-dark-base sticky top-0 z-20">
      {/* Hamburger (mobile only) */}
      <button
        onClick={onMenuToggle}
        className="md:hidden text-text-secondary hover:text-text-primary transition-colors p-1.5 rounded hover:bg-dark-hover"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Breadcrumb / Page title */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {currentWorkspace && (
          <>
            <span className="text-text-muted text-sm hidden sm:block truncate max-w-[120px]">
              {currentWorkspace.name}
            </span>
            <span className="text-text-muted text-sm hidden sm:block">/</span>
          </>
        )}
        <span className="text-sm font-medium text-text-primary">{pageTitle}</span>
      </div>

      {/* Right side: user avatar */}
      <div className="flex items-center gap-3">
        <Avatar name={user?.name || ''} size="sm" />
      </div>
    </header>
  )
}
