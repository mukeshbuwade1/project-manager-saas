# ProjectFlow

A production-grade Multi-Tenant SaaS Project Management Platform. Multiple organizations (Workspaces) can manage projects and tasks in complete isolation — like Linear or Jira, but yours to own.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, React Router v6 |
| State | TanStack Query v5 (server state), Context API (auth) |
| HTTP | Axios with JWT interceptors |
| Charts | Recharts |
| Backend | Node.js, Express 4 |
| Database | MongoDB + Mongoose 8 |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Security | Helmet, CORS, express-rate-limit |

---

## Folder Structure

```
saas/
├── backend/
│   ├── config/
│   │   └── db.js                  # MongoDB connection
│   ├── controllers/
│   │   ├── authController.js      # Register, login, refresh, logout
│   │   ├── workspaceController.js # Workspace CRUD + member management
│   │   ├── projectController.js   # Project CRUD
│   │   ├── taskController.js      # Task CRUD + status update
│   │   ├── commentController.js   # Comment CRUD
│   │   └── dashboardController.js # Stats aggregation
│   ├── middleware/
│   │   ├── auth.js                # JWT verification
│   │   ├── workspace.js           # Workspace isolation enforcement
│   │   ├── rbac.js                # Role-based access control
│   │   └── errorHandler.js        # Global error handler
│   ├── models/
│   │   ├── User.js
│   │   ├── Workspace.js
│   │   ├── WorkspaceMember.js     # RBAC join table
│   │   ├── Project.js
│   │   ├── Task.js
│   │   └── Comment.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── workspaces.js
│   │   ├── projects.js
│   │   ├── tasks.js
│   │   ├── comments.js
│   │   └── dashboard.js
│   ├── .env                       # Environment variables (gitignore this)
│   ├── .env.example
│   └── server.js                  # Express app entry point
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/                # Reusable: Button, Input, Modal, Badge, Card, Spinner, Toast
│   │   │   └── shared/            # App-specific: Sidebar, Navbar, Avatar, StatsCard, TaskCard, ProjectCard
│   │   ├── context/
│   │   │   ├── AuthContext.jsx    # Global auth state (user, token, login, logout)
│   │   │   └── WorkspaceContext.jsx # Active workspace state
│   │   ├── layouts/
│   │   │   ├── AppLayout.jsx      # Sidebar + content wrapper
│   │   │   ├── AuthLayout.jsx     # Centered auth card
│   │   │   └── ProtectedRoute.jsx # Auth guard
│   │   ├── lib/
│   │   │   ├── axios.js           # Configured axios instance with interceptors
│   │   │   └── utils.js           # formatDate, getInitials, debounce
│   │   ├── pages/
│   │   │   ├── LoginPage.jsx
│   │   │   ├── RegisterPage.jsx
│   │   │   ├── WorkspaceSetupPage.jsx
│   │   │   ├── DashboardPage.jsx
│   │   │   ├── ProjectsPage.jsx
│   │   │   ├── ProjectDetailPage.jsx  # List + Kanban board view
│   │   │   ├── TaskDetailPage.jsx     # Task detail + comments
│   │   │   ├── MembersPage.jsx
│   │   │   └── SettingsPage.jsx
│   │   ├── router/
│   │   │   └── index.jsx          # React Router v6 route tree
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css              # Tailwind directives + custom styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── FEATURES.md                    # Full feature documentation
└── README.md
```

---

## Setup Steps

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### 1. Clone and navigate
```bash
cd /path/to/saas
```

### 2. Backend setup
```bash
cd backend

# Install dependencies (already done)
npm install

# Configure environment
cp .env.example .env
# Edit .env and set MONGODB_URI to your MongoDB connection string
# JWT secrets are already generated — you can regenerate with: openssl rand -base64 32

# Start development server
npm run dev
```

Backend runs at `http://localhost:5000`

### 3. Frontend setup
```bash
cd ../frontend

# Install dependencies (already done)
npm install

# Start development server
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Open the app
Navigate to `http://localhost:5173` in your browser.

---

## Environment Variables

**`backend/.env`**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/projectflow
JWT_ACCESS_SECRET=<generated secret>
JWT_REFRESH_SECRET=<generated secret>
JWT_ACCESS_EXPIRES=15m
JWT_REFRESH_EXPIRES=7d
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

---

## API Reference

### Authentication
```
POST   /api/auth/register      Register new user
POST   /api/auth/login         Login (returns access token + sets refresh cookie)
POST   /api/auth/refresh       Refresh access token using httpOnly cookie
POST   /api/auth/logout        Logout (clears refresh token)
```

### Workspaces
```
GET    /api/workspaces                      List user's workspaces
POST   /api/workspaces                      Create workspace (user becomes Admin)
GET    /api/workspaces/:id                  Get workspace details
PUT    /api/workspaces/:id                  Update workspace (Admin)
GET    /api/workspaces/:id/members          List workspace members
```

### Projects
```
GET    /api/projects?workspaceId=...        List projects (filter: status, search)
POST   /api/projects                        Create project (Admin/Manager)
GET    /api/projects/:id                    Get project
PUT    /api/projects/:id                    Update project (Admin/Manager)
DELETE /api/projects/:id                    Delete project (Admin)
```

### Tasks
```
GET    /api/tasks?workspaceId=...           List tasks (filter: status, priority, assignedTo, search)
POST   /api/tasks                           Create task
GET    /api/tasks/:id                       Get task
PUT    /api/tasks/:id                       Update task
PATCH  /api/tasks/:id/status                Update task status only
DELETE /api/tasks/:id                       Delete task (Admin/Manager)
```

### Comments
```
POST   /api/comments                        Add comment to task
GET    /api/comments/:taskId                Get task comments
DELETE /api/comments/:id                    Delete comment
```

### Dashboard
```
GET    /api/dashboard/stats?workspaceId=... Get workspace statistics
```

---

## Roles & Permissions

| Action | Admin | Manager | Member |
|--------|-------|---------|--------|
| Create Workspace | ✓ | - | - |
| Invite Members | ✓ | - | - |
| Create Project | ✓ | ✓ | - |
| Delete Project | ✓ | - | - |
| Create Task | ✓ | ✓ | - |
| Assign Task | ✓ | ✓ | - |
| Update Own Task Status | ✓ | ✓ | ✓ |
| Add Comments | ✓ | ✓ | ✓ |
| View Projects | ✓ | ✓ | ✓ |

---

## Security

- JWT access tokens (15 min TTL) in response body
- Refresh tokens (7 day TTL) in `httpOnly` cookies — immune to XSS
- Refresh token rotation on every use
- Password hashing with bcryptjs
- Rate limiting: 100 req/15min general, 10 req/15min on auth routes
- Helmet.js security headers (CSP, HSTS, X-Frame-Options)
- Every DB query scoped by `workspaceId` — tenants are architecturally isolated

---

## Design System

- **Primary**: `#5E6AD2` (Linear indigo)
- **Font**: Inter (Google Fonts)
- **Mode**: Dark-first with `#0F0F10` base background
- **Status colors**: green (completed), blue (in progress), yellow (pending)
- **Priority colors**: red (high), yellow (medium), blue (low)
