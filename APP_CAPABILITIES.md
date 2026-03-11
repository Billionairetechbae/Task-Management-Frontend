# Admiino Task Manager — Capabilities & Role Model (Before vs After)

## Overview
Admiino is a workspace‑centric task and collaboration platform for executives and their teams. It provides:
- Task lifecycle management (create, assign, comment, attach files, update status).
- Real‑time team chat per task (WebSocket) with optimistic UI.
- Cross‑workspace “All Tasks” view with filters and pagination.
- Workspace‑scoped directories and team management (invite, verify/remove/restore).
- Notifications (unread counts, dropdown, list, mark read/read‑all, delete).
- Dashboard metrics and analytics that adapt to a user’s workspace role.
- Harmony (team compatibility) assessment and reports.

The application is now “workspace‑first”: users log in to a single, unified dashboard, and permissions come from the active workspace membership. Platform‑wide “admin” remains for administrative functions.

---

## Before (Legacy Model)
- Platform signup/roles:
  - Users registered as one of three roles: executive, manager, or team_member.
  - Sidebar and dashboards were driven by `user.role`.
  - Team and profile screens used a mix of membership and user IDs; some screens operated on `CompanyMember.id` instead of `userId`.
- Workspaces/Authorization:
  - Some pages were workspace‑aware but did not consistently send `x-company-id`.
  - Access control mixed global user roles and workspace context.
- Chat & Notifications:
  - Task chat used WebSocket but messages could remain stuck on “Sending…” if the sender wasn’t in the room yet.
  - Notifications existed with partial scoping and limited real‑time badge updates.
- Invites:
  - Direct “team invite” approach existed; token-based invite flows were limited.

---

## After (Refactored Model)
### Platform Roles (Global)
- User
  - Default for all non‑admins.
  - Sees the unified executive‑level dashboard UI at the platform level.
  - PlatformRole is “user” (server still returns `role: "executive"` for compatibility).
- Admin (Platform Admin)
  - Manages platform‑wide functions (users, companies, analytics, logs).
  - Global admin is identified by `platformRole = platform_admin` (legacy `user.role === "admin"` still supported).

### Workspace Roles (Authorization Source of Truth)
- Owner / Admin: Full workspace features, including team management, invites, and task delegation.
- Manager: Mid‑level workspace features (manage tasks and team members in scope).
- Member: Restricted workspace features (view and work on assigned tasks only).

### Key Behavior Changes
- Unified Dashboard
  - Everyone routes to `/dashboard`. Old routes remain as aliases.
  - Sidebar and dashboard content adapt to the active workspace role.
  - Switching workspaces immediately updates visible features and metrics.
- Workspace‑First API Usage
  - All workspace endpoints send `x-company-id`.
  - Auth endpoints do not send `x-company-id` (`/auth/me`, `/auth/login`, etc.).
  - Team listing parsing uses `data.members` consistently (legacy shapes preserved as fallback).
- Team & Profiles
  - TeamDirectory and TeamManagement use `member.userId` (not membership id) for links and actions.
  - TeamMemberProfile loads via `GET /team/members/:userId` (workspace‑safe) and uses membership data for verification/status.
- Task Assignees
  - Assignment lists are derived from `data.members` and mapped to `users[]` (filtering removed/unverified).
  - Values are always user IDs.
- Notifications
  - Workspace‑scoped REST endpoints with unread counts, mark read/read‑all, delete.
  - Bell displays unread badge; panel streams updates from WebSocket (`type: "notification"`).
- Chat Reliability
  - Server immediately echoes `new_comment` to the sender and auto‑joins the room if needed.
  - Client reconciles optimistic messages by message ID, so “Sending…” clears instantly when saved.

---

## Major App Features
### Tasks
- Create, edit, assign (one or many), set deadlines, categories, priorities.
- Upload attachments, remove attachments (role‑gated).
- Track estimated/actual hours and status transitions.
- View cross‑workspace tasks (`All Tasks`) with pagination and filters.
- “My Tasks” (route available) for user‑focused views.

### Task Chat (Real‑Time)
- Per‑task chat with optimistic “Sending…” states that reconcile on server echo.
- Typing indicators and room presence (join/leave).
- HTTP fallback when WebSocket is unavailable.

### Team Management
- Workspace‑scoped members with roles: owner/admin/manager/member.
- Invite by email with a target role; token acceptance flow (accept/reject).
- Verify, reject, remove, restore members (admin/owner gates).
- Workspace‑safe team member profiles and directory.

### Notifications
- Unread badge in header bell; dropdown lists recent notifications.
- Mark one as read, mark all read, delete; “View all” page with pagination.
- WebSocket live updates (type “notification”).

### Dashboards
- Unified `/dashboard` entry.
- Owner/Admin: full executive metrics and actions (hire talent, delegate tasks).
- Manager: scoped team and task management.
- Member: “My Tasks” metrics and lists; actions limited to updating own progress.

### Harmony (Team Compatibility)
- Assessment submission, latest report retrieval, workspace scoreboard overview.

---

## Role Capabilities (Highlights)
### Platform
- User:
  - Can access the unified dashboard and all non‑admin platform screens.
  - Workspace features depend on the active workspace role.
- Admin:
  - Platform‑wide management: users, companies, analytics, logs, invites review.

### Workspace
- Owner/Admin:
  - Full control (create tasks, assign, manage attachments, manage team, invites, remove/restore).
  - Access dashboards with full metrics and actions.
- Manager:
  - Manage tasks and team within scope; view team directories and members.
- Member:
  - View tasks assigned to them; update status and hours; participate in task chat.
  - View limited dashboard focused on personal work and progress.

---

## Operational Flows
### Signup & Login
1. User signs up/logs in (platform role defaults to “user”).
2. App resolves workspaces and selects `activeCompanyId`:
   - `localStorage.activeCompanyId` if valid; else first available workspace.
3. UI renders the unified dashboard and a role‑based sidebar according to the active workspace’s membership role.

### Invites
1. Owner/Admin invites a user to a workspace with a target role (email + role).
2. Invitee accepts via token link, completes signup as a platform user.
3. On acceptance, workspace membership role applies in that workspace; platform role remains “user”.

### Switching Workspaces
1. User selects another workspace via the workspace switcher.
2. `activeCompanyId` updates, `workspaceRole` is re‑derived.
3. Sidebar and dashboard refresh to match the new workspace’s permissions.

### Task Collaboration
1. Create tasks, assign members, attach files.
2. Collaborate in per‑task chat (real‑time with optimistic updates).
3. Notifications keep users in the loop (badge, dropdown, list).

---

## Backward Compatibility
- Legacy routes and payloads remain accessible (aliases to the new unified dashboard and normalized APIs).
- Server returns `user.role = "executive"` for non‑admins in login/me responses so older UI surfaces continue to render without change.
- Team endpoints accept both `:assistantId` and `:userId` for verify/reject actions.
- Parsing includes fallbacks (e.g., `data.team_members` or `data.team`) where older responses are still present.

---

## Notes on Security & Headers
- Auth routes (e.g., `/auth/me`, `/auth/login`) must not send `x-company-id`.
- Workspace routes (tasks, team, dashboard, notifications, profile) always include `x-company-id` to scope data correctly.
- Platform admin bypasses workspace limitations where appropriate.

---

## Where to Look in the Codebase
- Auth & Workspaces: `src/contexts/AuthContext.tsx`
- API client (headers, endpoints): `src/lib/api.ts`
- Dashboard layout & sidebar (workspaceRole‑aware): `src/components/dashboard/DashboardLayout.tsx`
- Unified dashboard page: `src/pages/DashboardExecutive.tsx`
- Team pages: `src/pages/TeamDirectory.tsx`, `src/pages/TeamManagement.tsx`, `src/pages/TeamMemberProfile.tsx`
- Task experience: `src/components/CreateTaskDialog.tsx`, `src/components/dashboard/TaskEditDrawer.tsx`, `src/pages/TaskDetails.tsx`
- Realtime & Notifications: `src/contexts/WebSocketContext.tsx`, `src/contexts/NotificationsContext.tsx`, `src/components/notifications/NotificationsDropdown.tsx`

