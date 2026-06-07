# ProjectFlow — Multi-Tenant SaaS Project Management Platform
## Complete Feature Documentation

---

## What is ProjectFlow?

ProjectFlow is a production-grade, multi-tenant SaaS project management platform. "Multi-tenant" means that multiple independent organizations (called **Workspaces**) can use the same application, but each organization's data is completely isolated from others — they cannot see or access each other's projects, tasks, or users.

Think of it like Linear, Jira, or Asana: one product, thousands of companies using it simultaneously, each in their own private environment.

---

## App Flow (User Journey)

```
[Register / Login]
      ↓
[JWT Token Generated & Stored]
      ↓
[Create or Join a Workspace]
      ↓
[Dashboard — See Statistics & Overview]
      ↓
[Manage Projects — Create, View, Filter]
      ↓
[Manage Tasks — Create, Assign, Track Status]
      ↓
[Add Comments to Tasks — Collaborate]
      ↓
[View Statistics — Charts & Analytics]
```

---

## Feature 1: User Authentication

### What it does
Allows users to create an account and log in securely. Once authenticated, users receive a JWT (JSON Web Token) that proves their identity on every subsequent API request.

### How it works
1. **Registration**: User fills in name, email, password. Backend validates input, checks email isn't already taken, hashes the password using `argon2id` (most secure algorithm), and saves the user to the database.
2. **Login**: User enters email and password. Backend finds the user, compares the password hash, generates two tokens:
   - **Access Token** (short-lived, 15 minutes): Sent in the response body, stored in memory
   - **Refresh Token** (long-lived, 7 days): Stored in an `httpOnly` cookie (JavaScript cannot read this — protects against XSS attacks)
3. **Session Persistence**: When the app loads, it silently sends the refresh token cookie to get a new access token, so users stay logged in across browser refreshes.
4. **Logout**: Invalidates the refresh token in the database.

### Security measures
- Passwords hashed with argon2id (not stored in plain text)
- Rate limiting on login endpoint (5 attempts per 15 minutes)
- HttpOnly cookies prevent XSS attacks from stealing tokens
- Token rotation on refresh (old refresh token invalidated immediately)

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | Login and receive tokens |
| POST | `/api/auth/refresh` | Get new access token using cookie |
| POST | `/api/auth/logout` | Invalidate session |

---

## Feature 2: Workspace Management (Multi-Tenancy)

### What it does
A Workspace represents a company or organization. It's the root container for all projects and tasks. Users can create their own workspace or be invited to join others.

### How it works
1. **Creating a Workspace**: Any registered user can create a workspace. They automatically become the **Admin** with full control.
2. **Workspace Isolation**: Every project, task, and comment is tagged with a `workspaceId`. The backend middleware automatically filters ALL database queries by the user's current workspace. It is architecturally impossible to see data from another workspace.
3. **Joining a Workspace**: Admins can invite users by email. The invited user gets a role (Admin, Manager, or Member) within that specific workspace.
4. **Switching Workspaces**: Users can be members of multiple workspaces and switch between them via the workspace switcher in the sidebar.

### Key concepts
- **Tenant**: Another word for Workspace — your isolated environment
- **WorkspaceId**: A unique ID attached to every database document to enforce isolation
- **Workspace Creator**: Automatically becomes Admin

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workspaces` | Create a new workspace |
| GET | `/api/workspaces` | List workspaces the user belongs to |
| GET | `/api/workspaces/:id` | Get workspace details |
| PUT | `/api/workspaces/:id` | Update workspace (Admin only) |
| GET | `/api/workspaces/:id/members` | List workspace members |

---

## Feature 3: Role-Based Access Control (RBAC)

### What it does
Controls what actions users can perform based on their role within a workspace. Three roles exist, each with different permissions.

### Roles Explained

#### Admin
- Full control over the workspace
- Can: Create/Delete Projects, Assign any Task, Invite/Remove Members, Change member roles, Delete the workspace
- Typical user: Founder, CTO, Project Lead

#### Manager
- Can manage projects and tasks but cannot control membership
- Can: Create/Update Projects, Create/Assign Tasks, Update Task Status
- Cannot: Delete Projects (unless their own), Manage workspace members
- Typical user: Team Lead, Scrum Master

#### Member
- Read and participate access
- Can: View all Projects, Update their Assigned Tasks' status, Add Comments to tasks
- Cannot: Create Projects, Delete Tasks, Assign tasks to others
- Typical user: Developer, Designer, QA engineer

### How it works technically
Every protected API route has an RBAC middleware that:
1. Reads the user's role from the `WorkspaceMember` database record (not from the token — prevents role spoofing)
2. Compares it against the minimum required role for that action
3. Returns 403 Forbidden if insufficient

---

## Feature 4: Project Management

### What it does
Projects are the top-level organizational unit within a workspace. They group related tasks together (e.g., "Mobile App Redesign", "Q4 Marketing Campaign", "API v2").

### How it works
1. **Creating a Project**: Admin or Manager fills in title, description, and optional color/icon. A short key is auto-generated (e.g., "PRJ", "MOBAPP") used as a prefix for task identifiers.
2. **Project Status**: Projects can be Active, Completed, or Archived.
3. **Workspace Scoping**: When you fetch projects, only projects belonging to your current workspace are returned — always filtered by `workspaceId`.
4. **Search & Filter**: Projects can be filtered by status (Active/Completed) and searched by title using regex matching.

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/projects` | Create project (Admin/Manager) |
| GET | `/api/projects` | List projects in workspace |
| GET | `/api/projects/:id` | Get project details |
| PUT | `/api/projects/:id` | Update project (Admin/Manager) |
| DELETE | `/api/projects/:id` | Delete project (Admin only) |

---

## Feature 5: Task Management

### What it does
Tasks are the core work items within a project. They represent individual pieces of work that need to be done, tracked, and completed.

### Task Fields
- **Title**: Short description of the work (required)
- **Description**: Detailed explanation (supports markdown)
- **Status**: Current state of the task
- **Priority**: Urgency level
- **Assignee**: Which team member is responsible
- **Due Date**: When it should be completed
- **Task Identifier**: Auto-generated unique ID like `PRJ-42`

### Task Status Flow
```
Pending → In Progress → Completed
```
- **Pending**: Task created but not started
- **In Progress**: Someone is actively working on it
- **Completed**: Work is done

### Task Priority Levels
- **High**: Must be done immediately
- **Medium**: Should be done soon (default)
- **Low**: Nice to have, no urgency

### How it works
1. **Creating a Task**: Admin or Manager creates a task within a project, optionally assigning it to a member and setting priority/due date.
2. **Assigning Tasks**: Tasks can be assigned to any workspace member. Only Admins and Managers can assign tasks.
3. **Updating Status**: Members can update the status of tasks assigned to them. Managers and Admins can update any task.
4. **Task Identifier**: Each task gets a unique identifier (`{PROJECT_KEY}-{number}`) that never changes — used to reference tasks in comments and external links.

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/tasks` | Create task |
| GET | `/api/tasks` | List tasks (with filters) |
| GET | `/api/tasks/:id` | Get task details |
| PUT | `/api/tasks/:id` | Update task |
| PATCH | `/api/tasks/:id/status` | Update only status |
| DELETE | `/api/tasks/:id` | Delete task (Admin/Manager) |

### Search & Filter
Tasks can be filtered by:
- Status (Pending / In Progress / Completed)
- Priority (High / Medium / Low)
- Assignee (filter by a specific user)
- Search term (searches title using regex)

---

## Feature 6: Comments System

### What it does
Allows team members to have discussions directly on a task. Comments are the primary collaboration tool for asking questions, providing updates, or leaving notes.

### How it works
1. **Adding a Comment**: Any workspace member can comment on any task they can view.
2. **Deleting a Comment**: Users can delete their own comments. Admins can delete any comment.
3. **Author Attribution**: Every comment shows who wrote it and when.
4. **Task Context**: Comments are always linked to a specific task via `taskId`.

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/comments` | Add comment to a task |
| GET | `/api/comments/:taskId` | Get all comments for a task |
| DELETE | `/api/comments/:id` | Delete a comment |

---

## Feature 7: Dashboard & Statistics

### What it does
Provides a high-level overview of the workspace's health and productivity through statistics and visual charts.

### Statistics Displayed
- **Total Projects**: How many projects exist in the workspace
- **Total Tasks**: Total number of tasks across all projects
- **Completed Tasks**: Tasks with "Completed" status
- **Pending Tasks**: Tasks with "Pending" or "In Progress" status
- **Task completion rate**: Percentage of tasks completed

### How it works technically
The dashboard uses MongoDB's **Aggregation Pipeline** to compute statistics in a single database query:
1. Filter all tasks by `workspaceId`
2. Group by status
3. Count each group
4. Return summary object

This is far more efficient than fetching all tasks and counting in JavaScript.

### API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/stats` | Get workspace statistics |

---

## Feature 8: Search & Filter

### What it does
Allows users to find specific projects and tasks quickly across the workspace.

### How Search Works
- **Backend search**: Uses MongoDB regex queries to search project/task titles
- **Case-insensitive**: Searching "login" finds "Login Page", "User Login", "Fix Login Bug"
- **Real-time**: Search updates results as you type (with debounce to avoid excessive API calls)

### Filter Options

**Projects:**
- Filter by status: Active, Completed, Archived

**Tasks:**
- Filter by status: All, Pending, In Progress, Completed
- Filter by priority: High, Medium, Low
- Filter by assignee: Select a specific team member
- Combined filters: Multiple filters can be applied simultaneously

---

## Feature 9: Protected Routes

### What it does
Ensures that unauthenticated users cannot access any part of the application beyond the login and registration pages.

### How it works
```
User visits any /dashboard/* route
         ↓
ProtectedRoute component checks if JWT token exists
         ↓
Token exists? → Render the requested page
Token missing? → Redirect to /login (saves intended destination)
         ↓
After login → Redirect back to originally intended page
```

---

## Feature 10: Responsive Design

### What it does
The application works seamlessly on desktop computers, tablets, and mobile phones.

### Responsive Components
- **Navbar**: Collapses to hamburger menu on mobile
- **Sidebar**: Collapses to icon-only mode on tablet, slides in as overlay on mobile
- **Task Tables**: Scrollable horizontally on small screens
- **Forms**: Full-width on mobile, constrained width on desktop
- **Dashboard Cards**: 4 columns on desktop → 2 on tablet → 1 on mobile
- **Kanban Board**: Horizontal scroll on mobile

---

## Data Model Overview

```
User
  ├── Has many WorkspaceMemberships
  └── Created many Tasks/Comments

Workspace (= Tenant)
  ├── Has many WorkspaceMembers (with roles)
  ├── Has many Projects
  └── Has many Tasks (via Projects)

WorkspaceMember (join table)
  ├── belongs to User
  ├── belongs to Workspace
  └── has a Role (admin/manager/member)

Project
  ├── belongs to Workspace
  └── has many Tasks

Task
  ├── belongs to Workspace
  ├── belongs to Project
  ├── assigned to User
  └── has many Comments

Comment
  ├── belongs to Task
  └── written by User
```

---

## Technology Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Node.js | JavaScript runtime |
| Express.js | Web framework |
| MongoDB | Database (NoSQL) |
| Mongoose | MongoDB ORM |
| JWT | Authentication tokens |
| bcryptjs | Password hashing |
| CORS | Cross-origin requests |
| dotenv | Environment variables |
| express-validator | Input validation |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| Vite | Build tool |
| React Router v6 | Client-side routing |
| Axios | HTTP client |
| React Query | Server state management |
| Tailwind CSS | Styling |
| Context API | Global auth state |
| Recharts | Dashboard charts |

---

## Security Architecture

```
Internet → HTTPS Only
  ↓
Rate Limiter (100 req/15min globally, 5 req/15min for auth)
  ↓
Helmet.js (Security headers: CSP, HSTS, X-Frame-Options)
  ↓
JWT Verification Middleware
  ↓
Workspace Isolation Middleware (verify user ∈ workspace)
  ↓
RBAC Middleware (verify role ≥ required role)
  ↓
Input Validation (Zod schema validation)
  ↓
Database Query (always filtered by workspaceId)
```

---

## Color Design System

| Color | Hex | Usage |
|-------|-----|-------|
| Brand Primary | `#5E6AD2` | Buttons, links, active states |
| Success/Done | `#2D9964` | Completed tasks, success messages |
| Warning/Review | `#CA8E1B` | In-progress, warnings |
| Error/Urgent | `#CD4945` | Errors, urgent priority |
| Info/Active | `#2E7CD1` | Info messages, active filters |
| Background | `#0F0F10` | App background (dark mode) |
| Surface | `#1A1A1D` | Cards, modals |
| Elevated | `#222326` | Hover states, nav |

**Font:** Inter (designed specifically for screen interfaces)

---

*Last updated: June 2026*
