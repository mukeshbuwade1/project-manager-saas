import { NavLink, useNavigate } from "react-router-dom";
import clsx from "clsx";
import { useAuth } from "../../context/AuthContext";
import { useWorkspace } from "../../context/WorkspaceContext";
import Avatar from "./Avatar";

const navItems = [
  { to: "/dashboard", label: "Dashboard", icon: "◈" },
  { to: "/projects", label: "Projects", icon: "▤" },
  { to: "/tasks", label: "Tasks", icon: "✓" },
  { to: "/members", label: "Members", icon: "◉" },
  { to: "/settings", label: "Settings", icon: "⚙" },
];

function NavItem({ to, label, icon }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        clsx(
          "flex items-center gap-3 px-3 py-2 rounded text-sm transition-default",
          isActive
            ? "bg-brand/15 text-brand font-medium"
            : "text-text-secondary hover:text-text-primary hover:bg-dark-hover",
        )
      }
    >
      <span className="text-base w-5 text-center shrink-0">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );
}

export default function Sidebar({ isOpen, onClose }) {
  const { user, logout } = useAuth();
  const { currentWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const handleWorkspaceChange = (e) => {
    const ws = workspaces.find((w) => (w._id || w.id) === e.target.value);
    if (ws) {
      switchWorkspace(ws);
      navigate("/dashboard");
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Workspace selector */}
      <div className="px-4 py-4 border-b border-dark-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-6 h-6 rounded bg-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
            {(currentWorkspace?.name || "P")[0].toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-text-primary truncate flex-1">
            {currentWorkspace?.name || "No Workspace"}
          </span>
        </div>
        {workspaces.length > 1 && (
          <select
            value={currentWorkspace?._id || currentWorkspace?.id || ""}
            onChange={handleWorkspaceChange}
            className="w-full text-xs bg-dark-elevated border border-dark-border rounded px-2 py-1.5 text-text-secondary focus:outline-none focus:border-brand"
          >
            {workspaces.map((ws) => (
              <option key={ws._id || ws.id} value={ws._id || ws.id}>
                {ws.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Logo */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-brand rounded flex items-center justify-center">
            <svg
              className="w-3 h-3 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="text-sm font-bold text-text-primary tracking-tight">
            ProjectFlow
          </span>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-3 space-y-0.5" onClick={onClose}>
        {navItems.map((item) => (
          <NavItem key={item.to} {...item} />
        ))}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-dark-border">
        <div className="flex items-center gap-3">
          <Avatar name={user?.name || ""} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-primary truncate">
              {user?.name || "User"}
            </p>
            <p className="text-xs text-text-muted truncate">
              {user?.email || ""}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Logout"
            className="text-text-muted hover:text-red-400 transition-colors p-1 rounded hover:bg-dark-hover"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-col bg-dark-surface border-r border-dark-border shrink-0 h-screen sticky top-0">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {isOpen && (
        <>
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="md:hidden fixed left-0 top-0 h-full w-64 z-50 bg-dark-surface border-r border-dark-border flex flex-col">
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
}
