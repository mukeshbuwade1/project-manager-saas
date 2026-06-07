import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "../context/WorkspaceContext";
import { useToast } from "../components/ui/Toast";
import api from "../lib/axios";
import Input from "../components/ui/Input";
import Button from "../components/ui/Button";
import Spinner from "../components/ui/Spinner";

export default function WorkspaceSetupPage() {
  const { workspaces, refreshWorkspaces, switchWorkspace } = useWorkspace();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const hasWorkspaces = workspaces.length > 0;

  // "My Workspaces" is first tab if the user already belongs to workspaces
  const [tab, setTab] = useState(hasWorkspaces ? "mine" : "create");

  // ── Pending invites for current user ────────────────────────────────────────
  const { data: invitesData, isLoading: invitesLoading } = useQuery({
    queryKey: ["my-invites"],
    queryFn: () => api.get("/invites/my-invites").then((r) => r.data),
    // only load when on join tab
    enabled: tab === "join",
    refetchOnWindowFocus: true,
  });
  const myInvites = invitesData?.data?.invites || [];

  // ── Create state ────────────────────────────────────────────────────────────
  const [createForm, setCreateForm] = useState({ name: "", description: "" });
  const [createErrors, setCreateErrors] = useState({});
  const [createLoading, setCreateLoading] = useState(false);

  // ── Join state ──────────────────────────────────────────────────────────────
  const [codeInput, setCodeInput] = useState("");
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [foundWorkspace, setFoundWorkspace] = useState(null); // result card
  const [joinLoading, setJoinLoading] = useState(false);

  // ── Create handlers ─────────────────────────────────────────────────────────
  const setCreate = (field) => (e) => {
    setCreateForm((f) => ({ ...f, [field]: e.target.value }));
    setCreateErrors((errs) => ({ ...errs, [field]: undefined }));
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!createForm.name.trim()) errs.name = "Workspace name is required";
    if (Object.keys(errs).length) {
      setCreateErrors(errs);
      return;
    }

    setCreateLoading(true);
    try {
      const res = await api.post("/workspaces", {
        name: createForm.name.trim(),
        description: createForm.description.trim(),
      });
      // createWorkspace API returns { ...workspace, role: 'admin' } — use it directly
      const ws = res.data?.data?.workspace;
      if (ws) switchWorkspace(ws);
      // Refresh the workspaces list in the background (does not touch currentWorkspace
      // since localStorage already points to the new workspace)
      refreshWorkspaces();
      toast.success("Workspace created! You are the Admin.");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create workspace");
    } finally {
      setCreateLoading(false);
    }
  };

  // ── Join handlers ───────────────────────────────────────────────────────────
  const handleCodeInput = (e) => {
    const val = e.target.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8);
    setCodeInput(val);
    setLookupError("");
    if (foundWorkspace) setFoundWorkspace(null);
  };

  const handleLookup = async () => {
    const code = codeInput.trim();
    if (!code) {
      setLookupError("Enter an invite code");
      return;
    }
    if (code.length !== 8) {
      setLookupError("Invite codes are exactly 8 characters");
      return;
    }

    setLookupLoading(true);
    setLookupError("");
    setFoundWorkspace(null);
    try {
      const res = await api.get(`/workspaces/by-code/${code}`);
      setFoundWorkspace(res.data.data);
    } catch (err) {
      setLookupError(
        err.response?.data?.message || "No workspace found for this code",
      );
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookupKey = (e) => {
    if (e.key === "Enter") handleLookup();
  };

  // ── Accept email invite ─────────────────────────────────────────────────────
  const [acceptingId, setAcceptingId] = useState(null);

  const handleAcceptInvite = async (invite) => {
    setAcceptingId(invite._id);
    try {
      const res = await api.post(`/invites/${invite._id}/accept`);
      const { workspace, alreadyMember } = res.data.data;
      await refreshWorkspaces();
      switchWorkspace(workspace);
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
      toast.success(
        alreadyMember
          ? `Already a member — switched to "${workspace.name}"`
          : `Joined "${workspace.name}" as ${invite.role}!`,
      );
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to accept invite");
    } finally {
      setAcceptingId(null);
    }
  };

  // ── Select existing workspace ───────────────────────────────────────────────
  const handleSelect = (ws) => {
    switchWorkspace(ws);
    navigate("/dashboard");
  };

  const handleJoin = async () => {
    if (!foundWorkspace) return;
    setJoinLoading(true);
    try {
      const res = await api.post("/workspaces/join", { inviteCode: codeInput });
      // joinByCode API returns { ...workspace, role: 'member' } — use it directly
      const { workspace, alreadyMember } = res.data.data;
      switchWorkspace(workspace);
      refreshWorkspaces();
      toast.success(
        alreadyMember
          ? `Already a member — switched to "${workspace.name}"`
          : `Joined "${workspace.name}" as Member!`,
      );
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to join workspace");
    } finally {
      setJoinLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-base flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-9 h-9 bg-brand rounded-lg flex items-center justify-center shadow-lg shadow-brand/30">
            <svg
              className="w-5 h-5 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7"
              />
            </svg>
          </div>
          <span className="text-xl font-bold text-text-primary tracking-tight">
            ProjectFlow
          </span>
        </div>

        <div className="bg-dark-surface border border-dark-border rounded-xl p-6 shadow-2xl">
          <h1 className="text-xl font-bold text-text-primary mb-1">
            {tab === "mine" && "My Workspaces"}
            {tab === "create" && "Create a workspace"}
            {tab === "join" && "Join a workspace"}
          </h1>
          <p className="text-text-muted text-sm mb-6">
            {tab === "mine" &&
              "Pick a workspace to open, or create / join a new one."}
            {tab === "create" && "Set up a new workspace. You'll be the Admin."}
            {tab === "join" &&
              "Enter an invite code shared by a workspace Admin or Manager."}
          </p>

          {/* Tabs — "My Workspaces" first and only if user has workspaces */}
          <div className="flex gap-1 mb-6 bg-dark-elevated rounded-lg p-1">
            {[
              hasWorkspaces && { key: "mine", label: "My Workspaces" },
              { key: "create", label: "Create" },
              { key: "join", label: "Join" },
            ]
              .filter(Boolean)
              .map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`flex-1 py-2 text-sm rounded-md font-medium transition-all ${
                    tab === key
                      ? "bg-dark-surface text-text-primary shadow"
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                >
                  {label}
                </button>
              ))}
          </div>

          {/* ── My Workspaces tab ── */}
          {tab === "mine" && (
            <div className="space-y-2">
              {workspaces.map((ws) => (
                <button
                  key={ws._id || ws.id}
                  onClick={() => handleSelect(ws)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-dark-elevated border border-dark-border hover:border-brand/40 hover:bg-dark-hover transition-default text-left group"
                >
                  <div className="w-9 h-9 rounded-lg bg-brand/20 flex items-center justify-center text-brand font-bold text-sm shrink-0 group-hover:bg-brand/30 transition-colors">
                    {ws.name[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {ws.name}
                    </p>
                    {ws.description && (
                      <p className="text-xs text-text-muted truncate">
                        {ws.description}
                      </p>
                    )}
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${
                      ws.role === "admin"
                        ? "bg-brand/15 text-brand"
                        : ws.role === "manager"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-dark-border text-text-muted"
                    }`}
                  >
                    {ws.role
                      ? ws.role.charAt(0).toUpperCase() + ws.role.slice(1)
                      : "Member"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* ── Create tab ── */}
          {tab === "create" && (
            <form onSubmit={handleCreate} noValidate className="space-y-4">
              <Input
                label="Workspace name"
                placeholder="Acme Corp"
                value={createForm.name}
                onChange={setCreate("name")}
                error={createErrors.name}
                autoFocus
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-secondary">
                  Description{" "}
                  <span className="text-text-muted font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  placeholder="What is this workspace for?"
                  value={createForm.description}
                  onChange={setCreate("description")}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded bg-dark-elevated border border-dark-border text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-default resize-none"
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={createLoading}
                className="w-full"
              >
                Create workspace
              </Button>
            </form>
          )}

          {/* ── Join tab ── */}
          {tab === "join" && (
            <div className="space-y-4">
              {/* Code input + plus button — horizontal */}
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">
                  Invite code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter 8-character code"
                    value={codeInput}
                    onChange={handleCodeInput}
                    onKeyDown={handleLookupKey}
                    maxLength={8}
                    spellCheck={false}
                    autoFocus
                    className={`flex-1 px-3 py-2.5 text-sm rounded font-mono tracking-widest bg-dark-elevated border text-text-primary placeholder:text-text-muted placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-brand/40 transition-default ${
                      lookupError
                        ? "border-red-500/60"
                        : "border-dark-border focus:border-brand"
                    }`}
                  />
                  {/* Plus / search button */}
                  <button
                    type="button"
                    onClick={handleLookup}
                    disabled={lookupLoading || codeInput.length !== 8}
                    title="Look up workspace"
                    className="w-11 h-11 flex items-center justify-center rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-40 disabled:cursor-not-allowed text-white transition-colors shrink-0"
                  >
                    {lookupLoading ? (
                      <Spinner size="sm" />
                    ) : (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                    )}
                  </button>
                </div>
                {lookupError && (
                  <p className="text-xs text-red-400 mt-1.5">{lookupError}</p>
                )}
                {!lookupError && (
                  <p className="text-xs text-text-muted mt-1.5">
                    Ask an Admin or Manager for the code, then click{" "}
                    <strong className="text-text-secondary">+</strong>
                  </p>
                )}
              </div>

              {/* Code lookup result */}
              {foundWorkspace && (
                <div className="space-y-2">
                  <p className="text-xs font-medium text-text-muted uppercase tracking-wide">
                    Found
                  </p>
                  <WorkspaceResultCard
                    workspace={foundWorkspace.workspace}
                    alreadyMember={foundWorkspace.alreadyMember}
                    onJoin={handleJoin}
                    joinLoading={joinLoading}
                  />
                </div>
              )}

              {/* Pending email invites for this user */}
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-px bg-dark-border" />
                  <span className="text-xs text-text-muted uppercase tracking-wide shrink-0">
                    Pending invites
                  </span>
                  <div className="flex-1 h-px bg-dark-border" />
                </div>

                {invitesLoading ? (
                  <div className="flex justify-center py-3">
                    <Spinner size="sm" className="text-brand" />
                  </div>
                ) : myInvites.length === 0 ? (
                  <p className="text-center text-text-muted text-xs py-3">
                    No pending invites for your account.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {myInvites.map((inv) => {
                      const ws = inv.workspaceId || {};
                      const inviter = inv.invitedBy || {};
                      const shortDesc = ws.description
                        ? ws.description.slice(0, 55) +
                          (ws.description.length > 55 ? "…" : "")
                        : null;
                      return (
                        <div
                          key={inv._id}
                          className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border"
                        >
                          {/* Workspace avatar */}
                          <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center text-brand font-bold text-base shrink-0">
                            {ws.name?.[0]?.toUpperCase() || "?"}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-text-primary truncate">
                              {ws.name}
                            </p>
                            {shortDesc ? (
                              <p className="text-xs text-text-muted truncate mt-0.5">
                                {shortDesc}
                              </p>
                            ) : (
                              <p className="text-xs text-text-muted mt-0.5">
                                Invited by{" "}
                                <span className="text-text-secondary">
                                  {inviter.name || inviter.email}
                                </span>
                                {" · "}
                                <span
                                  className={`font-medium ${
                                    inv.role === "admin"
                                      ? "text-brand"
                                      : inv.role === "manager"
                                        ? "text-amber-400"
                                        : "text-text-muted"
                                  }`}
                                >
                                  {inv.role
                                    ? inv.role.charAt(0).toUpperCase() +
                                      inv.role.slice(1)
                                    : "Member"}
                                </span>
                              </p>
                            )}
                          </div>

                          {/* Accept button */}
                          <Button
                            variant="primary"
                            size="sm"
                            loading={acceptingId === inv._id}
                            onClick={() => handleAcceptInvite(inv)}
                            className="shrink-0"
                          >
                            Accept
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-text-muted text-xs mt-4">
          {tab === "mine" &&
            "Select a workspace to continue. Your role is shown on each card."}
          {tab === "create" &&
            "You'll be the Admin with full control over the workspace."}
          {tab === "join" &&
            "You'll join as a Member. Admins can promote you later."}
        </p>
      </div>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function WorkspaceResultCard({
  workspace,
  alreadyMember,
  onJoin,
  joinLoading,
}) {
  const initial = workspace.name?.[0]?.toUpperCase() || "?";
  const shortDesc = workspace.description
    ? workspace.description.slice(0, 60) +
      (workspace.description.length > 60 ? "…" : "")
    : null;

  return (
    <div className="flex items-center gap-3 px-4 py-3.5 rounded-lg bg-dark-elevated border border-dark-border">
      {/* Avatar */}
      <div className="w-10 h-10 rounded-lg bg-brand/20 flex items-center justify-center text-brand font-bold text-base shrink-0">
        {initial}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-text-primary truncate">
          {workspace.name}
        </p>
        {shortDesc ? (
          <p className="text-xs text-text-muted truncate mt-0.5">{shortDesc}</p>
        ) : (
          <p className="text-xs text-text-muted mt-0.5">
            {workspace.memberCount} member
            {workspace.memberCount !== 1 ? "s" : ""}
          </p>
        )}
      </div>

      {/* Join button */}
      {alreadyMember ? (
        <span className="text-xs text-status-completed font-medium shrink-0">
          Already joined
        </span>
      ) : (
        <Button
          variant="primary"
          size="sm"
          loading={joinLoading}
          onClick={onJoin}
          className="shrink-0"
        >
          Join
        </Button>
      )}
    </div>
  );
}
