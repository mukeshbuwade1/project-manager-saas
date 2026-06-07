import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import Spinner from '../components/ui/Spinner'

export default function ProtectedRoute({ requireWorkspace = false }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { currentWorkspace, isLoading: wsLoading } = useWorkspace()
  const location = useLocation()

  if (isLoading || wsLoading) {
    return (
      <div className="min-h-screen bg-dark-base flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Spinner size="lg" className="text-brand" />
          <p className="text-text-muted text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If on a non-setup page and no workspace exists, redirect to setup
  if (
    isAuthenticated &&
    !currentWorkspace &&
    location.pathname !== '/workspace/setup'
  ) {
    return <Navigate to="/workspace/setup" replace />
  }

  return <Outlet />
}
