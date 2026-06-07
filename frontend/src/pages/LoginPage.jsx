import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const from = location.state?.from?.pathname || '/dashboard'

  const validate = () => {
    const errs = {}
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    return errs
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setNotFound(false)
    setLoading(true)
    login(form.email, form.password)
      .then(() => navigate(from, { replace: true }))
      .catch((err) => {
        const code = err.response?.data?.code
        if (code === 'EMAIL_NOT_REGISTERED') {
          setNotFound(true)
        } else {
          const msg = err.response?.data?.message || 'Invalid email or password'
          setErrors({ general: msg })
        }
      })
      .finally(() => setLoading(false))
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [field]: undefined, general: undefined }))
    if (field === 'email') setNotFound(false)
  }

  const goToSignUp = () => {
    navigate('/register', { state: { prefillEmail: form.email } })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary mb-1">Welcome back</h1>
        <p className="text-text-muted text-sm">Sign in to your account</p>
      </div>

      {/* Email-not-registered callout */}
      {notFound && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <span className="text-amber-400 text-lg leading-none mt-0.5 shrink-0">⚠</span>
              <div>
                <p className="text-sm font-medium text-amber-300">Email not registered</p>
                <p className="text-xs text-amber-400/80 mt-0.5">
                  <span className="font-mono bg-dark-elevated px-1 py-0.5 rounded text-amber-300 break-all">
                    {form.email}
                  </span>{' '}
                  doesn't have an account yet.
                </p>
              </div>
            </div>
            <button
              onClick={() => setNotFound(false)}
              aria-label="Dismiss"
              className="shrink-0 text-amber-400/60 hover:text-amber-300 transition-colors text-lg leading-none mt-0.5"
            >
              ✕
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2 pl-7">
            <button
              onClick={goToSignUp}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-brand hover:bg-brand-hover text-white transition-colors"
            >
              Create account →
            </button>
            <button
              onClick={() => setNotFound(false)}
              className="text-xs text-amber-400/70 hover:text-amber-300 transition-colors"
            >
              Try a different email
            </button>
          </div>
        </div>
      )}

      {/* General error (wrong password, etc.) */}
      {errors.general && (
        <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={form.email}
          onChange={set('email')}
          error={errors.email}
          autoComplete="email"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          autoComplete="current-password"
        />
        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
          Sign in
        </Button>
      </form>

      <p className="text-center text-text-muted text-sm mt-5">
        Don't have an account?{' '}
        <Link to="/register" className="text-brand hover:text-brand-muted transition-colors font-medium">
          Create account
        </Link>
      </p>
    </div>
  )
}
