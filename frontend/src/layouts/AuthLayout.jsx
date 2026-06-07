import { Outlet } from 'react-router-dom'

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradient blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-20 blur-3xl"
          style={{ background: 'radial-gradient(circle, #5E6AD2 0%, transparent 70%)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
          style={{ background: 'radial-gradient(circle, #8299FF 0%, transparent 70%)' }}
        />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/30">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-xl font-bold text-text-primary tracking-tight">ProjectFlow</span>
        </div>

        {/* Card */}
        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-2xl">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
