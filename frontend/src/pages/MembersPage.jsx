import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../context/AuthContext'
import { useWorkspace } from '../context/WorkspaceContext'
import { useToast } from '../components/ui/Toast'
import api from '../lib/axios'
import Avatar from '../components/shared/Avatar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import Input from '../components/ui/Input'
import Spinner from '../components/ui/Spinner'
import EmptyState from '../components/shared/EmptyState'
import { formatDate } from '../lib/utils'

const ROLES = ['member', 'manager', 'admin']

function RoleBadge({ role }) {
  const styles = {
    admin:   'bg-brand/15 text-brand border-brand/20',
    manager: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    member:  'bg-dark-elevated text-text-muted border-dark-border',
  }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full border ${styles[role] || styles.member}`}>
      {role ? role.charAt(0).toUpperCase() + role.slice(1) : 'Member'}
    </span>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function MembersPage() {
  const { user } = useAuth()
  const { currentWorkspace } = useWorkspace()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const wsId = currentWorkspace?._id || currentWorkspace?.id

  const role     = currentWorkspace?.role
  const isAdmin   = role === 'admin'
  const canManage = role === 'admin' || role === 'manager'

  // ── Invite modal state ──────────────────────────────────────────────────────
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', role: 'member' })
  const [inviteErrors, setInviteErrors] = useState({})

  const closeInvite = () => {
    setShowInvite(false)
    setInviteForm({ email: '', role: 'member' })
    setInviteErrors({})
  }

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ['members', wsId],
    queryFn: () => api.get(`/workspaces/${wsId}/members`).then((r) => r.data),
    enabled: !!wsId,
  })
  const members = data?.data?.members || []

  // Pending invites list — shown below member table for admin/manager
  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ['workspace-invites', wsId],
    queryFn: () => api.get(`/workspaces/${wsId}/invites`).then((r) => r.data),
    enabled: !!wsId && canManage,
  })
  const pendingInvites = invitesData?.data?.invites || []

  // ── Mutations ────────────────────────────────────────────────────────────────
  const inviteMutation = useMutation({
    mutationFn: (payload) => api.post(`/workspaces/${wsId}/invites`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', wsId] })
      toast.success(`Invite sent to ${inviteForm.email}`)
      closeInvite()
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to send invite'),
  })

  const roleChangeMutation = useMutation({
    mutationFn: ({ memberId, newRole }) =>
      api.patch(`/workspaces/${wsId}/members/${memberId}`, { role: newRole }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', wsId] })
      toast.success('Role updated')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to update role'),
  })

  const removeMutation = useMutation({
    mutationFn: (memberId) => api.delete(`/workspaces/${wsId}/members/${memberId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members', wsId] })
      toast.success('Member removed')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to remove member'),
  })

  const cancelInviteMutation = useMutation({
    mutationFn: (inviteId) => api.delete(`/invites/${inviteId}?workspaceId=${wsId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-invites', wsId] })
      toast.success('Invite cancelled')
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Failed to cancel invite'),
  })

  // ── Invite form handlers ─────────────────────────────────────────────────────
  const handleInvite = (e) => {
    e.preventDefault()
    const errs = {}
    if (!inviteForm.email.trim()) errs.email = 'Email is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteForm.email)) errs.email = 'Enter a valid email'
    if (Object.keys(errs).length) { setInviteErrors(errs); return }
    inviteMutation.mutate({ email: inviteForm.email.trim(), role: inviteForm.role })
  }

  const setInviteField = (field) => (e) => {
    setInviteForm((f) => ({ ...f, [field]: e.target.value }))
    setInviteErrors((errs) => ({ ...errs, [field]: undefined }))
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Members</h1>
          <p className="text-text-muted text-sm mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''} in{' '}
            <span className="text-text-secondary">{currentWorkspace?.name}</span>
          </p>
        </div>
        {canManage && (
          <Button variant="primary" size="sm" onClick={() => setShowInvite(true)}>
            + Invite
          </Button>
        )}
      </div>

      {/* Members Table */}
      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" className="text-brand" /></div>
      ) : members.length === 0 ? (
        <EmptyState
          icon="◉"
          title="No members yet"
          description={canManage ? 'Invite people to collaborate.' : 'No members found.'}
          action={canManage ? { label: '+ Invite', onClick: () => setShowInvite(true) } : undefined}
        />
      ) : (
        <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
          <div className="grid grid-cols-[40px_1fr_130px_130px_90px] gap-3 px-5 py-3 border-b border-dark-border bg-dark-elevated text-text-muted text-xs font-medium">
            <span />
            <span>Name / Email</span>
            <span>Role</span>
            <span>Joined</span>
            {isAdmin && <span className="text-right">Actions</span>}
          </div>

          {members.map((member) => {
            const u = member.userId || {}
            const memberId = member._id || member.id
            const isSelf = u._id === user?.id || u._id === user?._id || u.email === user?.email

            return (
              <div
                key={memberId}
                className="grid grid-cols-[40px_1fr_130px_130px_90px] gap-3 px-5 py-4 border-b border-dark-border last:border-0 items-center"
              >
                <Avatar name={u.name || '?'} src={u.avatar} size="md" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {u.name || 'Unknown'}
                    {isSelf && <span className="ml-2 text-xs text-text-muted font-normal">(you)</span>}
                  </p>
                  <p className="text-xs text-text-muted truncate">{u.email}</p>
                </div>

                <div>
                  {isAdmin && !isSelf ? (
                    <select
                      value={member.role || 'member'}
                      onChange={(e) => roleChangeMutation.mutate({ memberId, newRole: e.target.value })}
                      className="text-xs bg-dark-elevated border border-dark-border rounded px-2 py-1 text-text-secondary focus:outline-none focus:border-brand"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
                      ))}
                    </select>
                  ) : (
                    <RoleBadge role={member.role} />
                  )}
                </div>

                <span className="text-text-muted text-xs">
                  {formatDate(member.joinedAt || member.createdAt)}
                </span>

                {isAdmin && (
                  <div className="flex justify-end">
                    {!isSelf && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${u.name || 'this member'} from the workspace?`)) {
                            removeMutation.mutate(memberId)
                          }
                        }}
                        className="text-xs text-red-400/70 hover:text-red-400 transition-colors font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pending Invites — visible to admin/manager */}
      {canManage && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-text-primary">
              Pending Invites
              {pendingInvites.length > 0 && (
                <span className="ml-2 text-xs font-normal text-text-muted">
                  ({pendingInvites.length})
                </span>
              )}
            </h2>
          </div>

          {invitesLoading ? (
            <Spinner size="sm" className="text-brand" />
          ) : pendingInvites.length === 0 ? (
            <p className="text-text-muted text-sm">No pending invites.</p>
          ) : (
            <div className="bg-dark-surface border border-dark-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-[1fr_100px_120px_80px] gap-3 px-5 py-3 border-b border-dark-border bg-dark-elevated text-text-muted text-xs font-medium">
                <span>Email</span>
                <span>Role</span>
                <span>Sent</span>
                <span className="text-right">Action</span>
              </div>
              {pendingInvites.map((inv) => (
                <div
                  key={inv._id}
                  className="grid grid-cols-[1fr_100px_120px_80px] gap-3 px-5 py-3.5 border-b border-dark-border last:border-0 items-center"
                >
                  <span className="text-sm text-text-primary truncate">{inv.email}</span>
                  <RoleBadge role={inv.role} />
                  <span className="text-xs text-text-muted">{formatDate(inv.createdAt)}</span>
                  <div className="flex justify-end">
                    <button
                      onClick={() => cancelInviteMutation.mutate(inv._id)}
                      className="text-xs text-red-400/70 hover:text-red-400 transition-colors font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Role reference */}
      <section className="glass-card p-4">
        <p className="text-text-muted text-xs font-medium mb-3">Role permissions</p>
        <div className="space-y-2 text-xs">
          {[
            { r: 'Admin',   color: 'text-brand',         perms: 'Full control — manage workspace, members, projects, tasks' },
            { r: 'Manager', color: 'text-amber-400',     perms: 'Create/update projects, create/assign tasks, send invites' },
            { r: 'Member',  color: 'text-text-secondary', perms: 'View projects, update assigned tasks, add comments' },
          ].map(({ r, color, perms }) => (
            <div key={r} className="flex items-start gap-2">
              <span className={`font-semibold w-16 shrink-0 ${color}`}>{r}</span>
              <span className="text-text-muted">{perms}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={closeInvite} title="Invite to workspace" size="sm">
        <form onSubmit={handleInvite} noValidate className="space-y-4">
          <p className="text-text-muted text-xs">
            They'll receive an invite in their{' '}
            <strong className="text-text-secondary">Join with code</strong> tab on the workspace setup page.
          </p>

          <Input
            label="Email address"
            type="email"
            placeholder="colleague@company.com"
            value={inviteForm.email}
            onChange={setInviteField('email')}
            error={inviteErrors.email}
            autoFocus
          />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-secondary">Role</label>
            <select
              value={inviteForm.role}
              onChange={setInviteField('role')}
              className="text-sm bg-dark-elevated border border-dark-border rounded px-3 py-2 text-text-primary focus:outline-none focus:border-brand"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>
              ))}
            </select>
            <p className="text-xs text-text-muted">
              {inviteForm.role === 'admin' && 'Admin has full control over the workspace.'}
              {inviteForm.role === 'manager' && 'Manager can create projects, assign tasks, and send invites.'}
              {inviteForm.role === 'member' && 'Member can view projects and update assigned tasks.'}
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="secondary" size="sm" onClick={closeInvite}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={inviteMutation.isPending}>
              Send Invite
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
