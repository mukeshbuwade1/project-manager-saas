import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/axios'
import { useAuth } from './AuthContext'

const WorkspaceContext = createContext(null)

const LS_WS_ID = 'currentWorkspaceId'

export function WorkspaceProvider({ children }) {
  const { isAuthenticated } = useAuth()
  const [currentWorkspace, setCurrentWorkspace] = useState(null)
  const [workspaces, setWorkspaces] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const refreshWorkspaces = useCallback(async () => {
    if (!isAuthenticated) return
    setIsLoading(true)
    try {
      const res = await api.get('/workspaces')
      // Each workspace object already has .role attached by the backend
      const list = res.data.data?.workspaces || []
      setWorkspaces(list)

      const savedId = localStorage.getItem(LS_WS_ID)
      const targetId = savedId

      if (targetId) {
        const found = list.find((w) => (w._id || w.id) === targetId)
        if (found) {
          setCurrentWorkspace(found)   // role comes from the API — source of truth
          return
        }
      }

      if (list.length > 0) {
        setCurrentWorkspace(list[0])
        localStorage.setItem(LS_WS_ID, list[0]._id || list[0].id)
      }
    } catch {
      // keep existing state on failure
    } finally {
      setIsLoading(false)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (isAuthenticated) {
      refreshWorkspaces()
    } else {
      setWorkspaces([])
      setCurrentWorkspace(null)
      localStorage.removeItem(LS_WS_ID)
    }
  }, [isAuthenticated, refreshWorkspaces])

  const switchWorkspace = useCallback((workspace) => {
    // workspace must already carry .role (returned directly from the API)
    setCurrentWorkspace(workspace)
    localStorage.setItem(LS_WS_ID, workspace._id || workspace.id)
  }, [])

  return (
    <WorkspaceContext.Provider
      value={{ currentWorkspace, workspaces, isLoading, switchWorkspace, refreshWorkspaces }}
    >
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext)
  if (!ctx) throw new Error('useWorkspace must be used within WorkspaceProvider')
  return ctx
}
