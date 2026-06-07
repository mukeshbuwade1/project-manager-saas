import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ScreenBoundary } from '../components/ErrorBoundary'
import ProtectedRoute from '../layouts/ProtectedRoute'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import WorkspaceSetupPage from '../pages/WorkspaceSetupPage'
import DashboardPage from '../pages/DashboardPage'
import ProjectsPage from '../pages/ProjectsPage'
import ProjectDetailPage from '../pages/ProjectDetailPage'
import TasksPage from '../pages/TasksPage'
import TaskDetailPage from '../pages/TaskDetailPage'
import MembersPage from '../pages/MembersPage'
import SettingsPage from '../pages/SettingsPage'

// Wraps each screen in its own ErrorBoundary, keyed by pathname so the
// boundary auto-resets whenever the user navigates to a different route.
function Screen({ children }) {
  const { pathname } = useLocation()
  return <ScreenBoundary resetKey={pathname}>{children}</ScreenBoundary>
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Auth routes — each screen has its own boundary */}
      <Route element={<AuthLayout />}>
        <Route path="/login"    element={<Screen><LoginPage /></Screen>} />
        <Route path="/register" element={<Screen><RegisterPage /></Screen>} />
      </Route>

      {/* Workspace setup */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/workspace/setup"
          element={<Screen><WorkspaceSetupPage /></Screen>}
        />
      </Route>

      {/* App screens — sidebar layout */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"              element={<Screen><DashboardPage /></Screen>} />
          <Route path="/projects"               element={<Screen><ProjectsPage /></Screen>} />
          <Route path="/projects/:projectId"    element={<Screen><ProjectDetailPage /></Screen>} />
          <Route path="/tasks"                  element={<Screen><TasksPage /></Screen>} />
          <Route path="/tasks/:taskId"          element={<Screen><TaskDetailPage /></Screen>} />
          <Route path="/members"                element={<Screen><MembersPage /></Screen>} />
          <Route path="/settings"               element={<Screen><SettingsPage /></Screen>} />
        </Route>
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
