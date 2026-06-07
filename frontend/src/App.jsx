import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { ToastProvider, ToastContainer } from './components/ui/Toast'
import AppRouter from './router'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <WorkspaceProvider>
            <AppRouter />
            <ToastContainer />
          </WorkspaceProvider>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
