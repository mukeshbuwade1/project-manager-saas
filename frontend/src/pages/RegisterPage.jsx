import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/ui/Toast'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'

export default function RegisterPage() {
  const { register } = useAuth()
  const { toast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const prefillEmail = location.state?.prefillEmail || ''

  const [form, setForm] = useState({ name: '', email: prefillEmail, password: '', confirmPassword: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Enter a valid email'
    if (!form.password) errs.password = 'Password is required'
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) {
      setErrors(errs)
      return
    }
    setLoading(true)
    try {
      await register(form.name, form.email, form.password)
      toast.success('Account created! Set up your workspace.')
      navigate('/workspace/setup')
    } catch (err) {
      const msg = err.response?.data?.message || 'Registration failed'
      toast.error(msg)
      setErrors({ general: msg })
    } finally {
      setLoading(false)
    }
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [field]: undefined, general: undefined }))
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-text-primary mb-1">Create an account</h1>
        <p className="text-text-muted text-sm">
          {prefillEmail
            ? <>Signing up with <span className="text-text-secondary font-medium">{prefillEmail}</span></>
            : 'Get started with ProjectFlow'}
        </p>
      </div>

      {errors.general && (
        <div className="mb-4 p-3 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {errors.general}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <Input
          label="Full name"
          type="text"
          placeholder="Jane Smith"
          value={form.name}
          onChange={set('name')}
          error={errors.name}
          autoComplete="name"
        />
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
          placeholder="Min. 8 characters"
          value={form.password}
          onChange={set('password')}
          error={errors.password}
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          placeholder="Repeat password"
          value={form.confirmPassword}
          onChange={set('confirmPassword')}
          error={errors.confirmPassword}
          autoComplete="new-password"
        />
        <Button type="submit" variant="primary" size="lg" loading={loading} className="w-full mt-2">
          Create account
        </Button>
      </form>

      <p className="text-center text-text-muted text-sm mt-5">
        Already have an account?{' '}
        <Link to="/login" className="text-brand hover:text-brand-muted transition-colors font-medium">
          Sign in
        </Link>
      </p>
    </div>
  )
}
