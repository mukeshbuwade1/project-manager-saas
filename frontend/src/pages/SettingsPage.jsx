import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../components/ui/Toast'
import api from '../lib/axios'
import Input from '../components/ui/Input'
import Button from '../components/ui/Button'
import Spinner from '../components/ui/Spinner'
import ConfirmDeleteModal from '../components/ui/ConfirmDeleteModal'
import { formatDate } from '../lib/utils'

export default function SettingsPage() {
  const { user } = useAuth()
  const { currentWorkspace, refreshWorkspaces } = useWorkspace()
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const wsId = currentWorkspace?._id || currentWorkspace?.id

  // role is set from WorkspaceMember during the workspace setup flow
  const role = currentWorkspace?.role
  const isAdmin   = role === 'admin'
  const canManage = role === 'admin' || role === 'manager'

  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const [form, setForm] = useState({
    name: currentWorkspace?.name || '',
    description: currentWorkspace?.description || '',
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (currentWorkspace) {
      setForm({
        name: currentWorkspace.name || '',
        description: currentWorkspace.description || '',
      })
    }
  }, [currentWorkspace])

  // Invite code — all members can view, admin/manager can regenerate
  const [copied, setCopied] = useState(false)
  const { data: codeData, isLoading: codeLoading, refetch: refetchCode } = useQuery({
    queryKey: ['invite-code', wsId],
    queryFn: () => api.get(`/workspaces/${wsId}/invite-code`).then((r) => r.data),
    enabled: !!wsId,
  })
  const codeInfo = codeData?.data
  const inviteCode = codeInfo?.isExpired ? null : codeInfo?.inviteCode

  const regenMutation = useMutation({
    mutationFn: () => api.post(`/workspaces/${wsId}/invite-code`),
    onSuccess: () => { refetchCode(); toast.success('New invite code generated') },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to regenerate code'),
  })

  const copyCode = () => {
    if (!inviteCode) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const deleteWorkspaceMutation = useMutation({
    mutationFn: () => api.delete(`/workspaces/${wsId}`),
    onSuccess: () => {
      setShowDeleteModal(false)
      refreshWorkspaces()
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      toast.success('Workspace deleted')
      navigate('/')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to delete workspace'),
  })

  const updateMutation = useMutation({
    mutationFn: (payload) => api.put(`/workspaces/${wsId}`, payload),
    onSuccess: () => {
      refreshWorkspaces()
      queryClient.invalidateQueries({ queryKey: ['workspaces'] })
      toast.success('Workspace updated!')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Update failed'),
  })

  const handleSave = (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.name.trim()) errs.name = 'Name is required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    updateMutation.mutate({ name: form.name.trim(), description: form.description.trim() })
  }

  const set = (field) => (e) => {
    setForm((f) => ({ ...f, [field]: e.target.value }))
    setErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      {/* Workspace Info */}
      <section className="glass-card p-6 space-y-5">
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-0.5">Workspace Information</h2>
          <p className="text-text-muted text-xs">Manage your workspace details.</p>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Workspace name"
            placeholder="Acme Corp"
            value={form.name}
            onChange={set('name')}
            error={errors.name}
            disabled={!isAdmin}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Description</label>
            <textarea
              placeholder="Describe your workspace..."
              value={form.description}
              onChange={set('description')}
              rows={3}
              disabled={!isAdmin}
              className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-default resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {isAdmin && (
            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="sm" loading={updateMutation.isPending}>
                Save Changes
              </Button>
            </div>
          )}
        </form>

        {/* Read-only info */}
        <div className="pt-4 border-t border-dark-border space-y-3">
          <InfoRow label="Workspace ID" value={wsId} mono />
          {currentWorkspace?.slug && (
            <InfoRow label="Slug" value={currentWorkspace.slug} mono />
          )}
          <InfoRow label="Created" value={formatDate(currentWorkspace?.createdAt)} />
          <InfoRow label="Plan" value={currentWorkspace?.plan || 'Free'} />
        </div>
      </section>

      {/* Invite Code — visible to all workspace members */}
      <section className="glass-card p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-text-primary mb-0.5">Invite Code</h2>
            <p className="text-text-muted text-xs">
              Share this code with anyone to let them join as a <strong className="text-text-secondary">Member</strong>.
            </p>
          </div>
          {canManage && (
            <Button
              variant="secondary"
              size="sm"
              loading={regenMutation.isPending}
              onClick={() => regenMutation.mutate()}
            >
              Regenerate
            </Button>
          )}
        </div>

        {codeLoading ? (
          <div className="flex items-center gap-2"><Spinner size="sm" className="text-brand" /></div>
        ) : inviteCode ? (
          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-dark-elevated border border-dark-border rounded-lg">
              <span className="font-mono text-2xl font-bold text-text-primary tracking-[0.3em]">
                {inviteCode}
              </span>
            </div>
            <button
              onClick={copyCode}
              className={`px-4 py-3 rounded-lg border text-sm font-medium transition-all whitespace-nowrap ${
                copied
                  ? 'bg-status-completed/15 border-status-completed/30 text-status-completed'
                  : 'bg-dark-elevated border-dark-border text-text-secondary hover:border-brand/40 hover:text-text-primary'
              }`}
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="text-sm text-text-muted">No active code.</p>
        )}

        <p className="text-xs text-text-muted">
          Members go to <strong className="text-text-secondary">Join with code</strong> on the workspace setup page and enter this code.
        </p>
      </section>

      {/* Your Account */}
      <section className="glass-card p-6 space-y-4">
        <div>
          <h2 className="text-sm font-semibold text-text-primary mb-0.5">Your Account</h2>
          <p className="text-text-muted text-xs">Your personal information in this workspace.</p>
        </div>
        <div className="space-y-3">
          <InfoRow label="Name" value={user?.name} />
          <InfoRow label="Email" value={user?.email} />
          <InfoRow label="Role" value={currentWorkspace?.role ? currentWorkspace.role.charAt(0).toUpperCase() + currentWorkspace.role.slice(1) : 'Member'} />
        </div>
      </section>

      {/* Danger Zone — admin and manager only */}
      {canManage && (
        <section className="rounded-lg border border-red-500/20 p-6 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-red-400 mb-0.5">Danger Zone</h2>
            <p className="text-text-muted text-xs">Irreversible and destructive actions.</p>
          </div>
          <div className="flex items-center justify-between p-4 bg-red-500/5 rounded-lg border border-red-500/10">
            <div>
              <p className="text-sm font-medium text-text-primary">Delete Workspace</p>
              <p className="text-text-muted text-xs mt-0.5">
                Permanently delete this workspace and all its projects, tasks, and members.
              </p>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
            >
              Delete
            </Button>
          </div>
        </section>
      )}

      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => deleteWorkspaceMutation.mutate()}
        title="Delete Workspace"
        description="This will permanently delete the workspace and all its projects, tasks, comments, and members. This action cannot be undone."
        itemName={currentWorkspace?.name || ''}
        isLoading={deleteWorkspaceMutation.isPending}
      />
    </div>
  )
}

function InfoRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-text-muted text-xs font-medium w-28 shrink-0">{label}</span>
      <span className={`text-sm text-text-secondary text-right truncate ${mono ? 'font-mono text-xs' : ''}`}>
        {value || '—'}
      </span>
    </div>
  )
}
