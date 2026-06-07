import axios from 'axios'

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_BASE_URL || ''}/api`,
  withCredentials: true,   // sends the httpOnly refresh-token cookie automatically
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

// ─── Request interceptor — attach access token ────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── Response interceptor — silent token refresh on 401 ──────────────────────
//
// Flow:
//   API request → 401 (access token expired)
//     → POST /auth/refresh  (httpOnly cookie carries the refresh token)
//     → new access token stored
//     → original request retried transparently
//     → user never sees anything
//
// If the refresh also fails (refresh token expired / revoked):
//     → clear auth state, redirect to /login

let isRefreshing = false

// Queue of { resolve, reject } for requests that arrived while a refresh was in progress
const waitQueue = []

const processQueue = (error, newToken = null) => {
  waitQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(newToken)
  )
  waitQueue.length = 0
}

const clearAuthAndRedirect = () => {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('authUser')
  localStorage.removeItem('currentWorkspaceId')
  // Small delay so any in-flight state updates can settle before the redirect
  setTimeout(() => { window.location.href = '/login' }, 50)
}

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config

    // Only intercept 401s that haven't already been retried
    if (error.response?.status !== 401 || originalRequest._retried) {
      return Promise.reject(error)
    }

    // Don't try to refresh if the failing request IS the refresh endpoint
    // (that would cause an infinite loop)
    if (originalRequest.url?.includes('/auth/refresh')) {
      clearAuthAndRedirect()
      return Promise.reject(error)
    }

    // If a refresh is already in progress, queue this request until it resolves
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject })
      }).then((newToken) => {
        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      })
    }

    // Mark as retried so we don't loop if the retry itself gets a 401
    originalRequest._retried = true
    isRefreshing = true

    try {
      const { data } = await api.post('/auth/refresh')
      const newToken = data?.data?.accessToken

      if (!newToken) throw new Error('No access token in refresh response')

      // Persist the new token and update future request headers
      localStorage.setItem('accessToken', newToken)
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`

      // Let all queued requests proceed with the new token
      processQueue(null, newToken)

      // Retry the original request
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return api(originalRequest)
    } catch (refreshError) {
      // Refresh failed — session is truly over
      processQueue(refreshError, null)
      clearAuthAndRedirect()
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)

export default api
