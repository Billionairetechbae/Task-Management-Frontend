# Admiino Mobile App — Discovery & Readiness Audit

| | |
|---|---|
| **Audit date** | 22 November 2026 |
| **Primary subject** | User Portal — `adminno-task-manager` (React 18, TypeScript, Vite 7) |
| **Code state audited** | Branch `fix/team-dashboard-metrics-and-navigation`, HEAD `e57ea33`, clean working tree at the start of the audit |
| **Also read (read-only)** | `admiino-backend` (route files, auth middleware, WebSocket server, models, upload and CORS config). `admiino-admin` and `Admiino-Landing-Page` were only listed, not audited |
| **Nature of work** | Read-only audit and planning. No mobile code, no repository, no package changes, no backend changes, no commits |

**How to read the status labels in this document**

| Label | Meaning |
|---|---|
| **Verified (web source)** | Confirmed by reading the User Portal source |
| **Verified (backend source)** | Confirmed by reading the backend source. This confirms what the code does, not how it behaves in production |
| **Unverified** | Not confirmed. Needs a runtime check, a product answer, or an inspection of something outside this audit |
| **Recommendation** | A proposal by the auditor, not a fact about the codebase |

**What was not done.** The web app was not run in a browser. The 111 web test files and the backend tests were not executed. No API request was made to any environment, and `.env` files were not opened. Backend findings are limited to path and method matching plus targeted source reading. Request and response schemas were not compared field by field, except where noted. The backend's `routes-summary.json` is dated 6 Aug 2026 and was treated as stale. Routes were re-derived from the route files.

---

## 1. Executive Summary

### 1.1 The numbers

| Measure | Count | Basis |
|---|---|---|
| Web route entries in `src/App.tsx` | **72** | 71 URL patterns plus the `*` catch-all. Two more URL patterns are matched inside the `/teams/*` page (team task, team subtask) |
| Distinct web screens | **60** | Unique page-level views after removing aliases, redirects and duplicates (method in §4.3) |
| Web page files that are not reachable from any route | **13** | Dead or orphaned pages (list in §4.4) |
| Proposed mobile screens | **59** | Route-level screens only. Sheets and dialogs are listed separately and not counted (§5.4) |
| Mobile onboarding / authentication screens | **12** | 10 in MVP, 2 in Phase 2 |
| Mobile MVP screens | **25** | 10 auth/onboarding plus 15 core-app screens |
| Mobile Phase 2 screens | **20** | |
| Mobile Phase 3 ("Later") screens | **14** | |
| Web screens deliberately not carried to mobile | **15** | Legacy, web-only admin, public-link or placeholder screens (§5.5) |

### 1.2 Recommended architecture in one paragraph

Build a separate **Expo (React Native, TypeScript strict) app using development builds and EAS**, with **Expo Router** for navigation, **TanStack Query v5** for server state (as on the web), **expo-secure-store** for the session token, **NativeWind** for styling with a shared design-token file, and **expo-notifications** for push. Use **five bottom tabs: Home, Tasks, Projects, Inbox, More.** Reach Teams, Calendar, Drive, Time and workspace administration through More, Home shortcuts and the Tasks view switcher. Start with a **copied and slimmed API layer** that has a contract-drift check, and plan to extract it into a shared private package once the mobile app's endpoint set settles (§11.6).

### 1.3 Five findings that change the plan

1. **The backend has no refresh-token flow for user sessions, and no push infrastructure.**
   - Verified (backend source): the login token is a single HS256 JWT with `expiresIn: process.env.JWT_EXPIRES_IN || "1d"` (`src/middleware/auth.js:94-95`). Refresh tokens exist only for the MCP OAuth feature. The deployed value of `JWT_EXPIRES_IN` is Unverified.
   - On a phone, a user who is signed out every day is a product defect. A refresh or longer-lived device session is needed (**backend change B-01**).
   - There are no device-token models, no push provider code, and notification delivery channels are limited to `whatsapp` and `email` (`src/models/NotificationDelivery.js:9`). Push needs new backend work (**B-02**).

2. **Google sign-in and public signup are built for browsers.**
   - Verified (backend source): `/auth/google` returns a Google URL, and the callback redirects to `FRONTEND_URL/auth/google/callback?token=<JWT>` (`authController.js:1347-1357`). The JWT travels in a URL query string to a web origin. A mobile app needs either a native redirect target or a native ID-token exchange (**B-03**).
   - Verified (backend source): public signup requires a Cloudflare Turnstile token and fails closed (`signupProtection.js`, `turnstileService.js`). A native form cannot produce that token without a WebView widget or a new mobile attestation path (**B-04**, decision D-03).

3. **Password reset and email-token pages are unreachable on the web today.**
   - Verified (web source): in `src/App.tsx:142-144`, `/forgot-password`, `/reset-password/:token` and `/verify-email/:token` all render `<Login />`. The real `ForgotPassword`, `ResetPassword` and `VerifyEmail` pages exist but are imported nowhere. This has been the case since commit `8108749` (6 Jul 2026).
   - Unverified (runtime): it was not tested in a browser. If confirmed, web password reset is broken, and the mobile app cannot lean on the web for recovery until it is fixed.

4. **Role handling in the web UI is inconsistent, so mobile must not copy it.**
   - Verified (web source): `ProtectedRoute` and several buttons check the legacy platform role `user.role`. Verified (backend source): `User.role` defaults to `"executive"` and signup paths set it to `"executive"`, so almost every user has that value.
   - Example: the "Approve and Complete" button in `TaskDetails.tsx:1733` shows for `["admin","manager","executive"]`, which is effectively everyone.
   - The real authority is the per-workspace role (`owner | admin | manager | member | guest`) plus eight configurable permissions with per-user overrides. Mobile must drive its UI from `GET /access-requests/me/effective-permissions` and the per-task `access` object, never from hard-coded roles.

5. **The web already calls two backend routes that do not exist, and the mobile app must not inherit them.**
   - Verified (both): `api.updateTaskProgress` calls `PATCH /workflow/:id/progress`. The backend mounts that handler at `/task-workflow/:id/progress`, and no `/workflow` mount exists. The caller is the inline status dropdown in `TaskComponents.tsx:212` for non-privileged users.
   - Verified (both): `api.previewTaskAttachment` calls `GET /tasks/:id/attachments/:attachmentId/preview` (used at `TaskDetails.tsx:246` and `TaskCommentAttachment.tsx:81`). No such route exists in the backend. Only the download route and the connected-storage preview route exist. How the web recovers from the failure was not checked.
   - A third client method, `getWebSocketToken` (`GET /auth/websocket-token`), also has no backend route, but no page calls it.
   - Mobile should change task status through `PATCH /tasks/:id` (the backend owner should confirm that members may do so) and use the download route for attachments, unless the backend adds the missing routes.

### 1.4 Overall readiness verdict

| Area | Readiness | Comment |
|---|---|---|
| Core task, project, comment APIs | **Good** | 323 of 347 client endpoint calls match a backend route by method and path. The 24 that did not match were checked by hand (§12.2) |
| Bearer-token + `x-company-id` model | **Good** | Simple and stateless, works the same on mobile |
| CORS | **Good** | The backend allows requests with no `Origin` header (`config/cors.js:11`), which is how native HTTP clients behave |
| Session lifetime | **Gap** | No refresh flow (B-01) |
| Push notifications | **Gap** | Nothing exists server-side (B-02) |
| Google login | **Gap** | Browser redirect only (B-03) |
| Signup | **Gap** | Turnstile only (B-04) |
| Deep links | **Gap** | Email links point at the web origin. No `apple-app-site-association` or `assetlinks.json` is served (§12.5) |
| File upload | **Caution** | HEIC is not an allowed type, and iPhone photos default to HEIC (§12.6) |
| Frontend code reuse | **Moderate for logic, none for UI** | About 5,400 lines of API client and types are reusable after decoupling. No component is reusable (§11) |
| Test safety net | **Web only** | 111 web test files all depend on a DOM test environment (§11.9) |

---

## 2. Existing Web Application Overview

### 2.1 Product

Admiino is a workspace-based task and collaboration platform. A user belongs to one or more workspaces (companies). Inside a workspace they manage tasks, projects, teams, files, a task-deadline calendar and notifications. Workspace behaviour is controlled by roles, eight configurable permissions, and governance settings. The same backend also serves a WhatsApp assistant, an MCP integration and an admin portal.

### 2.2 Technical profile (Verified, web source)

| Item | Finding |
|---|---|
| Framework | React 18.3, TypeScript 5.8, Vite 7, React Router 6 (`BrowserRouter`) |
| Source size | 442 TS/TSX files, of which 328 are non-test source. 76 page files, 49 UI-kit files, about 25,000 lines in pages |
| Largest files | `lib/api.ts` 5,423 lines, `pages/TaskDetails.tsx` 2,678, `pages/ProjectDetails.tsx` 2,343, `pages/Teams.tsx` 1,446 |
| UI | shadcn/ui on Radix, Tailwind 3 with CSS-variable tokens, lucide-react icons, sonner toasts, vaul drawers |
| Server state | TanStack Query v5, memory-only cache, `staleTime` 60 s, retry policy tuned for outages (`lib/queryClient.ts`) |
| Other state | Three React contexts: `AuthContext`, `WebSocketContext`, `NotificationsContext` |
| Forms | Hand-rolled controlled inputs and inline validation. `react-hook-form` and `zod` are in `package.json` but are not used by any page (only `components/ui/form.tsx` imports react-hook-form; nothing imports zod) |
| Charts | `recharts` appears only inside the shadcn wrapper `components/ui/chart.tsx`. No page renders a chart. Progress is shown with CSS bars |
| Calendar | Custom Month/Week/Day views (`components/calendar/`), with `react-big-calendar` used only for date helpers |
| Realtime | One WebSocket at `/ws?token=<JWT>`, with reconnect, task rooms, typing indicators, comment acknowledgements and cache invalidation (`lib/websocket.ts`, `hooks/useRealtimeCacheSync.ts`) |
| Monitoring | Sentry (`@sentry/react`) |
| Hosting | Vercel, single-page-app rewrite of every path to `index.html` (`vercel.json`) |
| Environments | `VITE_API_BASE_URL` per build target. A build validator forbids staging builds from using production hosts (`scripts/build-environment.mjs`) |
| Tests | 111 test files (Vitest + happy-dom + Testing Library). Not executed in this audit |

### 2.3 Session and workspace model (Verified, web source)

- **Token.** One bearer token is stored in `localStorage` under two keys, `auth_token` and `token` (`AuthContext.tsx:133-134`, `api.ts:2231`). There is no refresh token and no `401` retry. A `401` with a "session is no longer valid" message clears storage (`api.ts:2297-2302`).
- **Workspace scoping.** Every workspace-scoped call sends `x-company-id` from `localStorage.activeCompanyId`. Auth calls (`/auth/me`, `/me/workspaces`) do not.
- **Workspace switching.** `setActiveCompanyId` clears the previous workspace's query cache. The Login page also calls `window.location.reload()` when it has to reset the active workspace.
- **Suspended workspaces.** HTTP `423` with code `WORKSPACE_SUSPENDED` fires a window event. `ProtectedRoute` then replaces every page with a recovery screen.
- **Admin accounts.** Accounts with `accountType === "admin"` are rejected at login and sent to the separate admin portal.

### 2.4 Navigation (Verified, web source: `components/dashboard/DashboardLayout.tsx:127-153`)

Sidebar, in order: Dashboard · Tasks (All Tasks, Task Workbench) · Projects (All Projects, Portfolio, Templates) · Calendar · Team (Teams, Team Directory, Hire Talent) · Harmony · Drive · Settings. The Team group depends on the `view_workspace_members` permission, and Hire Talent on owner, admin or manager role.

Header: global search, workspace switcher, WebSocket status, global timer, integrations dropdown, support launcher, notification bell, account menu. The account menu holds Profile, Settings, Notifications, Integrations, and for owners/admins Workspace Settings, Subscription & Seats, Customization, Activity Log and Workspace Members.

Many screens have no sidebar link and are reached only from other pages, search or notifications. Examples are Board, Time, Workload, Project Health, Trash, Shared with Me and Client Access (`components/dashboard/searchNavigation.ts`).

### 2.5 Responsive state

The web app already has phone layouts. A recent responsive and accessibility remediation checked 32 routes at 390 px and 320 px wide and ran accessibility scans in Chrome (`docs/responsive-remediation/README.md`). Safari and Firefox were not covered, and the live-backend smoke test was not done. `TaskDetails` has a six-tab mobile bar: Tasks, Chat, Files, Activity, Time, Edit (`TaskDetails.tsx:209-216`).

**Implication.** A phone can already use the web app in a browser. The case for a native app therefore rests on things a browser cannot do well: push notifications, a persistent login, camera and photo capture, share-sheet and deep-link handling, background-safe sessions and offline reading. The roadmap in §15 is built around these.

---

## 3. Full Feature Inventory

"Status" describes the web implementation. A page or menu item that exists is not counted as functional unless the source shows a working data path. **Mobile** shows the recommended phase (P1 = MVP, P2 = Phase 2, P3 = Phase 3, X = not on mobile).

| # | Module | What it does today | Web routes | Main source files | Backend areas used | Status | Mobile |
|---|---|---|---|---|---|---|---|
| 1 | **Authentication & registration** | Email + password login, Google login, user signup (with consent checkbox and Turnstile), legacy role-specific signups, resend verification, email-verification confirm page, workspace and organisation invitations | `/`, `/signup`, `/signup-with-invite`, `/invite/:token`, `/verify-email/setup`, `/auth/google/callback`, legacy `/signup-*` | `pages/Login.tsx`, `Signup.tsx`, `Invite.tsx`, `VerifyEmailSetup.tsx`, `AuthGoogleCallback.tsx`, `contexts/AuthContext.tsx` | `/auth/*`, `/invites/*`, `/me/workspaces` | **Implemented**, with a defect: forgot/reset/verify-token routes render the login form (§1.3 item 3) | P1 |
| 2 | **Organisation & workspace onboarding** | Create a workspace (name, industry, size, plan) or join by company code; track join requests; organisation activation and ownership-claim links; first-run tour and a profile question | `/onboarding/workspace`, `/activate-account`, `/claim-ownership`, `/settings/workspace/join-requests` | `pages/WorkspaceOnboarding.tsx`, `components/orgActivation/OrgInvitationFlow.tsx`, `OnboardingTour.tsx`, `OnboardingFlowController.tsx`, `OnboardingProfileModal.tsx` | `/companies`, `/company/join/*`, `/auth/org-activation/*`, `/profile/onboarding*` | **Implemented** | P1 (join/create), P2 (org activation) |
| 3 | **Dashboard & overview** | Role-based home: stat cards (total/my tasks, completion rate, in progress, overdue), team overview, pending verifications, quick actions, embedded task list and board | `/dashboard` (+3 aliases) | `pages/DashboardExecutive.tsx`, `DashboardManager.tsx`, `DashboardRoleRouter.tsx`, `hooks/useCoreQueries.ts` | `/dashboard/executive`, `/tasks/my/summary`, `/tasks`, `/team/*` | **Implemented.** The executive view uses server aggregates. The manager view computes its stats in the browser from one page of `api.getTasks()` (`DashboardManager.tsx:105`), so it can under-count | P1 |
| 4 | **Team & employee management** | Teams (create, edit, members, lead, team chat, team task workspace), people directory, member profile, workspace member administration (verify, reject, role, remove, restore) | `/teams/*`, `/team-directory`, `/team-member/:id`, `/team-management`, `/team_members` | `pages/Teams.tsx`, `TeamDirectory.tsx`, `TeamMemberProfile.tsx`, `TeamManagement.tsx`, `components/teams/` | `/team/*` | **Implemented.** `/team_members` is a legacy duplicate of the directory | P2 / P3 |
| 5 | **Project management** | Project list with custom columns, create/edit/delete, project detail with overview, members, settings, tasks (table or kanban), checklists; portfolio and health views; templates | `/projects`, `/projects/:id`, `/projects/portfolio`, `/project-health`, `/templates` | `pages/Projects.tsx`, `ProjectDetails.tsx`, `ProjectPortfolio.tsx`, `ProjectHealth.tsx`, `Templates.tsx`, `components/projects/` | `/projects/*`, `/project-health`, `/templates/*` | **Implemented** | P1 (list, detail), P2, P3 |
| 6 | **Task management & review workflow** | Create/edit/delete tasks with multiple assignees, priority, deadline, category, custom fields; subtasks; dependencies; recurrence; watchers; status change; "Submit for Executive Review" then "Approve and Complete" or "Reopen" | `/tasks/all`, `/tasks/my`, `/board`, `/task-details/:id`, `/tasks/workbench` | `pages/AllTasks.tsx`, `Board.tsx`, `TaskDetails.tsx`, `components/CreateTaskDialog.tsx`, `components/tasks/` | `/tasks/*` | **Implemented.** There is no separate "return for rework" action; sending back is a plain status change (§7.4). The inline status dropdown for non-privileged users calls a route that does not exist (§1.3 item 5) | P1 |
| 7 | **Collaboration: comments, chat, attachments** | Per-task chat over WebSocket with HTTP fallback, optimistic send with acknowledgement and de-duplication (`clientMessageId`), replies, mentions, file attachments, connected-storage attachments, activity timeline, watchers | inside `/task-details/:id` and `/teams/*` | `pages/TaskDetails.tsx`, `hooks/useTaskComments.ts`, `lib/websocket.ts`, `lib/commentDelivery.ts` | `/task-comments/*`, `/task-attachments/*`, `/tasks/:id/attachments/*`, WebSocket | **Implemented** | P1 |
| 8 | **Calendar & scheduling** | Month/week/day calendar of **task deadlines** (not a general event calendar), scopes my/team/company, filters, create task from a slot | `/calendar` | `pages/Calendar.tsx`, `components/calendar/` | `/calendar/events` | **Implemented** | P2 |
| 9 | **Files & Admiino Drive** | Workspace and personal folders, upload, download, delete to Trash; Google Drive and Dropbox browsing and attaching; Office/PDF/image preview | `/drive`, `/trash` | `pages/Drive.tsx`, `GoogleDrivePage.tsx`, `Trash.tsx`, `components/connectedStorage/`, `lib/officePreview.ts` | `/drive/*`, `/google-drive/*`, `/connected-storage/*`, `/trash/*` | **Implemented** | P2 / P3 |
| 10 | **Sharing & client access** | Share a project or task with external clients by email or link; client comment replies; internal "Shared with me"; access-request approvals | `/shared-with-me`, `/resource-access`, `/client-view/:token`, `/external/*` | `pages/SharedWithMe.tsx`, `ResourceAccessRequests.tsx`, `ClientView.tsx`, `ExternalPortal.tsx`, `components/external/` | `/client-view/*`, `/external-shares/*`, `/external-portal/*` | **Implemented.** Client View and External Portal are public pages for people who are not app users | P2 (Shared with me), P3, X (public pages) |
| 11 | **Notifications** | Bell with unread count and live updates, full list, mark read / read all / delete, per-category preferences for in-app, email and WhatsApp | `/notifications`, bell dropdown, Settings > Notifications | `contexts/NotificationsContext.tsx`, `pages/Notifications.tsx`, `components/notifications/` | `/notifications/*`, `/notification-preferences` | **Implemented.** There is no push channel | P1 |
| 12 | **User profile & account settings** | Basic profile and photo; full professional profile (experience, education, skills, certifications, languages, projects, CV download); settings hub with theme, preferences, security, notifications | `/profile`, `/settings` | `pages/Profile.tsx`, `pages/Settings.tsx` | `/profile/*`, `/auth/me` | **Implemented** | P1 (basic), P3 (professional) |
| 13 | **Workspace & organisation settings** | Company profile and code, role-permission matrix, per-user overrides, governance policies, custom fields, automations, activity log, subscription and seats, data exports | `/company-profile`, `/settings/workspace/*`, `/audit-exports`, `/workspace-access` | `pages/CompanyProfile.tsx`, `WorkspaceGovernance.tsx`, `WorkspaceAutomations.tsx`, `WorkspaceCustomization.tsx`, `WorkspaceActivity.tsx`, `WorkspaceSubscription.tsx`, `AuditExport.tsx` | `/company/*`, `/workspace/*`, `/custom-fields/*`, `/automations/*`, `/audit-events`, `/exports/*` | **Implemented**, admin-oriented | P2 (overview + invite code), P3, X (governance, automations, custom fields, exports) |
| 14 | **Harmony** | Personality/compatibility assessment, personal report, team scoreboard, AI summaries | `/harmony` | `pages/Harmony.tsx`, `components/harmony/` | `/harmony/*` | **Implemented** | P3 |
| 15 | **AI Hub** | Heading "Admiino AI Hub: Coming Soon". All content is commented out | `/ai-hub` | `pages/AIHub.tsx` | none | **Placeholder-only.** Not in the sidebar | X |
| 16 | **Hire Talent** | Submit, track and cancel assistance requests with attachments; owners see their own requests | `/assistance-requests` | `pages/ExecutiveAssistanceRequests.tsx`, `components/AssistanceRequestDialog.tsx` | `/assistance/*` | **Implemented** | P3 |
| 17 | **Integrations & connected services** | Google (Calendar/Drive) connect and disconnect, WhatsApp account linking with preferences and quiet hours, Dropbox connection, MCP connections (behind `VITE_MCP_ENABLED`) | `/settings/integrations`, `/integrations`, `/whatsapp/connect`, `/mcp/authorize` | `pages/Integrations.tsx`, `WhatsAppConnect.tsx`, `McpAuthorization.tsx`, `components/integrations/` | `/integrations/*`, `/connected-storage/*`, `/oauth/user/*` | **Implemented.** Connect flows are browser redirects | P2 (view and WhatsApp status), X (MCP) |
| 18 | **Reporting & analytics** | Workspace insights (delivery metrics, history), workload by person and team, project health, project portfolio, time-tracking summary | `/workspace-insights`, `/workload`, `/project-health`, `/projects/portfolio`, `/time` | `pages/WorkspaceInsights.tsx`, `Workload.tsx`, `ProjectHealth.tsx`, `ProjectPortfolio.tsx`, `TimeTracking.tsx` | `/dashboard/insights*`, `/workload`, `/project-health`, `/time-tracking/*` | **Implemented**, tabular and desktop-oriented | P2 (time), P3 (rest) |
| 19 | **Time tracking** | Global running timer, manual entries, per-task and per-project summaries. Controlled by the `timeTrackingEnabled` governance flag | `/time`, timer in header, panel inside task details | `pages/TimeTracking.tsx`, `components/time/` | `/time-tracking/*` | **Implemented** | P2 |
| 20 | **Support & help** | Help page, floating support launcher with an AI answer assistant (text conversation through an ElevenLabs session) and support tickets | `/help`, launcher on every page | `pages/Help.tsx`, `components/support/` | `/support/*` | **Implemented** | P2 (tickets, help link), X (AI agent) |
| 21 | **Trash** | Restore or permanently delete workspaces, projects, tasks, folders and files | `/trash` | `pages/Trash.tsx` | `/trash/*` | **Implemented** | P3 |
| 22 | **Templates** | Task and project templates with versioning, preview and instantiate | `/templates` | `pages/Templates.tsx`, `components/templates/` | `/templates/*` | **Implemented** | P3 |

**Items found but not product features.** `pages/Dashboard.tsx`, `DashboardAdmin.tsx`, `DashboardTeamMember.tsx`, `Plans.tsx`, `Checkout.tsx`, `Index.tsx`, `TaskDetailsDebug.tsx`, `TeamTaskView.tsx`, `TeamSubtaskView.tsx`, `AdminAccountMessage.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx` and `VerifyEmail.tsx` are not imported by any non-test file. `DashboardAdmin` is the only one that calls an `/admin/*` API. The API client also carries 29 `/admin/*` methods that the user portal does not use. They should not be copied to mobile.

---
## 4. Web Screen and Route Inventory

### 4.1 Reading the tables

- **Route** is the real path in `src/App.tsx`. Where several routes render the same screen, they are listed in one row.
- **Source** paths are relative to `src/`.
- **Access** records what the code shows. "Signed in" means `ProtectedRoute` only. Every `allowedRoles` list in `App.tsx` checks the legacy platform role, which is `executive` for nearly every user (§7.2), so it filters almost no one. Real gating happens inside pages by workspace role or permission, and on the server.
- **Mobile** gives the mobile screen ID from §5, its screen type, and the priority (MVP = Phase 1, Phase 2, Phase 3 = "Later").
- **Status** is the implementation status of the web screen: **Verified** (source shows a working data path), **Partial** (works with a defect or gap, stated), **Placeholder**, or **Unverified**. None of these were run in a browser.

### 4.2 Screen inventory

#### Authentication and onboarding (17 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-A01 | Login | `/` (also renders for `/forgot-password`, `/reset-password/:token`, `/verify-email/:token`) | `pages/Login.tsx` | Email + password and Google sign-in; resend verification; routes the user to onboarding, a pending invite, a saved return path or the default landing page | Public | A01 Sign in | Full screen | MVP | **Partial**: the three recovery routes show the login form |
| W-A02 | Create account | `/signup` | `pages/Signup.tsx` | Name, email, password (min 8), consent checkbox, Turnstile, "check your email" state with resend, Google option | Public | A02 Create account | Full screen | MVP (depends on D-03) | Verified |
| W-A03 | Executive signup (legacy) | `/signup-executive` | `pages/SignupExecutive.tsx` | Role-specific signup from the older model | Public | None | n/a | Excluded | Verified |
| W-A04 | Team member signup (legacy) | `/signup-team_member` | `pages/SignupTeamMember.tsx` | As above | Public | None | n/a | Excluded | Verified |
| W-A05 | Manager signup (legacy) | `/signup-manager` | `pages/SignupManager.tsx` | As above | Public | None | n/a | Excluded | Verified |
| W-A06 | Executive join signup (legacy) | `/signup-executive-join` | `pages/SignupExecutiveJoin.tsx` | Sign up and join by company code | Public | None | n/a | Excluded | Verified |
| W-A07 | Workspace invitation | `/invite/:token`, `/signup-with-invite` | `pages/Invite.tsx` | Inspect the invite; accept when signed in, or sign up with the invite. Parks the token in `sessionStorage` while signed out | Public / signed in | A06 Workspace invitation | Deep-link landing | MVP | Verified |
| W-A08 | Organisation activation / ownership claim | `/activate-account#token=…`, `/claim-ownership#token=…` | `components/orgActivation/OrgInvitationFlow.tsx` (via `pages/ActivateAccount.tsx`, `ClaimOwnership.tsx`) | New employee sets name and password; existing user accepts; owner-designate claims ownership. The secret is in the URL fragment | Public (secret) | A07 Organisation activation | Deep-link landing | Phase 2 | Verified |
| W-A09 | Verify email | `/verify-email/setup#token=…` | `pages/VerifyEmailSetup.tsx` | Confirms the address. Auto-confirms with a stored signup proof on the same browser, otherwise asks the user to confirm the password they chose or set a new one | Public (secret) | A03 Verify email | Deep-link landing | MVP | Verified |
| W-A10 | Google callback | `/auth/google/callback`, `/integrations/google/callback` | `pages/AuthGoogleCallback.tsx` | Reads `?token=` from the URL, signs in, returns to the app or the integration page | Public | None (native auth session) | n/a | Excluded | Verified |
| W-A11 | Workspace setup | `/onboarding/workspace` | `pages/WorkspaceOnboarding.tsx` | Tabs: create a workspace (name, industry, size, plan) or request to join by company code; list own join requests | Signed in | A08 Workspace setup | Full screen | MVP | Verified |
| W-A12 | Project invitation | `/project-invite/:token` | `pages/ProjectInvite.tsx` | Accept or reject a project invite | Signed in | A11 Project invitation | Deep-link landing | Phase 2 | Verified |
| W-A13 | WhatsApp connect | `/whatsapp/connect` | `pages/WhatsAppConnect.tsx` | Confirm linking a WhatsApp number, from a link sent by the assistant | Public / signed in | None (opens web) | n/a | Excluded | Verified |
| W-A14 | MCP authorise | `/mcp/authorize` | `pages/McpAuthorization.tsx` | Approve an AI-client connection to the workspace | Signed in | None | n/a | Excluded | Verified |
| W-A15 | Unauthorised | `/unauthorized` | `pages/Unauthorized.tsx` | Access-denied page | Any | A12 Access denied / not found / error | Full screen | MVP | Verified |
| W-A16 | Not found | `*` | `pages/NotFound.tsx` | 404 page | Any | A12 (merged) | Full screen | MVP | Verified |
| W-A17 | Workspace suspended | Not a route. `ProtectedRoute` renders it after an HTTP 423 | `pages/WorkspaceSuspended.tsx` | Blocking recovery screen: support reference, switch workspace, sign out | Signed in | A09 Workspace suspended | Full screen (blocking) | MVP | Verified |

*Unreachable intended screens (not counted):* `ForgotPassword.tsx`, `ResetPassword.tsx`, `VerifyEmail.tsx` (see §1.3 item 3). Mobile screens A04 and A05 are modelled on the first two.

*Overlays in this area:* `OnboardingTour` (multi-step welcome dialog, executive wording, mentions AI Hub "Coming soon"), `OnboardingProfileModal` (asks gender when `needsGender` is true), `MaintenanceBanner`.

#### Dashboard (3 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-D01 | Dashboard (owner / admin / member) | `/dashboard`, `/dashboard-executive`, `/dashboard-team_member` | `pages/DashboardExecutive.tsx` | Greeting, stat cards (my or total tasks, completion rate, in progress, overdue), team overview, quick actions, pending verifications, task table with filters, embedded board | Signed in. Content varies by workspace role and `create_tasks` / `view_all_tasks` | H01 Home | Tab root | MVP | Verified. Uses server aggregates (`/tasks/my/summary`, `/dashboard/executive`) |
| W-D02 | Dashboard (manager) | `/dashboard` when the workspace role is `manager`; `/dashboard-manager` | `pages/DashboardManager.tsx` | Team overview and task overview | Manager | H01 (merged) | Tab root | MVP | **Partial**: task stats are computed in the browser from one page of `api.getTasks()` |
| W-D03 | Workspace insights | `/workspace-insights` | `pages/WorkspaceInsights.tsx` | Delivery metrics, history, filters by project and team | Signed in. Which roles the server allows is Unverified | H02 Workspace insights | Stack push | Phase 3 | Verified |

#### Tasks (3 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-T01 | All / My tasks | `/tasks/all`, `/tasks/my` | `pages/AllTasks.tsx` | Paged, filterable list; My / All toggle (All needs `view_all_tasks`); status pills; custom-field columns and filters; edit drawer | Signed in | T01 Tasks | Tab root | MVP | Verified |
| W-T02 | Board | `/board` (also embedded in both dashboards) | `pages/Board.tsx` | Status columns; move a task by changing status | Signed in | T01 view mode "Board" | Segment inside T01 | Phase 2 | Verified |
| W-T03 | Task details / workbench | `/task-details/:id`. `/tasks/:id` redirects here. `/tasks/workbench` opens the first task | `pages/TaskDetails.tsx` (2,678 lines) | Status, assignees, deadline, subtasks, attachments, chat, activity, time, edit, team-execution panel with review actions, external sharing, save as template, watchers, dependencies, recurrence, custom fields | Signed in. Editing follows `task.access` from the server | T02 Task detail, T03 Task conversation, T05 Edit task | Stack push | MVP | **Partial**: attachment preview route and inline status route do not exist on the backend |

#### Projects (5 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-P01 | Projects | `/projects` | `pages/Projects.tsx` | Project list with progress and custom columns; create; new from template; delete | Signed in. Create needs `create_projects`. List scope follows `view_all_projects` | P01 Projects | Tab root | MVP | Verified |
| W-P02 | Project portfolio | `/projects/portfolio` | `pages/ProjectPortfolio.tsx` | Cross-project summary | Signed in | P06 Portfolio and health | Stack push | Phase 3 | Verified |
| W-P03 | Project details | `/projects/:id` | `pages/ProjectDetails.tsx` (2,343 lines) | Collapsible panels: overview, members, settings, tasks (table or kanban), checklists, files. Invitations and access requests | Project members. Management by role | P02 Project detail, P03 Create/edit project, P04 Members, P05 Checklist | Stack push | MVP (P02) | Verified |
| W-P04 | Project health | `/project-health` | `pages/ProjectHealth.tsx` | Per-project health and risk | Owner / admin / manager (per search config) | P06 (merged) | Stack push | Phase 3 | Verified |
| W-P05 | Templates | `/templates` | `pages/Templates.tsx` | Browse, archive, restore, use templates | Signed in | P07 Templates | Stack push | Phase 3 | Verified |

#### Teams and people (9 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-M01 | Teams | `/teams/*`. Also matched inside the page: `/teams/:teamId/tasks/:taskId` and `/teams/:teamId/tasks/:taskId/subtasks/:subtaskId`; query `?team=&tab=` | `pages/Teams.tsx` (1,446 lines) | Team list. Detail tabs Overview, Tasks, Chat, Activity, Team settings. Team tasks and subtask pane. Member and lead dialogs | Needs `view_workspace_members` to appear in navigation. Management by `canManage` | M01 Teams, M02 Team detail, M03 Team management, T06 Subtask | Stack push | Phase 2 | Verified |
| W-M02 | Team directory | `/team-directory` | `pages/TeamDirectory.tsx` | Search and filter members | `view_workspace_members`; otherwise "Access Restricted" | M04 People | Stack push | Phase 2 | Verified |
| W-M03 | Team member profile | `/team-member/:id` | `pages/TeamMemberProfile.tsx` | Member profile and status; remove or restore | Owner / admin / manager | M05 Member profile | Stack push | Phase 2 | Verified |
| W-M04 | Workspace members | `/team-management` | `pages/TeamManagement.tsx` | Approve or reject, change role, remove, restore | Owner / admin actions | M07 Workspace members (admin) and M06 Approvals | Stack push | Phase 3 | Verified |
| W-M05 | Workspace access requests | `/workspace-access` | `pages/WorkspaceAccessRequests.tsx` | Members request permissions; owner/admin decide | All roles; deciding is owner/admin | M06 Approvals | Stack push | Phase 2 | Verified |
| W-M06 | Join requests | `/settings/workspace/join-requests` | `pages/WorkspaceJoinRequests.tsx` | Approve or deny requests to join; opened from a notification | Owner / admin | M06 (merged) | Stack push | Phase 2 | Verified |
| W-M07 | Hire Talent | `/assistance-requests` | `pages/ExecutiveAssistanceRequests.tsx` | Submit, track and cancel assistance requests with attachments | Owner / admin / manager | M08 Hire Talent | Stack push | Phase 3 | Verified |
| W-M08 | Team members (legacy) | `/team_members` | `pages/TeamMembers.tsx` | Duplicate of the directory. Linked only from unreachable pages | Signed in | None | n/a | Excluded | Verified |
| W-M09 | Workload | `/workload` | `pages/Workload.tsx` | Work distribution by person and team | Managers with workload access and Team Leads (page text) | M09 Workload | Stack push | Phase 3 | Verified |

#### Calendar (1 screen)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-C01 | Calendar | `/calendar` | `pages/Calendar.tsx`, `components/calendar/` | Month, week and day views of task deadlines. Scope my / team / company. Filters. Create a task from a slot | Signed in | C01 Calendar | Stack push (view of Tasks) | Phase 2 | Verified. Events are tasks, keyed by `taskId` (`lib/calendarStatus.ts`) |

#### Files and sharing (7 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-F01 | Drive | `/drive` | `pages/Drive.tsx`, `GoogleDrivePage.tsx`, `components/connectedStorage/` | Workspace and personal folders; upload (workspace needs `upload_workspace_files`); download; delete to Trash; Google Drive and Dropbox browsing | Signed in | F01 Drive, F02 Folder, F06 Storage browser | Stack push | Phase 2 | Verified |
| W-F02 | Trash | `/trash` | `pages/Trash.tsx` | Restore or permanently delete workspaces, projects, tasks, folders, files | Owner / admin | F07 Trash | Stack push | Phase 3 | Verified |
| W-F03 | Shared with me | `/shared-with-me` | `pages/SharedWithMe.tsx` | Resources shared with the user | Signed in | F04 Shared with me | Stack push | Phase 2 | Verified |
| W-F04 | Shared resource | `/shared-with-me/:resourceType/:resourceId` | `pages/SharedWithMe.tsx` | View a shared project or task; comment or update status by access level | Granted users | F05 Shared resource | Stack push | Phase 2 | Verified |
| W-F05 | Client view | `/client-view/:token` | `pages/ClientView.tsx` | Public read-only link; request access | Public | None | n/a | Excluded | Verified |
| W-F06 | External portal | `/external/project/:ref`, `/external/task/:ref` | `pages/ExternalPortal.tsx` | Portal for external clients | External (secret) | None | n/a | Excluded | Verified |
| W-F07 | Client access requests | `/resource-access` | `pages/ResourceAccessRequests.tsx` | Approve, change level, revoke client access | Owner / admin (manager shown in page) | F08 Client access | Stack push | Phase 3 | Verified |

#### Notifications (1 screen)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-N01 | Notifications | `/notifications` and the bell dropdown | `pages/Notifications.tsx`, `contexts/NotificationsContext.tsx` | List, unread filter, mark read, mark all read, delete, open the linked item | Signed in | N01 Inbox | Tab root | MVP | Verified |

#### Profile and settings (10 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-S01 | Profile | `/profile` | `pages/Profile.tsx` | Basic details and photo; professional profile (work experience, education, skills, certifications, languages, projects); CV download | Signed in | S02 My profile, S03 Professional profile | Stack push | MVP (S02), Phase 3 (S03) | Verified |
| W-S02 | Settings | `/settings` | `pages/Settings.tsx` | Ten sections: Profile, Account, Appearance, Notifications, Preferences, Workspace and operations, Team administration, Integrations, Audit and exports, About | Signed in. Sections vary by role | S04 Settings, N02 Notification settings, S01 More | Stack push | MVP | Verified |
| W-S03 | Workspace settings | `/company-profile` | `pages/CompanyProfile.tsx` | Company details, company code, plan and billing summary, role permissions, workspace permissions | View: signed in. Edit: owner / admin | S05 Workspace overview | Stack push | Phase 2 | Verified |
| W-S04 | Integrations | `/settings/integrations`, `/integrations` | `pages/Integrations.tsx` | Google, WhatsApp (link, preferences, quiet hours), Dropbox, MCP (behind `VITE_MCP_ENABLED`) | Signed in. Governance policy may restrict management | S06 Integrations | Stack push | Phase 2 | Verified |
| W-S05 | Customisation | `/settings/workspace/customization` | `pages/WorkspaceCustomization.tsx`, `components/customFields/` | Manage custom fields and options | Owner / admin | None (web only). Mobile still displays custom-field values | n/a | Excluded | Verified |
| W-S06 | Activity log | `/settings/workspace/activity` | `pages/WorkspaceActivity.tsx` | Organisation audit events | Owner / admin | S07 Activity log | Stack push | Phase 3 | Verified |
| W-S07 | Automations | `/settings/workspace/automations` | `pages/WorkspaceAutomations.tsx` | Rule builder and execution history | Owner / admin; needs `automationsEnabled` | None | n/a | Excluded | Verified |
| W-S08 | Governance | `/settings/workspace/governance` | `pages/WorkspaceGovernance.tsx` | Policies and feature switches | Owner / admin | None | n/a | Excluded | Verified |
| W-S09 | Subscription and seats | `/settings/workspace/subscription` | `pages/WorkspaceSubscription.tsx` | Read-only plan, seat usage, billing records | Owner / admin | S08 Subscription | Stack push | Phase 3 | Verified |
| W-S10 | Audit exports | `/audit-exports` | `pages/AuditExport.tsx` | Download workspace workbook (XLSX) or archive (ZIP) | Owner / admin | None | n/a | Excluded | Verified |

#### Time, Harmony, AI and Help (4 screens)

| ID | Web screen | Route(s) | Source | Function | Access | Mobile equivalent | Type | Priority | Status |
|---|---|---|---|---|---|---|---|---|---|
| W-TM01 | Time tracking | `/time`, header timer, task panel | `pages/TimeTracking.tsx`, `components/time/` | Summary and entries; running timer; manual entry | Needs `timeTrackingEnabled`. Task panel limited to owner / admin / manager / member | TM01 Time | Stack push | Phase 2 | Verified |
| W-H01 | Harmony | `/harmony` | `pages/Harmony.tsx` (823 lines) | Intro, assessment, generating, personal report, team scoreboard, AI summaries | Signed in. Generating team summaries: owner / admin / manager (page text) | HM01 Harmony | Stack push | Phase 3 | Verified |
| W-H02 | AI Hub | `/ai-hub` | `pages/AIHub.tsx` | Heading "Coming Soon". The body is commented out. Not in the sidebar | Signed in | None | n/a | Excluded | **Placeholder-only** |
| W-X01 | Help | `/help` | `pages/Help.tsx` | Support email, legal links. The floating support launcher (AI help and tickets) is on every layout page | Public | S09 Help and support | Stack push | Phase 2 | Verified |

### 4.3 How the counts were produced

| Count | Value | Method |
|---|---|---|
| Route entries | 72 | Every `<Route path=…>` in `App.tsx`. 71 patterns plus `*` |
| Nested URL patterns | 2 | `useMatch` patterns inside `pages/Teams.tsx:122-123` |
| Distinct route components | 62 | Unique component names in route elements |
| Distinct web screens | **60** | 62 route components, minus `ClaimOwnership` (same component as `ActivateAccount`), minus `DashboardRoleRouter` (a router, not a view), minus `TaskDetailsRedirect` and `TaskWorkbench` (redirectors), plus `WorkspaceSuspended` (an interstitial with no route), plus the shared-resource detail view of `SharedWithMe` (same component, different view) |
| Routes that re-use a component already used by another route | 10 | 72 routes minus 62 distinct components. `Login` serves 3 extra routes (`/forgot-password`, `/reset-password/:token`, `/verify-email/:token`). One extra route each for `AllTasks` (`/tasks/my`), `AuthGoogleCallback` (`/integrations/google/callback`), `DashboardExecutive` (`/dashboard-team_member`), `ExternalPortal` (`/external/task/:ref`), `Integrations` (`/integrations`), `Invite` (`/signup-with-invite`) and `SharedWithMe` (detail route) |

Web screens by module: Auth and onboarding 17 · Dashboard 3 · Tasks 3 · Projects 5 · Teams and people 9 · Calendar 1 · Files and sharing 7 · Notifications 1 · Profile and settings 10 · Time 1 · Harmony and AI 2 · Help 1 = **60**.

### 4.4 Web pages that cannot be reached

Thirteen files in `src/pages/` are imported by no non-test file: `AdminAccountMessage`, `Checkout`, `Dashboard`, `DashboardAdmin`, `DashboardTeamMember`, `ForgotPassword`, `Index`, `Plans`, `ResetPassword`, `TaskDetailsDebug`, `TeamSubtaskView`, `TeamTaskView`, `VerifyEmail`. They are not counted as screens. Of these, `ForgotPassword`, `ResetPassword` and `VerifyEmail` look like intended screens that lost their routes. The rest look like leftovers.

### 4.5 Modal and dialog workflows (not screens)

These are reusable components, not routes. On mobile most become sheets or full-screen forms inside the screens above.

| Web component | Used from | Mobile treatment |
|---|---|---|
| `CreateTaskDialog` (title, description, attachments, category, priority, deadline, assignees) | Tasks, Dashboard, Calendar, Project detail | Full-screen form T04 |
| `TaskEditDrawer` and the task Edit tab | Task list, Task detail | Full-screen form T05 |
| `CreateWorkspaceDialog`, `InviteUserDialog` | Workspace switcher, Team management | Sheet (create), P2 (invite) |
| `ExternalShareDialog`, `ClientViewShareButton` | Task and project detail | Web only |
| `SaveAsTemplateDialog`, `TemplateEditorDialog`, `UseTemplateDialog` | Task detail, Templates | Phase 3 |
| `ManualTimeEntryDialog`, `GlobalTimerIndicator` | Header, task panel | Sheet and floating timer chip (Phase 2) |
| `ConnectedStoragePickerDialog`, `GoogleDrivePickerDialog`, `AttachmentSourcePicker` | Attachments | Attachment source sheet: camera, photos, files (MVP). Storage pickers: Phase 3 |
| `WorkspaceSwitcher` | Sidebar / header | Bottom sheet |
| `GlobalSearch` | Header | Full-screen search H03 |
| `SupportLauncher` | Every layout page | Link to help and tickets (Phase 2). The AI voice/text agent stays web |
| `AssistanceRequestDialog` | Hire Talent | Phase 3 |
| `SignOutDialog` | Account menu | Confirm dialog |

---

## 5. Proposed Mobile Screen Inventory

### 5.1 Definition

A **mobile screen** is a route-level destination in the app (one Expo Router file): a tab root, a pushed screen, or a full-screen modal route. **Bottom sheets, pickers, confirmation dialogs and action menus are overlays**, listed in §5.4 and not counted.

Priority: **MVP** = Phase 1, **Phase 2** = functional expansion, **Phase 3** = advanced ("Later").

### 5.2 Mobile screen list (59 screens)

#### Authentication and onboarding (12)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| A01 | Sign in | W-A01 | Email + password, "Continue with Google", links to Create account and Forgot password | Full screen | MVP | `POST /auth/login`, `GET /auth/me`, `GET /me/workspaces` |
| A02 | Create account | W-A02 | Recommended (D-03 option b): a short screen that explains the next step and opens the web signup in an in-app browser, then returns to A03 through a link. If D-03 chooses a native form instead: name, email, password, consent and the security check | Full screen | MVP | `POST /auth/signup` (native form only) |
| A03 | Verify email | W-A09 + W-A02 success state | "Check your inbox", resend with cooldown, and the deep-link landing that confirms the address | Full screen, deep link | MVP | `POST /auth/resend-verification`, `POST /auth/verify-email/inspect`, `.../complete` |
| A04 | Forgot password | `ForgotPassword.tsx` (unreachable on web) | Request a reset email | Full screen | MVP | `POST /auth/forgot-password` |
| A05 | Reset password | `ResetPassword.tsx` (unreachable on web) | Set a new password from the emailed link | Full screen, deep link | MVP | `POST /auth/reset-password/:token` |
| A06 | Workspace invitation | W-A07 | Show the invite (workspace, role); accept, or sign up with it | Full screen, deep link | MVP | `GET /invites/:token`, `POST /invites/:token/accept`, `POST /auth/signup-with-invite` |
| A07 | Organisation activation | W-A08 | Employee activation, existing-account acceptance, ownership claim | Full screen, deep link | Phase 2 | `/auth/org-activation/*` |
| A08 | Workspace setup | W-A11 | Join by code (resolve, then request), track join requests, create a workspace | Full screen | MVP | `POST /company/join/resolve`, `POST /company/join/requests`, `GET /companies/join/requests/mine`, `POST /companies` |
| A09 | Workspace suspended | W-A17 | Blocking recovery: support reference, switch workspace, sign out | Full screen | MVP | `GET /workspaces/suspended` |
| A10 | Notification permission primer | New (mobile only) | Explains why notifications matter before the system prompt | Full-screen modal | MVP | Device token endpoint (B-02) |
| A11 | Project invitation | W-A12 | Accept or reject a project invite | Full screen, deep link | Phase 2 | `POST /projects/invites/:token/accept` or `/reject` |
| A12 | Access denied / not found / error | W-A15, W-A16 | Shared state screen with retry and "go home" | Full screen | MVP | none |

#### Home (3)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| H01 | Home | W-D01, W-D02 | Role-adaptive overview (§10.2) | Tab root | MVP | `GET /tasks/my/summary`, `GET /tasks?scope=assigned_workspace`, `GET /dashboard/executive`, `GET /access-requests/me/effective-permissions` |
| H02 | Workspace insights | W-D03 | Read-only delivery metrics for owners and managers | Stack push | Phase 3 | `GET /dashboard/insights*` |
| H03 | Search | Header `GlobalSearch` | Full-screen search across tasks, projects and people, with recent searches | Full-screen modal | MVP | `GET /global-search` |

#### Tasks (6)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| T01 | Tasks | W-T01, W-T02 | Segments Mine · Created · All (All only with `view_all_tasks`). Filter chips. Phase 2 adds List / Board / Calendar view switch | Tab root | MVP (board and calendar views Phase 2) | `GET /tasks`, `GET /tasks/my/summary` |
| T02 | Task detail | W-T03 | Title, status, priority, deadline, assignees, project and team, subtasks, attachments, activity, review actions | Stack push | MVP | `GET /tasks/:id`, `PATCH /tasks/:id`, `GET /tasks/:id/activity`, subtask endpoints |
| T03 | Task conversation | W-T03 chat tab | Full-screen thread with composer, attachments, replies, mentions, delivery state | Stack push | MVP | `GET/POST /task-comments/task/:id/comments`, WebSocket |
| T04 | Create task | `CreateTaskDialog` | Quick-add form with progressive fields | Full-screen modal | MVP | `POST /tasks`, `POST /projects/:id/tasks`, `GET /team/team_members` |
| T05 | Edit task | `TaskEditDrawer`, Edit tab | Edit title, description, priority, deadline, assignees, category | Full-screen modal | MVP | `PATCH /tasks/:id` |
| T06 | Subtask detail | Teams subtask pane | Notes, files and activity for a team subtask | Stack push | Phase 2 | `PATCH /tasks/:id/subtasks/:sid` |

#### Projects (7)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| P01 | Projects | W-P01 | Project cards with progress and status; search | Tab root | MVP | `GET /projects` |
| P02 | Project detail | W-P03 | Segments Overview · Tasks · Members · Files. Add task with the project prefilled | Stack push | MVP | `GET /projects/:id`, `/tasks`, `/members` |
| P03 | Create / edit project | W-P01, W-P03 | Name, description, dates, team | Full-screen modal | Phase 2 | `POST /projects`, `PATCH /projects/:id` |
| P04 | Project members | W-P03 | List, add, change role, invite by email | Stack push | Phase 2 | `/projects/:id/members*` |
| P05 | Project checklist | W-P03 | Checklists and items | Stack push | Phase 2 | `/projects/:id/checklists*` |
| P06 | Portfolio and health | W-P02, W-P04 | Cards, not tables | Stack push | Phase 3 | `GET /project-health*` |
| P07 | Templates | W-P05 | Browse and use | Stack push | Phase 3 | `/templates*` |

#### Teams and people (9)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| M01 | Teams | W-M01 | List of the user's teams | Stack push | Phase 2 | `GET /team/teams` |
| M02 | Team detail | W-M01 | Segments Overview · Tasks · Chat · Activity | Stack push | Phase 2 | `GET /team/teams/:id/workspace`, `POST .../messages` |
| M03 | Team management | W-M01 | Create, edit, members, lead | Full-screen modal | Phase 3 | `/team/teams*` |
| M04 | People | W-M02 | Directory with search | Stack push | Phase 2 | `GET /team/members` |
| M05 | Member profile | W-M03 | Contact and role, assigned work | Stack push | Phase 2 | `GET /team/members/:userId`, `GET /profile/users/:id` |
| M06 | Approvals | W-M04, W-M05, W-M06 | One queue for pending verifications, join requests and permission requests (owner / admin) | Stack push | Phase 2 | `/team/pending-verifications`, `/companies/join/requests`, `/access-requests` |
| M07 | Workspace members (admin) | W-M04 | Change role, remove, restore | Stack push | Phase 3 | `/team/members/:id/role`, `/team/remove`, `/team/restore` |
| M08 | Hire Talent | W-M07 | Submit and track requests | Stack push | Phase 3 | `/assistance/*` |
| M09 | Workload | W-M09 | Per-person workload cards | Stack push | Phase 3 | `GET /workload` |

#### Calendar (1)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| C01 | Calendar | W-C01 | Month strip plus agenda list. Reached from the Tasks view switch and from Home | Stack push | Phase 2 | `GET /calendar/events` |

#### Files (8)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| F01 | Drive | W-F01 | Workspace and personal folder lists | Stack push | Phase 2 | `GET /drive/folders`, `/drive/personal/folders` |
| F02 | Folder | W-F01 | Files in a folder, upload, download | Stack push | Phase 2 | `/drive/folders/:id/files` |
| F03 | File viewer | `FileViewer`, `AttachmentPreview` | Images, PDF and text inline. Office files: download and "Open in…" | Full-screen modal | MVP | `GET /tasks/:id/attachments/:aid/download`, `/drive/files/:id/download` |
| F04 | Shared with me | W-F03 | List | Stack push | Phase 2 | `GET /client-view/shared-with-me` |
| F05 | Shared resource | W-F04 | View, comment, update status by access level | Stack push | Phase 2 | `/client-view/shared/:type/:id*` |
| F06 | Storage browser | `ConnectedStoragePickerDialog` | Browse Dropbox / Google items to attach | Full-screen modal | Phase 3 | `/connected-storage/*` |
| F07 | Trash | W-F02 | Restore and delete (owner / admin) | Stack push | Phase 3 | `/trash*` |
| F08 | Client access | W-F07 | Approve, change level, revoke | Stack push | Phase 3 | `/client-view/resource-access-requests*` |

#### Notifications (2)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| N01 | Inbox | W-N01 | Grouped list (Today / Earlier), unread filter, swipe to mark read or delete, tap to open the target | Tab root | MVP | `GET /notifications`, `PATCH .../read`, `PATCH .../read-all` |
| N02 | Notification settings | Settings > Notifications | Per category: in-app, email, WhatsApp, plus new push switch | Stack push | MVP | `GET/PATCH /notification-preferences` (push needs B-02) |

#### Profile and settings (9)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| S01 | More | New (hub) | Menu: Teams, Calendar, Drive, Time, Approvals, Workspace, Integrations, Help, Settings, Sign out. Entries filtered by permission | Tab root | MVP | permissions endpoint |
| S02 | My profile | W-S01 | Name, photo, contact, role in the workspace | Stack push | MVP | `PATCH /profile/update`, `POST /profile/upload-picture` |
| S03 | Professional profile | W-S01 | Experience, education, skills, certifications, CV | Stack push | Phase 3 | `/profile/me/*` |
| S04 | Settings | W-S02 | Account, appearance (light, dark, system), default landing tab, biometric lock, about and legal, sign out | Stack push | MVP | `GET /auth/me` |
| S05 | Workspace overview | W-S03 | Name, logo, company code to share, role summary. Permission editing stays web | Stack push | Phase 2 | `GET/PATCH /companies/active`, `/company/:id/settings` |
| S06 | Integrations | W-S04 | Status of Google, WhatsApp and Dropbox. WhatsApp quiet hours. Connect flows open the browser | Stack push | Phase 2 | `/integrations/*` |
| S07 | Activity log | W-S06 | Read-only audit events | Stack push | Phase 3 | `GET /audit-events` |
| S08 | Subscription | W-S09 | Read-only plan and seats | Stack push | Phase 3 | `GET /workspace/commercial` |
| S09 | Help and support | W-X01 | Help links, support tickets, legal | Stack push | Phase 2 | `/support/*` |

#### Time (1) and Harmony (1)

| ID | Screen | Web source | Purpose | Type | Priority | Key APIs |
|---|---|---|---|---|---|---|
| TM01 | Time tracking | W-TM01 | My entries, summary, start or stop timer | Stack push | Phase 2 | `/time-tracking/*` |
| HM01 | Harmony | W-H01 | Assessment as a stepper, personal report, scoreboard | Stack push | Phase 3 | `/harmony/*` |

### 5.3 Why the mobile count is close to the web count

The two numbers measure different things, so the similarity is not a sign that nothing was simplified.

- 15 web screens are dropped and 5 more are merged into other screens (§5.5). Two unreachable web pages (forgot and reset password) are re-created as mobile screens.
- Multi-purpose web pages are split into stack screens (Task details becomes T02, T03, T05; Teams becomes M01, M02, M03, T06; Drive becomes F01, F02).
- Web dialogs that are too big for a sheet become full-screen forms (T04, T05, P03).
- Mobile adds four screens the web does not have as screens: More (S01), Search (H03), Notification primer (A10) and Task conversation (T03).
- Only **25** of the 59 are in the first release.

### 5.4 Overlays (counted separately, not screens)

| Overlay | Used by |
|---|---|
| Workspace switcher (bottom sheet) | Home header, More |
| Filter sheet, sort sheet | Tasks, Projects, Inbox |
| Status picker, priority picker | Task detail, Task list quick actions |
| Assignee multi-select (searchable) | Create task, Edit task |
| Date and time picker | Create task, Edit task |
| Attachment source sheet (camera, photos, files) | Task conversation, Create task |
| Review decision sheet ("Approve" / "Send back" with optional note) | Task detail |
| Comment actions (reply, edit, delete) | Task conversation |
| Task quick actions (long press: change status, assign, copy link) | Task list |
| Confirm dialogs (delete, sign out, leave workspace) | Many |
| Timer chip and time-entry sheet | Task detail, Time |
| Permission explainers (camera, photos, notifications) | System-permission flows |
| Maintenance banner | App shell |
| Empty, error and offline banners | All lists |

About 14 overlay types. They are shared components and should be built once.

### 5.5 Web screens not carried to mobile

| Web screen | Reason |
|---|---|
| W-A03, W-A04, W-A05, W-A06 legacy signups | Superseded by `/signup` and invitations |
| W-A10 Google callback | Replaced by a native auth session (decision D-04) |
| W-A13 WhatsApp connect, W-A14 MCP authorise | Opened from outside the app. Hand off to the browser |
| W-M08 Team members (legacy) | Duplicate of the directory |
| W-F05 Client view, W-F06 External portal | Public web pages for people who do not have the app |
| W-S05 Customisation, W-S07 Automations, W-S08 Governance, W-S10 Audit exports | Dense, desktop-style admin configuration and file exports |
| W-H02 AI Hub | Placeholder with no content |

**Merged into other mobile screens:** W-D02 into H01, W-T02 into T01 (view mode), W-P04 into P06, W-M06 into M06, W-A16 into A12.

**Needed even though management is web-only.** Custom-field values appear on tasks and projects. Mobile should display them read-only in Phase 2 (`GET /tasks/:id/custom-fields`) and edit them later.

---

## 6. Screen Counts by Module and Release Phase

### 6.1 Web versus mobile by module

| Module | Web routes | Web screens | Mobile screens | MVP | Phase 2 | Phase 3 |
|---|---|---|---|---|---|---|
| Authentication and onboarding | 22 | 17 | 12 | 10 | 2 | 0 |
| Home / dashboard | 5 | 3 | 3 | 2 | 0 | 1 |
| Tasks | 6 | 3 | 6 | 5 | 1 | 0 |
| Projects | 5 | 5 | 7 | 2 | 3 | 2 |
| Teams and people | 9 | 9 | 9 | 0 | 5 | 4 |
| Calendar | 1 | 1 | 1 | 0 | 1 | 0 |
| Files and sharing | 8 | 7 | 8 | 1 | 4 | 3 |
| Notifications | 1 | 1 | 2 | 2 | 0 | 0 |
| Profile and settings | 11 | 10 | 9 | 3 | 3 | 3 |
| Time tracking | 1 | 1 | 1 | 0 | 1 | 0 |
| Harmony and AI | 2 | 2 | 1 | 0 | 0 | 1 |
| Help | 1 | 1 | in Settings (S09) | – | – | – |
| **Total** | **72** | **60** | **59** | **25** | **20** | **14** |

The web-route column assigns each of the 72 routes to the module of the screen it renders (for example the Auth row holds the 19 public auth routes, `/onboarding/workspace`, `/unauthorized` and `*`). Nested Teams patterns are not included. The columns sum to 72, 60 and 59, and the mobile phase columns sum to 25, 20 and 14. Help's mobile screen is S09 and is counted under Profile and settings, so the mobile column adds up without a Help row.

### 6.2 Summary

| Question | Answer |
|---|---|
| Total web routes | 72 (plus 2 nested Teams patterns) |
| Total distinct web screens | 60 |
| Total proposed mobile screens | 59 |
| Mobile onboarding / authentication screens | 12 (MVP 10, Phase 2 2) |
| MVP screens | 25 (10 auth/onboarding + 15 core) |
| Phase 2 screens | 20 |
| Phase 3 ("Later") screens | 14 |
| Web screens excluded | 15 |
| Web screens merged into another mobile screen | 5 |
| Overlay types to build once | about 14 |

If decision D-03 sends account creation to the browser (the recommended option), A02 shrinks to a thin hand-off screen ("Continue on the web") and is still counted. MVP drops to 24 only if Sign in links straight to the browser with no A02 screen. If push notifications slip behind the backend work, A10 moves to Phase 2 and MVP drops by one more.

### 6.3 What can be consolidated on mobile

| Consolidation | Saves |
|---|---|
| Executive and manager dashboards become one role-adaptive Home | 1 screen |
| My Tasks, All Tasks, Board and Calendar become view modes of one Tasks screen | 3 screens |
| Pending verifications, join requests and permission requests become one Approvals queue | 2 screens |
| Project portfolio and project health become one cards screen | 1 screen |
| Unauthorised and not found become one error screen | 1 screen |
| Task detail tabs (Chat, Files, Activity, Time) stay inside one screen, except Chat, which is full screen because of the keyboard | n/a |
| Settings sections stay as a list inside one screen | 8 screens |
| Workspace and personal Drive become two segments of one screen | 1 screen |

---
## 7. User Roles, Permissions and User Journeys

### 7.1 The role layers that actually exist

Admiino does not have one role system. It has several, and the web UI mixes them. Mobile has to separate them.

| Layer | Values | Where it comes from | Used for |
|---|---|---|---|
| Account type | `workspace`, `admin` | `User.accountType` | Admin accounts are signed out of the user portal (`AuthContext.tsx:179`, `ProtectedRoute.tsx:31`) |
| Legacy platform role | `executive`, `manager`, `team_member`, `admin` | `User.role`. **Default and signup value is `executive`** (`models/User.js:67`, `authController.js:142,378`) | `allowedRoles` in `App.tsx`, and some button checks in `TaskDetails.tsx`. **Not an authority.** Nearly everyone is `executive` |
| Platform staff role | `user`, `admin`, `super_admin` | `resolvePlatformRole()` | Admin portal only |
| **Workspace role** | `owner`, `admin`, `manager`, `member`, `guest` | `CompanyMember.role` (`models/CompanyMember.js:29`) | The real per-workspace authority. The web type `WorkspaceRole` lists four; the code also refers to `guest` and `external_viewer` |
| **Workspace permissions** | 8 keys, below | Company defaults plus per-user overrides (`utils/workspaceRolePermissions.js`, `workspaceEffectivePermissions.js`) | Gates creating tasks, viewing all tasks, projects, uploads, member lists |
| Governance policy | `owners_admins` or `existing_permissions` for member invites, project creation, team management, client invites, integrations. Feature switches for Google Drive, Dropbox, automations, time tracking | `WorkspaceGovernanceSetting` | Extra restrictions on top of the permissions |
| Team role | Team Lead (a member designated by `leadMemberId`) | `Team.leadMemberId` | Submitting a team task for review, managing team members when governance allows |
| Project role | `owner`, `admin`, `member`, `viewer` | `ProjectMember.role` | Project-level access |
| Task access | `canView`, `canEdit`, `readOnly`, `canCollaborate` | Server, returned with the task | **The authority for what a user may do to one task** |
| External access | Client viewer / commenter (links), shared-with-me `viewer` / `commenter` / `collaborator` | Share records | Clients and guests |

**Default workspace permissions** (Verified, backend source: `workspaceRolePermissions.js`). The owner always gets all eight. `guest` always gets none. Owners and admins can change the admin, manager and member columns per workspace, and can override single users.

| Permission | Admin | Manager | Member |
|---|---|---|---|
| `create_tasks` | yes | yes | **no** |
| `view_all_tasks` | yes | **no** | **no** |
| `create_projects` | yes | yes | **no** |
| `view_all_projects` | yes | **no** | **no** |
| `create_project_tasks` | yes | yes | **no** |
| `upload_workspace_files` | yes | yes | **no** |
| `view_workspace_members` | yes | yes | **no** |
| `assign_workspace_members` | yes | yes | **no** |

**Consequence for mobile.** With defaults, a plain member cannot create tasks, create projects, see the people list or upload workspace files. The mobile app must read the effective permissions (`GET /access-requests/me/effective-permissions`, `api.ts: getMyEffectiveWorkspacePermissions`) after every sign-in and workspace switch and hide controls that would fail. Hiding is a convenience only. The server remains the enforcement point.

### 7.2 What each role sees on the web (Verified, web source)

| | Owner | Admin | Manager | Member | Team Lead (any role) |
|---|---|---|---|---|---|
| Dashboard | Executive view | Executive view | Manager view (`DashboardRoleRouter.tsx`) | Executive view, with "My tasks" | Same as base role |
| Sidebar "Team" group | Yes | Yes | Yes (default `view_workspace_members`) | Only if permitted | Same as base role |
| Hire Talent | Yes | Yes | Yes | No | n/a |
| Workspace Settings, Customisation, Activity Log, Subscription, Workspace Members (account menu) | Yes | Yes | No | No | n/a |
| Governance, Automations, Audit exports | Yes | Yes | No | No | n/a |
| Approve join requests and pending verifications | Yes | Yes | No | No | n/a |
| Project Health, Workload | Yes | Yes | Yes (Workload per page text: managers with workload access) | No | Team Leads see their team's workload (page text) |
| Trash | Yes | Yes | No | No | n/a |
| Task "Submit for Executive Review" | Creator or Team Lead | Same | Same | Creator or Team Lead | Yes |
| Task "Approve and Complete" | Task creator, or legacy role `admin / manager / executive` (= almost everyone) | Same | Same | Same | n/a |

The last row is the clearest example of §1.3 item 4. The check in `TaskDetails.tsx:1733` uses `user.role`, so the button is visible to nearly everyone. Whether the server rejects an unauthorised approval is **Unverified**: no dedicated rule was found in `taskController.updateTask` or `taskDomainService.js`.

### 7.3 Mobile navigation by role

Tabs are the same for every role. What changes is content and menu entries. See §8.3.

### 7.4 End-to-end journeys

Each journey lists the entry point, steps, screens, permissions, API dependencies, outcomes and the recommended mobile interaction. "Web (V)" means verified in the web source. "Backend (V)" means verified in the backend source.

#### Journey 1. New user registration and account verification

| | |
|---|---|
| Entry | App launch, then Sign in, then Create account |
| Steps | 1. Enter first name, last name, email, password (8+ characters), tick the Terms and Privacy consent, pass the security check. 2. `POST /auth/signup`. The web saves any returned token and a `verificationProof` locally. 3. Screen "check your email" with resend. 4. Open the emailed link `…/verify-email/setup#token=…`. 5. If this device holds the signup proof, the address is confirmed with no further input and the chosen password is kept. Otherwise the user confirms the password they chose, or sets a new one. 6. Sign in. 7. With no workspace, go to workspace setup (Journey 2 or 3) |
| Screens | A02, A03, A01, A08 |
| Permissions | Public |
| APIs | `POST /auth/signup`, `POST /auth/resend-verification`, `POST /auth/verify-email/inspect`, `POST /auth/verify-email/complete` |
| Success | Verified account, signed in |
| Failure | 409 email exists. 429 rate limit. Security check failed (`TURNSTILE_FAILED`). Expired or reused token. Login before verification returns 401 "Please verify your email" (backend (V): `middleware/auth.js`) |
| Mobile | Keep the signup proof in `expo-secure-store` so a verification link opened in the app confirms silently. If the link opens in a browser, the user takes the "confirm your password" path, which works anywhere. The security check needs decision D-03 |
| Not verifiable | Whether the deployed email links point at the web origin or a mobile link. The proof logic is web-only today |

#### Journey 2. New organisation owner onboarding

| | |
|---|---|
| Entry (self-serve) | After Journey 1 with no workspace, or `OnboardingFlowController` after the tour |
| Steps | 1. Workspace setup, tab "Create workspace". 2. Name, industry, size, plan (`free` or `team`). 3. `POST /companies`, then `GET /auth/workspaces`. 4. Web reloads with the new workspace active. 5. Dashboard and the optional tour |
| Entry (provisioned) | An emailed ownership-claim link `…/claim-ownership#token=…`. The org is created by the platform admin |
| Steps | Inspect the token, set name and password, accept ownership, land in the workspace |
| Screens | A08, H01. For the provisioned path: A07 |
| Permissions | Signed in |
| APIs | `POST /companies`, `GET /auth/workspaces`, `POST /auth/org-activation/inspect`, `.../owner/activate`, `.../owner/accept` |
| Success / failure | Workspace appears in `GET /me/workspaces`. Failures: validation error, expired or used secret |
| Mobile | Self-serve creation is a short form. The `team` plan has commercial meaning. How it is billed is **Unverified**, because the `Plans` and `Checkout` pages are unreachable. Keep the plan choice off mobile and create on `free`, or hand off to the web (decision D-08). The provisioned path is Phase 2 because the emailed link also works in a mobile browser |

#### Journey 3. Existing user joining through an invitation

| | |
|---|---|
| Entry | Email link, a notification, or a company code |
| A. Workspace invite | `/invite/:token`. `GET /invites/:token` shows the workspace and role. Signed in: `POST /invites/:token/accept`. Signed out: sign in or sign up with the invite. The web parks the token as `pending_workspace_invite` and resumes after sign-in |
| B. Organisation invite for an existing account | `/activate-account#token=…`. The user must sign in first. The secret is parked for up to 30 minutes (`lib/orgActivation.ts`) |
| C. Company code | `POST /company/join/resolve`, then `POST /company/join/requests`. An owner or admin decides. The user receives `workspace_join_decided` and, if approved, opens the workspace |
| D. Project invite | `/project-invite/:token`, then accept or reject |
| Screens | A06, A07, A08, A11 |
| Permissions | Public with a secret, or signed in. Deciding a join request: owner / admin |
| Success / failure | Membership appears. Failures: expired, revoked or already used token; email mismatch; seat or policy limits (seat impact notice exists in the web, `components/commercial/SeatImpactNotice.tsx`) |
| Mobile | Universal and App Links open these screens directly. Keep a pending-invite record in secure storage with the same 30-minute limit and resume it after sign-in. The links are built by the backend from `FRONTEND_URL` (`authController.js:703`), so they point at the web today (§12.5) |

#### Journey 4. Switching between organisations or workspaces

| | |
|---|---|
| Entry | Workspace switcher in the header or sidebar |
| Steps | 1. List from `GET /me/workspaces` (suspended and removed ones are filtered out). 2. Search, then choose. 3. `setActiveCompanyId` stores the id, re-derives the workspace role, and drops the previous workspace's cached queries. 4. All later calls send `x-company-id`. 5. The Calendar and "My tasks" views can also span all workspaces without switching (`scope=assigned_all`, `workspaceId` filter) |
| Screens | Switcher sheet over H01 and S01 |
| Permissions | Any member |
| APIs | `GET /me/workspaces`, header `x-company-id` |
| Failure | HTTP 400 "x-company-id" missing, 403 not a member, 423 suspended. The web listens for these and opens the switcher or recovery screen |
| Mobile | Header chip with avatar and name opens a bottom sheet. On switch: cancel in-flight requests, clear that workspace's cache, reset the stack to Home, reload permissions. A push tap for a different workspace shows "Switch to {workspace} to open this?" (the web Calendar has the same confirmation). The notification payload must carry the workspace id (B-02) |
| Not verifiable | Whether WebSocket events are filtered by workspace on the server. The web invalidates caches by event type only |

#### Journey 5. Creating and managing a team

| | |
|---|---|
| Entry | Teams (More on mobile) |
| Steps | 1. New team (name, description). 2. Add members from the eligible list. 3. Assign a Team Lead (the API requires the expected current lead and a transfer confirmation). 4. Use the team workspace: tasks, chat, activity. 5. Edit or delete |
| Screens | M01, M02, M03 |
| Permissions | Governance `teamManagementPolicy`. Team Leads can manage members when the workspace allows it (recent commits `37032b7`, `16b7328`). Viewing needs `view_workspace_members` |
| APIs | `POST /team/teams`, `GET .../eligible-members`, `POST .../members/bulk`, `PUT .../lead`, `GET .../workspace`, `POST .../messages` |
| Success / failure | Team appears with lead. Failures: lead transfer conflict, last-lead removal, permission denied |
| Mobile | Reading teams and chatting is Phase 2. Creating and editing teams is Phase 3, because member pickers and lead transfers are error-prone on a phone |

#### Journey 6. Creating a project and assigning team members

| | |
|---|---|
| Entry | Projects, "New project" or "New from template" |
| Steps | 1. Create the project. 2. Open it, then Members. 3. Add a workspace member directly, or invite by email. 4. Set a project role. 5. Add tasks to the project |
| Screens | P01, P03, P04, P02 |
| Permissions | `create_projects` and governance `projectCreationPolicy` to create. A user without access can request it (`POST /access-requests`) |
| APIs | `POST /projects`, `POST /projects/:id/members/direct`, `POST /projects/:id/members/emails`, `PATCH /projects/:id/members/:uid`, `POST /projects/:id/tasks` |
| Success / failure | Project with members. Failures: permission, policy, seat limits on invites |
| Mobile | MVP lets users open projects they belong to and add project tasks. Creating projects and managing members is Phase 2 |

#### Journey 7. Creating, assigning and updating tasks

| | |
|---|---|
| Entry | Tasks, Home, Calendar slot, Project "Add task", Team tasks |
| Create | Title (required), description (required on the web form), attachments (up to 10), category, priority (low, medium, high, urgent), deadline, assignees (zero or many). `POST /tasks` as multipart, with `assigneeIds[]`. Team tasks can only be assigned to team members. The backend creates the task and its assignees in one transaction (`docs/my-tasks-and-assignees.md`) |
| Update | Status (pending, in_progress, in_review, completed, delayed, cancelled), edit fields, subtasks, dependencies (a warning comes back when a blocked task moves), recurrence, watchers. `PATCH /tasks/:id` |
| Screens | T04, T01, T02, T05 |
| Permissions | `create_tasks` to create. Per-task `access.canEdit` to edit |
| Success / failure | Task in list and for assignees (notification). Failures: 400 with a code for invalid assignees; 403 read-only |
| Mobile | Quick-add with title, priority and deadline first, and "More options" to expand. Status change through a picker sheet. Pull-to-refresh. Offline creation queue is Phase 2 |
| Not verifiable | Whether the server requires `description` (the web form marks it required) |

#### Journey 8. Submitting a task for review, then approving or returning it

| | |
|---|---|
| Entry | A team task with an execution panel, or any task's status control |
| Web steps (V) | 1. **Submit.** In the "Team Execution" panel (shown only when `task.teamId && task.execution`) the Team Lead, creator or a legacy `admin/manager` sees "Submit for Executive Review". It sets `status: "in_review"`. 2. The backend notifies **the task creator only** (`task_review_required`), and only for a top-level task that is not the actor's own action (backend (V): `taskDomainService.js:172-199`). 3. **Approve.** The creator or a legacy `admin/manager/executive` sees "Approve and Complete", which sets `completed`. 4. **Return.** There is no return button. The reviewer sets the status back (the dropdown, or "Reopen Task" after completion, which sets `in_progress`). Reopening from completed notifies involved users (`task_reopened`) |
| Screens | T02, N01 |
| Permissions | Server enforcement of who may approve is **Unverified** |
| APIs | `PATCH /tasks/:id` with `status` |
| Success / failure | Task is completed or back in progress. Failures: 403 read-only |
| Mobile | A "Needs my review" preset on Tasks (`status=in_review`, `relation=created`). On T02, a review card with **Approve** and **Send back**. "Send back" sets `in_progress` and posts an optional note through the comments API. This needs no backend change. A formal "returned" state does not exist in the backend (`TASK_STATUSES` has six values) and is a product decision (D-07) |

#### Journey 9. Commenting on tasks and sharing attachments

| | |
|---|---|
| Entry | Task detail, Chat |
| Steps | 1. Open the task. The client joins the task room over WebSocket. 2. Write a message. The client sends over WebSocket with a `clientMessageId` and waits for an acknowledgement, or falls back to `POST /task-comments/task/:id/comments` (multipart, with files, replies, mentions and storage attachments). 3. The sender sees "Sending…" then "Sent". Duplicates are prevented by `clientMessageId`. 4. Others see typing indicators and the new message. 5. Attachments are downloaded through an authenticated blob request |
| Screens | T03, F03 |
| Permissions | `task.access.canCollaborate` or edit rights |
| APIs | WebSocket `join_task`, `new_comment`, `typing_indicator`. `GET/POST /task-comments/task/:id/comments`. `GET /tasks/:id/attachments/:aid/download` |
| Limits (backend (V)) | 20 MB per file, 20 files per request (task routes limit further). Allowed: PDF, DOC/DOCX, XLS/XLSX, PPT/PPTX, TXT, CSV, JPEG, PNG, WEBP, GIF. **Not allowed: HEIC, HEIF, video, audio** |
| Mobile | Full-screen thread above the keyboard. Attach from camera, photo library or Files. Convert HEIC to JPEG before upload. Show progress and retry. Foreground WebSocket only. A push tap opens the thread |

#### Journey 10. Receiving and acting on notifications

| | |
|---|---|
| Entry | Bell on the web. Push on mobile |
| Steps | 1. The backend writes a `Notification` and queues deliveries (email, WhatsApp) according to category preferences (assignments, mentions and replies, status and review, due work, project and team, client access, workspace and commercial). In-app is always written. 2. The web receives a WebSocket `notification` event and refreshes. 3. The bell shows unread. 4. Tap: mark read and navigate using `getNotificationLink` (`lib/notificationLink.ts`), which maps `data.taskId`, `projectId`, `teamId`, `inviteToken`, `requestId`… to routes |
| Screens | N01, N02, any target screen |
| APIs | `GET /notifications`, `GET /notifications/unread-count`, `PATCH /notifications/:id/read`, `PATCH /notifications/read-all`, `DELETE /notifications/:id`, `GET/PATCH /notification-preferences` |
| Defaults (backend (V)) | WhatsApp is on by default only for assignments and mentions. Status and review, and due work, are email and in-app by default |
| Mobile | Reuse the link mapping for push taps. Show the badge from the unread count. Add a "Push" column to the preferences matrix. Group Today and Earlier. Swipe to mark read |
| Gap | There is no push channel, and the unread count appears to be per active workspace because the route runs `setActiveWorkspace` (Unverified). Mobile will want a cross-workspace unread total (B-02) |

#### Journey 11. Accessing files, calendar and integrations

| | |
|---|---|
| Files | Drive has workspace folders (upload needs `upload_workspace_files`) and personal folders. Deleting moves to Trash. The Google Picker is a web-only dialog that needs a browser API key. Dropbox is browsed server-side through `/connected-storage` |
| Calendar | `GET /calendar/events?start&end&scope`. The events are tasks with deadlines. Google Calendar sync is shown as a read-only flag on tasks |
| Integrations | Google connect asks the backend for a URL, stores `integration_return` in `sessionStorage`, and redirects the whole window. The callback returns to the web. WhatsApp linking starts from a link sent by the assistant. Dropbox returns an authorisation URL |
| Screens | F01–F06, C01, S06 |
| Mobile | Calendar: Phase 2 view in Tasks. Drive: Phase 2. Connect flows: open the system browser session and return through a link back into the app (needs B-03). Prefer the server-side connected-storage API over the Google Picker |

#### Journey 12. Updating profile and organisation settings

| | |
|---|---|
| Profile | `PATCH /profile/update`, `POST /profile/upload-picture` (5 MB images). The professional profile has its own CRUD under `/profile/me/*` and a CV download |
| Preferences | Theme (`admiino:theme`) and `use-local-preferences` live in `localStorage` only. They are not synced across devices |
| Organisation | `PATCH /companies/active` (name, logo, details). Role permissions: `PATCH /company/:id/settings`. Governance: `PATCH /workspace/governance`. Subscription is read-only |
| Screens | S02, S03, S04, S05 |
| Permissions | Own profile: self. Organisation: owner / admin |
| Mobile | S02 and S04 in MVP. Organisation overview and company code in Phase 2. Permission matrix, governance and custom fields stay web |

### 7.5 Mandatory versus optional onboarding

| Step | Mandatory? | Reason |
|---|---|---|
| Account creation or invitation | Mandatory | No access without an account |
| Email verification | Mandatory | The backend rejects unverified accounts (`middleware/auth.js`) |
| Belong to a workspace (create, join by code, or accept an invite) | Mandatory | Every data call needs a workspace; with none, the web routes to workspace setup |
| Accept consent (Terms, Privacy) | Mandatory at signup | Checkbox required before submit |
| Product tour (`OnboardingTour`) | **Optional** | Dismissible dialog. Executive-oriented text. Mentions AI Hub, which is a placeholder |
| Gender question (`OnboardingProfileModal`) | **Optional in the UI** | Shown when `needsGender` is true. The Select is not required to continue. Whether the backend needs it is Unverified (D-09) |
| WhatsApp linking | Optional | Notification channel |
| Notification permission | Optional (mobile) | Skippable. Must be asked in context |
| Google or Dropbox connection | Optional | Integration |
| Professional profile | Optional | Not needed to work |

### 7.6 Workflows that cannot be verified from the frontend

| Workflow | What is missing |
|---|---|
| Who may approve or complete a task | No server rule found in the files read |
| Payment for the `team` plan | `Plans.tsx` and `Checkout.tsx` are unreachable. `WorkspaceSubscription` is read-only |
| Platform-admin organisation provisioning | Lives in the admin portal and backend flag `requireOnboardingEnabled` |
| Hire Talent fulfilment | Handled by staff in the admin portal |
| WhatsApp assistant conversations | Backend `services/whatsapp/*`. Not part of the portal |
| Where emailed links point | Built by the backend from `FRONTEND_URL`. Deployed value not seen |
| Google Calendar sync direction | Only a read-only flag is shown |
| Whether WebSocket events are scoped to the active workspace | Server side |
| Web password reset | Pages exist and endpoints exist (`POST /auth/forgot-password`, `/auth/reset-password/:token`), but the web routes render the login form |

---

## 8. Recommended Mobile Navigation Architecture

### 8.1 The recommendation

**Five bottom tabs: Home · Tasks · Projects · Inbox · More.**

| Tab | Purpose | Root screen | Why it earns a permanent tab |
|---|---|---|---|
| **Home** | "What needs me today?" Due and overdue work, review queue, shortcuts, workspace chip | H01 | The first thing users open. Aggregates every other tab |
| **Tasks** | Find and update my work, quick-add | T01 | Task work is the core action. The default notification categories (assignments, mentions and replies, status and review, due work) are almost all about tasks |
| **Projects** | Browse projects and their tasks | P01 | Projects are the main container for tasks and are visible to everyone who belongs to one |
| **Inbox** | Notifications and approvals | N01 | The reason to install an app. Badge count lives here |
| **More** | Everything else, filtered by permission | S01 | Keeps the bar at five without hiding features |

Why this and not the candidate list:

| Candidate | Decision | Reason |
|---|---|---|
| Home / Dashboard | Tab | |
| My Tasks / Tasks | Tab | |
| Projects | Tab | |
| Notifications | Tab (as Inbox) | |
| Profile | Not a tab. Opens from the header avatar and from More | Used rarely |
| Teams | In More, with a shortcut on Home for Team Leads | Hidden from members by default. Mostly a navigation container on the web |
| Calendar | A view in Tasks (List, Board, Calendar) and a Home widget | The web calendar shows task deadlines only, so it is a view of tasks, not a separate data set |
| Drive | In More | Policy-dependent (`upload_workspace_files`). Files are mostly reached through tasks |
| More / Workspace | Tab (More) | |

**Why not four tabs plus a floating "+"?** The create action is permission-gated (default members cannot create tasks), so a global button would often be disabled. Create is offered on Tasks and Project detail where it makes sense.

**Why not a drawer like the web sidebar?** The web sidebar has about 15 destinations. A drawer hides the Inbox badge and the main actions behind a tap, and iOS users expect a tab bar.

### 8.2 Primary navigation changes by role

The tabs never change. Their content does.

| Role or permission | Home | Tasks | Projects | More |
|---|---|---|---|---|
| Owner, Admin | "Needs your action" card (approvals count, review queue). Team overview | Segments Mine, Created, All | All projects | Approvals, Workspace, Teams, People, Hire Talent, Activity (Phase 3) |
| Manager | Manager variant: team load, review queue | Mine, Created. All only with `view_all_tasks` | Projects they belong to, or all with `view_all_projects` | Teams and People (default permission), Workload (Phase 3) |
| Member | My tasks first, due soon | Mine, Created. "+" only with `create_tasks` | "My projects" | Teams and People only with `view_workspace_members` |
| Team Lead | Adds "My team's tasks in review" | Team filter | Team projects | Team detail, manage members if governance allows |
| Guest or external viewer | Read-only summary | Read-only | Read-only | Shared with me. No admin entries |

### 8.3 Secondary navigation (More)

Entries appear only when the effective permissions allow them.

| Group | Entries | Phase |
|---|---|---|
| Work | Calendar, Teams, People, Time tracking, Drive | P2 |
| Approvals | Join requests, pending verifications, permission requests | P2 |
| Workspace | Workspace overview and invite code, Integrations, Activity log, Subscription | P2 / P3 |
| Shared | Shared with me | P2 |
| Account | My profile, Notification settings, Settings, Help and support, Sign out | MVP / P2 |

The workspace switcher is reachable from the Home header chip and from the top of More. Switching is a sheet, not a screen.

### 8.4 Nested navigation

| Topic | Design |
|---|---|
| List to detail | Stack push inside each tab. The tab bar stays visible on list screens and hides on full-screen forms and the conversation screen |
| Create and edit | Full-screen modal routes (T04, T05, P03). Unsaved-changes confirmation on close |
| Search | Header search icon on Home, Tasks and Projects opens H03. Local filter bar for in-list filtering |
| Filtering | Chips for the 2 or 3 most-used filters (status, priority, "due soon"), and a filter sheet for the rest (project, team, assignee, custom fields, Phase 2) |
| Contextual actions | Long-press quick actions on task rows. Overflow menu on detail screens |
| Back | Native back gesture and header back. After a deep link, back goes to the tab root, not out of the app |
| Deep links | See §8.6 |

### 8.5 Mobile interaction patterns

| Pattern | Use | Do not use |
|---|---|---|
| Bottom sheet | Pickers (status, priority, date, assignee), filters, workspace switcher, review decision, attachment source | Long forms |
| Full-screen form (modal route) | Create or edit task and project | Simple choices |
| Alert dialog | Destructive confirmation (delete, sign out, leave workspace), session expired | Information |
| Segmented control | Task scope (Mine, Created, All), List/Board/Calendar, Project sections, Team sections | More than four options |
| Floating action button | Android only, Tasks list only, when `create_tasks` | Everywhere |
| Header "+" | iOS equivalent, and Project detail | |
| Search bar | Top of Tasks, Projects, People, Inbox | |
| Swipe gestures | Inbox: swipe to mark read or delete. Task row: swipe right to complete, left for more. Always with a visible alternative | As the only way |
| Context menu (long press) | Task and comment quick actions | |
| Pull to refresh | All lists | |
| Haptics | Status change, completion | Errors only on iOS convention |
| Local notifications | Optional deadline reminders computed on device (Phase 3) | Server-driven events (use push) |

### 8.6 Deep links

The link host is the web app origin (`https://www.app.admiino.com`, from `index.html` and the backend default). Use verified Universal Links and Android App Links on that host, plus a custom scheme `admiino://` for push payloads and OAuth return.

| Link | Opens | Notes |
|---|---|---|
| `/task-details/:id` | T02 | Also what `getNotificationLink` returns for tasks |
| `/teams/:teamId/tasks/:taskId[/subtasks/:id]` | T02 or T06 | |
| `/projects/:id` | P02 | |
| `/invite/:token`, `/signup-with-invite?token=` | A06 | |
| `/project-invite/:token` | A11 | |
| `/activate-account#token=…`, `/claim-ownership#token=…` | A07 | Token is in the **fragment**. Confirm that the link-handling libraries pass the fragment through on both platforms |
| `/verify-email/setup#token=…` | A03 | Same fragment caveat |
| `/reset-password/:token` | A05 | |
| `/notifications` | N01 | |
| `/settings/workspace/join-requests?workspaceId=&requestId=` | M06 | |

Anything else opens in the in-app browser. Unknown or unauthorised links show A12. Links for another workspace show the switch confirmation first.

---

## 9. Mobile UI/UX and Design System Recommendations

### 9.1 What the web design system contains (Verified, web source)

| Area | Finding | Source |
|---|---|---|
| Brand colour | Violet primary, `hsl(262 72% 50%)` light and `hsl(262 80% 62%)` dark. Soft violet accent `262 72% 95%` | `src/index.css:12-27` |
| Neutral palette | Page background `220 14% 96%`, cards white, borders `220 13% 91%`. Dark background `222 16% 7%` | `index.css` |
| Semantic colours | `success 152 69% 40%`, `warning 38 92% 50%`, `info 217 91% 60%`, `destructive 0 72% 51%`. Separate `*-text` tokens that meet WCAG AA for text on their tints | `index.css`, `docs/responsive-remediation` |
| Typography | **No custom font.** No web-font link or `@font-face`, and `tailwind.config.ts` sets no `fontFamily`, so the browser's system font stack is used. Sizes are rem-based, many small (0.625–0.8125 rem, about 10–13 px) | `tailwind.config.ts`, `index.html` |
| Spacing and layout | Tailwind scale. Container padding 2 rem. Breakpoints in rem: sm 40, md 48, lg 64, xl 80, 2xl 96, chosen so large browser font sizes switch layout earlier | `tailwind.config.ts:8-16` |
| Radius and shadow | Base radius 0.625 rem. Shadows `soft`, `elevated`, `float` | `tailwind.config.ts` |
| Components | 49 shadcn/Radix components (button, card, dialog, drawer, tabs, select, switch, badge, progress, skeleton, tooltip…), plus app components such as `PageHeader`, `StatsCard`, `ContentCard`, `EmptyState`, `LoadingState`, `TaskTable` | `components/ui`, `components/dashboard` |
| Icons | `lucide-react`, used in 174 files | |
| Charts | None rendered. Progress bars and numeric stat cards only | |
| Themes | Light, dark and system, class-based, stored in `localStorage` key `admiino:theme` | `hooks/use-theme.ts` |
| Accessibility | A recent remediation: contrast fixes, large-text wrapping, keyboard checks. Dark-theme contrast failures remain on Board and Calendar (44) | `docs/responsive-remediation/README.md` |
| States | Skeletons (`components/skeletons`), `EmptyState`, `LoadingState`, `TaskLoadErrorPanel`, toasts, `AlertDialog`, a maintenance banner | |
| Inconsistency | `in_review` is amber on Board and Calendar (`Board.tsx:25`, `calendarStatus.ts:19`) but violet on Task details (`TaskDetails.tsx:982`) | |

### 9.2 Carry over, adapt, or redesign

| Element | Mobile treatment |
|---|---|
| Brand colour, neutrals, semantic and `-text` tokens | **Carry over.** Convert HSL to hex once and keep names |
| Dark theme | **Carry over.** Support light, dark and system |
| Radius, soft shadows | **Carry over**, with platform-appropriate elevation |
| Typography | **Adapt.** Use the platform system fonts (SF Pro on iOS, Roboto on Android). That matches the web's no-custom-font reality. Raise the smallest sizes to 12 pt or more. Support Dynamic Type and Android font scaling |
| Icons | **Carry over** with `lucide-react-native` (same names) |
| Status and priority colours | **Adapt.** Fix the `in_review` inconsistency once, in the shared token file |
| Buttons, inputs, badges, cards, progress, skeletons, empty states | **Rebuild** as React Native components with the same variants |
| Dialog, dropdown menu, popover, tooltip, hover card, context menu, menubar, navigation menu, resizable panels | **Replace** with bottom sheets, action sheets and long-press menus. Tooltips and hover cards have no mobile equivalent |
| Tables (`TaskTable`, project tables, directory, workload) | **Redesign** as cards or rows |
| Sidebar and header layout | **Replace** with the tab bar and a per-screen header |
| Drawer for editing (`TaskEditDrawer`) | **Redesign** as a full-screen form |
| Kanban board | **Adapt** as horizontally paged status columns, one column in view at a time |
| Calendar month/week/day grids | **Redesign** as a month strip with an agenda list |
| Toasts (sonner) | **Adapt** as non-blocking banners with a clear safe area. Keep error text as visible content |

### 9.3 Tokens

Create one `tokens` file in the mobile repo with colour, spacing (4-point scale), radius, font sizes, and status and priority colour maps. Generate it from the web `index.css` values once. A script that reads `index.css` and regenerates it is optional. Keep names identical to the web (`primary`, `muted-foreground`, `primary-text`…) so designers and developers share a vocabulary.

Touch targets: 44 pt minimum on iOS, 48 dp on Android, with 8 dp spacing between targets. The web's `h-8` (32 px) controls and icon buttons will not pass on a phone.

### 9.4 Mobile dashboard: information hierarchy

Home answers four questions in order. Keep one screen of content before the first scroll.

| Order | Block | Content | Data source |
|---|---|---|---|
| 1 | Header | Workspace chip (switcher), search icon, avatar | `/me/workspaces` |
| 2 | Greeting + one-line status | "Good morning, Ana. 3 due today, 1 overdue." | `/tasks/my/summary` |
| 3 | **Needs your action** (only if non-empty) | Tasks waiting for my review (`in_review`, created by me), pending approvals count for owners and admins, unanswered mentions | `/tasks?status=in_review&relation=created`, approvals endpoints |
| 4 | **Due soon** | Next 5 tasks by deadline with status chip, project and a complete button | `/tasks?scope=assigned_workspace` |
| 5 | **Summary tiles** (horizontal scroller) | Open, In progress, Overdue, Completion rate. Taps open Tasks with the filter applied | `/tasks/my/summary` (server aggregates) |
| 6 | **Quick actions** | New task (if permitted), Calendar, Search, Approvals | permissions |
| 7 | **Recent activity** (collapsed by default) | Latest comments and status changes on my tasks | `/dashboard/executive` `recentActivity` |
| 8 | Owner / admin extras | Team overview, pending verifications | `/team/*` |

Use the server summary (`GET /tasks/my/summary`). Do not copy the web manager dashboard, which counts in the browser from a single page of tasks. The web executive view already uses the summary.

### 9.5 Task management on a phone

| Element | Design |
|---|---|
| **Task list row** | Title (2 lines), status dot or chip, priority, deadline (red when overdue), assignee avatars (up to 3 and "+n"), project name. No table columns. Subtasks collapsed behind a count (the web already hides subtasks from the top-level list: `filterTopLevelTasks`) |
| **Scope** | Segmented control: Mine · Created · All (All hidden without `view_all_tasks`). Maps to `scope` and `relation` parameters |
| **Filters** | Chips: Status, Priority, Due. Sheet for the rest. Presets: "Needs my review", "Overdue", "Due this week" |
| **Task detail** | Sticky header with title and status chip. Sections in order: key facts (status, priority, deadline, assignees, project, team), description, subtasks, attachments, activity, then a "Conversation" row that opens T03 with the latest message and an unread dot. Bottom bar: Comment, Edit (if `canEdit`) |
| **Status change** | Tap the chip, pick from a sheet. Only allowed values for the user. Show dependency warnings returned by the server |
| **Assignment** | Searchable multi-select sheet of workspace members (needs `assign_workspace_members`), de-duplicated and limited to active members |
| **Comments** | Message bubbles with delivery state (Sending, Sent, Failed with retry). Replies as a quoted line. `@` mention picker. Attachment chips |
| **Attachments** | Grid of file chips. Images open in the viewer. PDFs and text open in the viewer. Office files offer Download then "Open in…" (the web previews DOCX and XLSX in the browser using `mammoth` and `read-excel-file`, which are not suited to a phone) |
| **Review** | Card shown when the task is `in_review` and the user is the creator: Approve, Send back (optional note) |
| **Custom fields** | Read-only list (Phase 2). Editing later |
| **Recurrence, dependencies, watchers, time** | Phase 2 read-only rows. Editing later |

### 9.6 Projects and teams

| Screen | Layout |
|---|---|
| Project list | Cards: logo or colour dot, name, status badge, progress bar, due date, member avatars. Search, status filter chip |
| Project detail | Header (name, status, progress ring). Segmented control: Overview · Tasks · Members · Files. Overview shows description, dates, progress, team. Tasks reuses the task row and shows "Add task" with the project prefilled. Members is a list with role badges (Phase 2 management). Checklists appear under Overview in Phase 2 |
| Team detail | Header with lead badge. Segments: Overview (members, workload bars), Tasks, Chat, Activity |
| People | Alphabetical list with avatar, name, role, presence of overload (Phase 3). Search. Tap opens the member profile |

### 9.7 Proposed mobile onboarding

| Step | Screen | Notes |
|---|---|---|
| 1 | **Sign in** (A01), with "Create account" | No pre-login carousel. The app opens to the point of action |
| 2 | **Create account** (A02) | Short form. Consent line. Password rules inline. Security check (D-03) |
| 3 | **Verify email** (A03) | "Open mail app" button, resend with a visible countdown, "Use a different email" |
| 4 | **Workspace setup** (A08) | Two clear choices: "Join with a company code" and "Create a workspace". Show pending join requests and their status here. Invitations arrive through links and skip this step |
| 5 | **Notification primer** (A10) | Shown after the first successful workspace entry, not at launch. "Allow notifications" and "Not now" |
| 6 | **Home with coaching** | Three dismissible tips replace the 9-step web tour: "Tap a task to update it", "Swipe a notification to clear it", "Switch workspace here". Empty states do the rest of the teaching |
| Optional later | Biometric lock, WhatsApp link, professional profile, theme | Offered from Settings, not forced |

Invitations skip steps 2 and 4 where the link already carries the workspace and role.

### 9.8 Screen density rules

- One main idea per screen. One primary action per screen.
- Cards, not tables. No horizontal scrolling for data, except deliberate carousels (summary tiles, board columns).
- Maximum two levels of tabs or segments on any screen.
- Collapse secondary information (activity, subtasks beyond five, custom fields beyond three) behind "Show more".
- Use the system share sheet, date picker and file picker rather than custom ones.

---

## 10. Key Mobile Screen Wireframe Descriptions

Low-fidelity text wireframes. `[ ]` is a control, `( )` a chip, `…` scrolled content. They define content order only. No visual design is implied.

### 10.1 A01 Sign in

```
          [Admiino logo]
   Sign in to your workspace

   Email      [______________]
   Password   [______________] (show)
                   Forgot password?
   [        Sign in         ]
   ──────── or ────────
   [ G  Continue with Google ]

   New to Admiino?  Create account
   Terms · Privacy
```
- Keyboard-aware. Inline error under the field that failed. "Email not verified" shows a "Resend verification email" action.
- States: loading button, 429 "Too many attempts" banner, offline banner.

### 10.2 H01 Home (member and owner variants)

```
 [WS chip ▾ Acme Ltd]          [search] [avatar]
 Good morning, Ana
 3 due today · 1 overdue

 NEEDS YOUR ACTION (owner / creator only)
 ┌────────────────────────────────────┐
 │ In review: Q3 report  · Tunde      >│
 │ 2 join requests waiting            >│
 └────────────────────────────────────┘
 DUE SOON                      See all >
 ( ) Prepare board deck   Fri · High  [✓]
 ( ) Review contract      Sat · Med   [✓]
 SUMMARY  ← [Open 12] [In progress 5] [Overdue 1] [Done 82%] →
 QUICK ACTIONS  [+ Task] [Calendar] [Approvals]
 RECENT ACTIVITY ▸ (collapsed)
 ─────────────────────────────────────
 Home  Tasks  Projects  Inbox  More
```
- Pull to refresh. "+ Task" appears only with `create_tasks`. "Approvals" only for owner and admin.
- Empty state for a new member: "No tasks yet. Tasks assigned to you will appear here."

### 10.3 T01 Tasks

```
 Tasks                       [search] [+]
 ( Mine | Created | All )     [filter ⚙]
 (Open) (Overdue) (Due this week) (Needs my review)
 ─────────────────────────────────────
 Prepare board deck                 ● In progress
 Finance · Fri 28 Nov · High    (A)(B) +1
 ─────────────────────────────────────
 Review supplier contract           ○ Pending
 Legal · Sat 29 Nov · Medium        (A)
 …
 ─────────────────────────────────────
 Home  Tasks  Projects  Inbox  More
```
- Phase 2 adds a view switch `List · Board · Calendar` beside the filter.
- Row tap opens T02. Row long-press opens quick actions (status, assign, open conversation). Swipe right completes, left shows more.
- Empty state differs by cause: no tasks vs. no matches ("Clear filters").

### 10.4 T02 Task detail

```
 ‹ Back            Prepare board deck        [⋯]
 ● In progress ▾      High      Due Fri 28 Nov
 Assignees (A) Ana  (B) Tunde      Project: Finance
 Team: Operations (Lead: Tunde)

 ┌ REVIEW (when in review & I'm creator) ┐
 │ [ Approve ]   [ Send back ]           │
 └───────────────────────────────────────┘
 DESCRIPTION  …  Show more
 SUBTASKS 2/5  ▸
 ATTACHMENTS (3)  [pdf] [jpg] [xlsx]  + Add
 ACTIVITY ▸ (latest 3)
 ┌ Conversation · 4 new         Open  > ┐
 └───────────────────────────────────────┘
 [ Comment ]                    [ Edit ]
```
- Overflow menu: copy link, watch or unwatch, save as template (Phase 3), delete (if allowed).
- Read-only tasks hide Edit and status change and show "View only".
- Errors: "You no longer have access to this task" returns to the list (the web lists access errors in `TaskLoadErrorPanel`).

### 10.5 T03 Task conversation

```
 ‹ Prepare board deck · Conversation
 ─────────────────────────────────────
        Tunde  09:12
        ┌───────────────────────┐
        │ Draft is in the folder │
        └───────────────────────┘
                         ┌──────────────────┐
                         │ Thanks, checking │  ✓ Sent
                         └──────────────────┘
 Tunde is typing…
 ─────────────────────────────────────
 [+]  [ Write a message…          ] [➤]
```
- `[+]` opens the attachment source sheet. `@` opens the member picker. Failed send shows "Not sent · Retry".
- Foreground WebSocket for live updates. On resume, refetch the thread.

### 10.6 T04 Create task (full-screen modal)

```
 ✕  New task                         [Create]
 Title *        [__________________________]
 Priority *     ( Low )( Medium )( High )( Urgent )
 Deadline       [ Add date and time ]
 Assignees      [ Add people ]
 ▸ More options
     Description *   Category   Project   Team
     Attachments     Custom fields (Phase 2)
```
- Create is disabled until required fields are valid. Closing with changes asks "Discard task?".
- Entered from a project or a calendar day, the project or deadline is prefilled.

### 10.7 P01 Projects and P02 Project detail

```
 Projects                       [search]
 (Active)(On hold)(Completed)
 ┌────────────────────────────────────┐
 │ ■ Website relaunch      Active      │
 │ ▓▓▓▓▓▓░░░░ 62%  · Due 12 Dec  (A)(B)│
 └────────────────────────────────────┘
 …
 ───────────────
 ‹ Website relaunch                  [⋯]
 Active · 62% · 12 Dec
 ( Overview | Tasks | Members | Files )
 Tasks tab: task rows …        [+ Add task]
```
- Members and Files segments are read-only in MVP. Permissions control the "+ Add task" button.

### 10.8 N01 Inbox

```
 Inbox                       [Mark all read]
 ( All | Unread )
 TODAY
 ● Tunde assigned you "Board deck"      9:04
 ● New comment on "Contract review"     8:40
 EARLIER
   Your request to join Acme was approved
 …
```
- Swipe right to mark read, left to delete. Tap marks read and opens the target through `getNotificationLink`.
- Empty: "You're all caught up."

### 10.9 S01 More

```
 [avatar] Ana Okoye            Acme Ltd ▾
 WORK
   Calendar · Teams · People · Time · Drive
 APPROVALS (owner/admin)        2 waiting >
 WORKSPACE
   Overview & invite code · Integrations
 SHARED
   Shared with me
 ACCOUNT
   My profile · Notification settings · Settings
   Help & support
   Sign out
```
- Entries not allowed by the effective permissions are not shown, not greyed.

### 10.10 Workspace switcher (bottom sheet)

```
 Switch workspace                 ✕
 [ Search workspaces… ]
 ✓ Acme Ltd              Owner
   Beta Studio           Member
   Gamma Co              Manager
   Show more
 [ + Join or create a workspace ]
```
- Role shown beside each name. Suspended workspaces do not appear. Selecting the current one just closes the sheet.

---
## 11. Frontend Code Reusability Assessment

### 11.1 Summary

The web code is reusable where it is plain TypeScript and not reusable where it is React DOM. In numbers: of 328 non-test source files, **231 contain Tailwind `className` markup** (8,045 occurrences) and are rewrite-only. The reusable value sits in the API client, the domain types and about two dozen small utility files.

| Class | What | Size (approx.) | Effort |
|---|---|---|---|
| **1. Directly reusable** | Pure TypeScript helpers with no browser, React or storage references | 25 files (23 in `lib/`, 2 in `types/`), about 1,400 lines | Copy, adjust imports |
| **2. Reusable after extraction into a shared package** | API types and client, query keys and fetchers, WebSocket protocol logic, auth flow logic | about 2,000 lines of types and about 3,300 lines of client methods, plus about 1,000 lines elsewhere | Decouple storage, events, files and base URL |
| **3. Significant modification** | Data logic embedded inside page components | Parts of `TaskDetails`, `ProjectDetails`, `AllTasks`, `Teams`, both dashboards | Extract into hooks first, then adapt |
| **4. Must be rewritten** | All UI, routing, layout, styling, browser-only features | 231 files | Rebuild natively |

The line counts come from a static scan for browser, React and storage references and from reading the main files. They are estimates, and each file must be confirmed when it is moved.

### 11.2 Class 1: directly reusable

These files contain no DOM, `window`, storage, React or `import.meta` references in the scan.

| File (in `src/lib` unless stated) | Lines | Purpose | Note |
|---|---|---|---|
| `taskListUtils.ts` | 144 | Top-level task filtering, subtask counts, "involved in task" test | |
| `projectPortfolio.ts` | 128 | Project summary maths | Has a test file |
| `recurrenceForm.ts`, `templateForm.ts` | 111, 147 | Form models and validation for recurrence and templates | Phase 3 |
| `workloadView.ts`, `timeTrackingUtils.ts` | 67, 26 | Workload and time maths | Have test files |
| `teamTaskViews.ts`, `teamMembershipSections.ts`, `membershipCounts.ts`, `memberIdentity.ts` | 47, 29, 35, 30 | Team and member helpers | |
| `permissions.ts` | 39 | Role helpers | Takes the legacy `UserRole`. Replace with effective-permission checks |
| `notificationLink.ts` | 42 | Maps a notification to a destination | **High value.** Keep the data-field logic, change the return type from web paths to mobile routes |
| `taskExecutionRoutes.ts` | 13 | Route builders | Re-point to mobile routes |
| `queryKeys.ts` | 42 | TanStack query key factory | |
| `taskCategories.ts`, `taskDependencies.ts`, `commercialFormat.ts`, `signupErrors.ts`, `workspaceLifecycle.ts`, `workspaceNavigation.ts`, `calendar.ts` | 14, 15, 16, 16, 14, 5, 9 | Small helpers | |
| `calendarStatus.ts` | 74 | Status labels, overdue test, calendar event normalisation | Contains Tailwind class strings for chips. Keep the logic, swap the styles for tokens |
| `integrations.ts` | 213 | Provider metadata and status normalisation | Imports image assets. Replace them |
| `types/calendar.ts`, `types/googleDrive.ts` | 80, 49 | Types | |

Not reusable: `utils.ts` (`cn()` for Tailwind class merging) and the `.d.ts` files for Google Picker and Mammoth.

### 11.3 Class 2: reusable after extraction into a shared TypeScript package

| Asset | Where | What is reusable | What must change |
|---|---|---|---|
| **API types** | `lib/api.ts` lines 1–2,066 (about 2,000 lines of interfaces) | `User`, `WorkspaceRole`, `CompanyMember`, `Team`, `Task`, `TaskAccess`, `Notification`, `Project`, permission, governance and commercial types | Remove the unused `/admin`, MCP and Support-agent types. Mark fields that are legacy (`role: UserRole`) |
| **API client** | `lib/api.ts` lines 2,067–5,423 (about 353 methods, about 326 call sites) | Endpoint paths, query-string builders, payload shapes, response normalisers (for example team parsing of `data.members`) | See §11.4 |
| **Query fetchers and keys** | `hooks/useCoreQueries.ts` (256), `lib/queryKeys.ts`, `lib/queryClient.ts` | `fetchDashboardData`, `fetchProjects`, retry policy, `staleTime` choices | Replace `useAuth()` context reads |
| **WebSocket protocol** | `lib/websocket.ts` (435) | Message types, task-room rejoin after reconnect, comment acknowledgement with timeouts, `reconnectDecision()`, `reconnectDelay()`, de-duplication of processed message ids | Replace `window.addEventListener('online')` with NetInfo, add AppState, drop `toast` and `import.meta.env` |
| **Comment delivery** | `lib/commentDelivery.ts`, `lib/commentComposer.ts`, `hooks/useTaskComments.ts` | `clientMessageId` de-duplication, retry rules | Replace `File` objects with picked-file descriptors |
| **Realtime cache sync** | `hooks/useRealtimeCacheSync.ts` (96) | The event-to-invalidation map: `task_updated`, `task_status_changed`, `task_assigned`, `task_created`, `task_deleted`, `new_comment`, `comment_updated`, `comment_deleted`, `project_*`, `workspace_membership_changed`, `workspace_join_request_changed`, `notification`, `new_notification` | Hook into the mobile WebSocket provider |
| **Auth and workspace flow** | `contexts/AuthContext.tsx` (385) | The sequence: sign in, reject admin accounts, fetch workspaces, pick the stored active workspace or the first, derive the role, handle suspension, clear workspace cache on switch | Rewrite with async secure storage. Remove `window.location.reload()` |
| **Verification and invite logic** | `lib/emailVerification.ts`, `lib/orgActivation.ts`, `lib/authReturnPath.ts` | Proof handling, 30-minute parked secret, safe return-path validation (`safeInternalReturnPath`) | Storage becomes SecureStore. Return paths become Expo Router paths |

### 11.4 What must change inside `api.ts` to run on React Native

| Web dependency in the client | Where | Mobile replacement |
|---|---|---|
| `localStorage` for `auth_token`, `token` (two keys), `activeCompanyId` | `getAuthHeaders` (`api.ts:2229`), login and signup methods, 7 places that write the token | Injected `TokenStore` and `WorkspaceStore` (async, SecureStore) |
| `import.meta.env.VITE_API_BASE_URL`, `VITE_MCP_SERVER_URL` | `api.ts:2070` | Injected base URL from `EXPO_PUBLIC_*` config |
| `window.dispatchEvent(new CustomEvent("workspace:suspended" …))` on 423, 400, 403 | `request()` `api.ts:2313-2349` | Injected event emitter or callbacks |
| `File` objects in `FormData` | `uploadTaskAttachments`, `addTaskComment`, project and workspace logos, drive upload, assistance requests | RN form-data parts `{ uri, name, type }` |
| Blob downloads (`_fetchBlob`, `URL.createObjectURL`, `<a download>`) | downloads, previews, CV, workspace exports (`api.ts:5354-5363`) | `expo-file-system` download with headers, then share or open |
| `fetch` with `Response.json()` | everywhere | Works on RN as is |
| 29 `/admin/*` methods | `api.ts` | Drop |
| Support-agent and ElevenLabs session methods | `api.ts` | Drop |
| Three broken methods (§1.3 item 5) | `updateTaskProgress`, `previewTaskAttachment`, `getWebSocketToken` | Do not port |
| `rememberVerificationProof` import | signup methods | Move to the mobile auth module |

**Observation.** All authentication is by `Authorization: Bearer` header. There are no cookies for auth (the only `document.cookie` use is the unused shadcn sidebar component, and the maintenance check sends `credentials: "omit"`). That is the single most helpful fact for a native client: nothing depends on browser cookie behaviour.

### 11.5 Class 3 and 4: what has to be rebuilt

| Area | Finding | Mobile consequence |
|---|---|---|
| UI components | 49 shadcn/Radix files in `components/ui`, plus the app components, all built from HTML elements and Tailwind `className` (231 files in total) | Rebuild as native components. Radix has no React Native version |
| Routing | `react-router-dom` imported in 92 non-test files (`useNavigate`, `Link`, `useParams`, `useMatch`, `BrowserRouter`) | Expo Router |
| Styling | Tailwind and CSS variables | NativeWind with shared tokens, or `StyleSheet` |
| Forms | Controlled inputs per page. `react-hook-form` and `zod` are installed but unused | New form layer. No existing validation schemas to reuse. Hand-written rules exist, for example password rules in `lib/emailVerification.ts` and `lib/orgActivation.ts` |
| Charts | `recharts` present in the dependencies, **not used by any page** | Nothing to port. Mobile uses progress bars and number tiles (Phase 3 can add `react-native-svg` charts if wanted) |
| Calendar | Custom `MonthView`, `WeekView`, `DayView` plus `react-big-calendar` helpers | Rebuild as a month strip and agenda list. Reuse `calendarStatus.ts` and `services/calendarService.ts` (25 lines, pure) |
| Drag and drop | `@dnd-kit` is installed and unused. Kanban moves tasks with a status change | Use status pickers or long-press move |
| File preview | `mammoth` + `DOMPurify` for DOCX, `read-excel-file` for XLSX, `<iframe>` in `FileViewer.tsx` and `AttachmentPreview.tsx`, blob URLs | Not portable. Use the system viewer or "Open in…" |
| Google Picker | `useGooglePicker.ts` injects `https://apis.google.com/js/api.js` and needs a browser API key | Not portable. Use the server-side connected-storage API |
| Turnstile | `TurnstileWidget.tsx` injects the Cloudflare script into `document.head` | WebView widget, or a different control (D-03) |
| Support launcher | `SupportLauncher`, `useSupportAgent` (text conversation over a signed WebSocket URL) | Not carried in the first phases |
| Toasts, tooltips, hover cards, resizable panels, command palette (`cmdk`), carousel (`embla`), OTP input | Web interaction patterns | Replace with native equivalents or drop |
| Theme | `document.documentElement.classList` and `localStorage` | `Appearance` and a stored preference |
| Local preferences | `use-local-preferences.ts` (`localStorage`) | AsyncStorage. Not synced across devices today |
| Sentry | `@sentry/react` | `@sentry/react-native` |
| Responsive hooks | `use-breakpoint`, `use-viewport-width`, `use-mobile` (window width, `matchMedia`) | Not needed |

### 11.6 Browser dependency counts

Static scan of the 328 non-test source files (`src/test` excluded). Counts are matches, not unique files.

| Dependency | Matches | Files | Mobile handling |
|---|---|---|---|
| `localStorage` | 103 | 26 | Secure storage for credentials. AsyncStorage or MMKV for preferences |
| `sessionStorage` | 34 | 10 | In-memory state or SecureStore with a TTL (invite and return-path parking) |
| `window.location` or `window.history` | 51 | 21 | Router. External returns through deep links |
| `window.open` | 8 | 4 | `expo-web-browser` or `Linking.openURL` |
| `document.*` | 26 | 18 | None (DOM) |
| `window` event listeners and `CustomEvent` | 26 | 14 | App event emitter |
| `matchMedia`, `ResizeObserver`, `IntersectionObserver` | 7 | 5 | `Appearance`, layout events |
| `navigator.*` | 5 | 5 | `expo-clipboard`, share sheet |
| `URL.createObjectURL` | 6 | 5 | File system URIs |
| `new WebSocket` | 3 | 2 | RN has a built-in `WebSocket` |
| HTML element types (`HTML…Element`) | 129 | 38 | None |
| `import.meta.env` | 20 | 10 | `process.env.EXPO_PUBLIC_*` |
| `className=` | 8,045 | 231 | Rewrite |
| Browser cookies (auth) | none | none | Not applicable |
| Browser OAuth redirects | `window.location.href = authUrl` in `GoogleAuthButton.tsx` and `Integrations.tsx` | 2 | Auth session through the system browser |

### 11.7 Copy first or extract a package?

| Option | Pros | Cons | Maintenance implication |
|---|---|---|---|
| **A. Copy a slimmed snapshot into the mobile repo** | Fast. No change to the web build. Mobile can drop the 29 admin methods and the three broken calls on day one | Types and endpoints drift from the backend and the web over time | Needs an automatic drift check (below) |
| **B. Shared private package** (a new `admiino-shared` repo, published to GitHub Packages or a private registry) | One source of truth for types and endpoint definitions | The web `api.ts` is a 5,400-line class with browser calls inside. Extraction means refactoring and re-testing production code, and the web repo's rules require care when changing behaviour | Needs versioning, a release process, and agreement from the web team |
| **C. Generate a client from OpenAPI** | Backend becomes the source of truth | The backend has `swagger-jsdoc` with 182 `@swagger` blocks against about 685 route registrations (about 27%), and the docs are only mounted outside production (`app.js:140`). Coverage is too low today | A longer-term goal. Needs the backend team to complete the annotations |

**Recommendation: A now, B after the mobile endpoint set stabilises (end of Phase 1), C as a backend initiative.**

For A, put the copied code in one folder (`src/api/`) with these rules: it contains no mobile UI code, it exports the same type names as the web, and it has a header comment with the web commit it came from. Add a CI job that fetches the web `api.ts` at a pinned commit and fails if the **interfaces** the mobile app uses differ. A small script comparing exported interface names and field names is enough. Avoid depending on the web repo at build time.

### 11.8 Authentication and session reuse

| Web behaviour | Verdict for mobile |
|---|---|
| One bearer token, stored in `localStorage` | Keep the bearer model. Move to `expo-secure-store` (Keychain and Keystore). Do not use AsyncStorage for the token |
| Token key duplicated as `auth_token` and `token` | Store once |
| Admin account rejected after login | Keep. Also the server should not issue a user-portal session to admin accounts (check, §12.4) |
| `activeCompanyId` in `localStorage` | Keep the idea. Store in non-sensitive storage |
| Query cache is memory-only by design, to keep sensitive responses off disk (`lib/queryClient.ts`) | The mobile offline decision has to respect this rule (D-10) |
| Logout: clear token, active workspace, workspace cache, query cache | Same, plus unregister the device push token |

### 11.9 Test infrastructure

| Item | Finding | Mobile consequence |
|---|---|---|
| Runner | Vitest 4 with `happy-dom` and Testing Library. 111 test files. Not run in this audit | Jest with `jest-expo` and React Native Testing Library. Vitest tests do not transfer |
| What is covered | Task list paging, comment delivery and acknowledgement, WebSocket reconnect, permissions, team counts, dashboard consistency, calendar behaviour, workspace lifecycle, security-oriented tests (`phase2-security`, `phase3-files`), onboarding and deep-link return (`auth-deep-link-return`) | Good source of **test cases and fixtures** for the pure logic being ported. Tests of pure helpers (`lib/*.test.ts`, 4 files) can move with their code |
| Component tests | Depend on DOM rendering | Not reusable |
| Gaps | No end-to-end tests. No contract tests against the backend. No mobile-style integration tests | Add Maestro flows and contract tests (§13) |

---

## 12. Backend API and Integration Assessment

### 12.1 Method and scope

1. All client endpoints in `lib/api.ts` were extracted by script: **347 calls** from about 353 methods.
2. Backend route registrations were parsed from `src/routes/*.js` and the mounts in `routes/index.js` and `app.js`: **685 registrations**.
3. Each client call was matched to the backend by HTTP method and path pattern.
4. The 24 calls that did not match were checked by hand.

This confirms that a route exists. It does **not** confirm request or response shapes, status codes, permission rules or behaviour in production. Schema-level verification of every mobile endpoint is a task for the contract tests proposed in §13.

### 12.2 Result

| Outcome | Count | Detail |
|---|---|---|
| Matched by method and path | **323** | |
| Unmatched, route exists (parser limits: query strings, template literals, routers mounted outside `routes/`) | 14 | `org-activation` activate and accept, automations enable and disable, client-view requests, drive and task attachment download (in `downloadRoutes.js`), MCP OAuth user routes (`mcp/oauthRouter.js`), `/projects` list, dependency candidates, time-tracking entries and summary |
| Unmatched, provider-generic client over Google-only backend | 2 | `GET /integrations/:provider/connect`, `POST /integrations/:provider/disconnect`. The backend implements `/integrations/google/*` only. The UI supports Google and WhatsApp (`SUPPORTED_INTEGRATION_IDS`) |
| Unmatched, stale `/admin/*` paths | 5 | Client uses `/admin/companies/…`. Backend uses `/admin/workspaces/…`. Not called by user-portal pages |
| **Unmatched, route does not exist** | **3** | `PATCH /workflow/:id/progress` (backend is `/task-workflow/:id/progress`), `GET /tasks/:id/attachments/:aid/preview`, `GET /auth/websocket-token` |

### 12.3 API dependency inventory

"Auth" says what the call needs. **B** = bearer token. **W** = the `x-company-id` workspace header. "Change?" says whether the backend appears to need a change for the mobile plan.

| # | Feature | Endpoints | Auth | Web usage | Expected mobile usage | Known limitations | Verification still needed | Change? |
|---|---|---|---|---|---|---|---|---|
| 1 | Sign in | `POST /auth/login`, `GET /auth/me`, `GET /me/workspaces`, `GET /auth/workspaces` | none / B | `AuthContext` | Same | Single JWT, `JWT_EXPIRES_IN` (default `"1d"`). Login rate-limited (`loginLimiter`) | Deployed token lifetime. Does login return a token for `accountType: admin`? (web discards it) | **Yes, B-01** |
| 2 | Token refresh | none | n/a | none | Needed | Does not exist for user sessions | n/a | **Yes, B-01** |
| 3 | Registration and verification | `POST /auth/signup`, `/auth/resend-verification`, `/auth/verify-email/inspect`, `/auth/verify-email/complete`, `GET /verify-email/:token` | none | `Signup`, `VerifyEmailSetup` | Same | Turnstile required and fails closed. Per-IP and per-email limiters, in memory per instance | Email link target. Response when unverified user logs in | **Yes, B-04, B-05** |
| 4 | Password reset | `POST /auth/forgot-password`, `POST /auth/reset-password/:token` | none | Pages unreachable on web | Same | Email link is `${appOrigin()}/reset-password/:token` (`utils/emailService.js:94`) | Does the web page work once routed? | B-05 (link) |
| 5 | Google sign-in | `GET /auth/google`, callback redirect | none | `GoogleAuthButton` | Native session | JWT is returned in a redirect URL query to the web origin. State is held in an in-memory map (10 min) | Google Cloud OAuth client types and allowed redirect URIs | **Yes, B-03** |
| 6 | Workspaces, membership, roles | `GET /me/workspaces`, `POST /companies`, `GET/PATCH /companies/active`, `POST /company/join/resolve`, `POST /company/join/requests`, `GET /companies/join/requests/mine`, `PATCH /companies/join/requests/:id`, `GET /access-requests/me/effective-permissions`, `GET /company/:id/settings`, `POST /workspaces/:id/leave`, `GET /workspaces/suspended` | B (+W except `/me/*`) | `AuthContext`, onboarding, settings | Same | Roles `owner`, `admin`, `manager`, `member`, `guest`. 423 for suspended | Shape of `effective-permissions` for guests and external viewers | No |
| 7 | Invitations | `GET /invites/:token`, `POST /invites/:token/accept`, `/reject`, `POST /auth/signup-with-invite`, `POST /companies/:id/invites`, `/auth/org-activation/*`, `/projects/invites/:token/*` | none or B | `Invite`, `OrgInvitationFlow`, `ProjectInvite` | Same | Links point at the web origin. Activation secrets in URL fragments. `requireOnboardingEnabled` gate | Feature flag state in production | B-05 |
| 8 | Profile | `PATCH /profile/update`, `POST /profile/upload-picture`, `GET /profile/onboarding-status`, `PATCH /profile/onboarding`, `/profile/me/*`, `GET /profile/users/:id`, CV PDF | B (+W for update) | `Profile`, modals | Basic profile in MVP | Picture: 5 MB image limit. HEIC rejected | Allowed image types for pictures | B-06 (HEIC, optional) |
| 9 | Tasks | `GET /tasks` (`scope`: `workspace`, `all_workspaces`, `assigned_all`, `assigned_workspace`; `relation`), `GET /tasks/my/summary`, `POST /tasks` (multipart), `GET/PATCH/DELETE /tasks/:id`, subtasks, dependencies, recurrence, watchers, activity, custom fields | B + W (some scopes without W) | `AllTasks`, `TaskDetails`, dashboards | Core | `GET /tasks/my/summary` and `scope=assigned_workspace` are the canonical "My Tasks" (`docs/my-tasks-and-assignees.md`). Warnings returned in the response body on dependency conflicts | Who may change status. Pagination and `total` semantics. Status values are fixed at six | No |
| 10 | Comments and attachments | `GET/POST /task-comments/task/:id/comments`, `PUT/DELETE /task-comments/:id`, `GET /tasks/:id/attachments/:aid/download`, `DELETE /task-attachments/:id`, multipart on `PATCH /tasks/:id` | B + W | `TaskDetails`, `Teams`, `useTaskComments` | Core | 20 MB per file, 20 files per request, task upload limit 10. Allowed types exclude HEIC and video. Preview route missing | Idempotency for retries (`clientMessageId` supported for comments) | B-06 (HEIC), optional preview route |
| 11 | Projects | `/projects*`: list, create, update, delete, `/tasks`, `/members`, `/members/direct`, `/members/emails`, `/checklists`, `/invites`, `/settings`, `/logo`, `/custom-fields` | B + W | `Projects`, `ProjectDetails` | MVP read, Phase 2 manage | Project roles `owner`, `admin`, `member`, `viewer`. Policy gates on creation | Visible project set per role (`view_all_projects`) | No |
| 12 | Teams | `/team/teams*` (list, create, update, delete, `/workspace`, `/messages`, `/lead`, `/members`, `/eligible-members`), `/team/members*`, `/team/team_members`, `/team/pending-verifications`, verify, reject, remove, restore | B + W | `Teams`, `TeamManagement`, `TeamDirectory` | Phase 2 | Response shapes have legacy fallbacks (`data.members`, `team_members`, `team`) | Current canonical shapes | No |
| 13 | Calendar | `GET /calendar/events` | B + W | `Calendar` | Phase 2 | Task deadlines only | Event cap and range limits | No |
| 14 | Drive and connected storage | `/drive/*`, `/google-drive/*`, `/connected-storage/*`, `/integrations/google/*` | B + W | `Drive` and pickers | Phase 2 and 3 | Google Picker needs a browser. Server-side browsing exists for Dropbox | Google Drive routes for server-side listing (`/integrations/google/files`) | No |
| 15 | Notifications | `GET /notifications`, `/unread-count`, `PATCH /:id/read`, `/read-all`, `DELETE /:id`, `GET/PATCH /notification-preferences` | B + W | `NotificationsContext` | Core | Delivery channels are `whatsapp` and `email` only. Unread count is workspace-scoped (route runs `setActiveWorkspace`) | Cross-workspace unread total | **Yes, B-02** |
| 16 | Push | none | n/a | none | Core to the case for a native app | Nothing exists: no token model, no sender, no channel | n/a | **Yes, B-02** |
| 17 | WebSocket | `wss://<origin>/ws?token=<JWT>` (handshake in `src/app.js:343-420`) | JWT in query string | `lib/websocket.ts` | Foreground only | Verified (backend source): close code 1008 on a missing or bad token, an inactive or unverified user, or **when the token's `exp` passes while connected ("Session expired")**; 4429 when the user already has 20 open connections; 1013 on infrastructure trouble; 5-second authentication timeout. Server-side ping/pong liveness. Task rooms carry the workspace id and are revoked when membership ends or the workspace is suspended. The token appears in the URL | Whether the token in the URL is logged by the host or proxy | Optional, B-07. B-01 also matters here, because the socket dies at token expiry |
| 18 | Time tracking | `/time-tracking/entries`, `/timer/*`, `/summary` | B + W | `TimeTracking`, timer | Phase 2 | Feature flag `timeTrackingEnabled` | | No |
| 19 | Search | `GET /global-search` | B + W | `GlobalSearch` | MVP | | Result types and limits | No |
| 20 | Sharing and client access | `/client-view/*`, `/external-shares/*`, `/external-portal/*` | B + W, public tokens | `SharedWithMe`, `ClientView` | Phase 2 for shared-with-me | Public links stay web | | No |
| 21 | Integrations and WhatsApp | `/integrations*`, `/integrations/whatsapp/*` | B | `Integrations`, `WhatsAppSettings` | Phase 2 status view | Connect flows are browser redirects | | B-03 (return link) |
| 22 | AI and support | `/support/*`, `/harmony/ai-summary/*`, MCP `/oauth/user/*` | B | `SupportLauncher`, `Harmony` | Support tickets Phase 2. Harmony Phase 3 | AI answers come from the backend | | No |
| 23 | Account deletion | none found | n/a | none | **Required by store policy if the app lets people create accounts** | No self-service delete route for users | | **Yes, B-08** |

### 12.4 Backend changes the plan depends on

None of these has been made. They are requests for the backend owner.

| ID | Change | Needed for | Priority | Notes |
|---|---|---|---|---|
| **B-01** | Refresh-token (or sliding long-lived device session) for user logins: a refresh endpoint, rotation, revocation on logout and password change, and a device-session list | Phase 1 | **Blocker** | A 1-day access token forces a daily sign-in. The existing MCP OAuth service already has refresh-token code (`mcp/oauthService.js`) that can be studied |
| **B-02** | Push notifications: a device-token model and register/unregister endpoints, a `push` delivery channel in `NotificationDelivery` with a worker, a push column in `UserNotificationPreference`, workspace id and route data in the payload, and a cross-workspace unread total | Phase 1 (core value) | **Blocker for push** | Extends the existing outbox. `NotificationDelivery.channel` validation is `["whatsapp","email"]` today |
| **B-03** | Mobile Google sign-in: either a redirect target the app owns (and a Google OAuth client and redirect URI for it) or a native flow that exchanges a Google ID token for an Admiino session. Same for integration connect flows. The JWT should not be returned in a URL query | Phase 1 | High | Today the callback uses `FRONTEND_URL` |
| **B-04** | Signup protection that works without the Turnstile web widget: for example a mobile attestation (App Attest, Play Integrity) or a documented Turnstile-in-WebView setup | Phase 1 if native signup ships | High | Fails closed today (`turnstileService.js`) |
| **B-05** | Email links that open the app: web-origin links with verified Universal and App Links are enough, which means hosting `apple-app-site-association` and `assetlinks.json` on the web domain. The web host is Vercel with an every-path rewrite to `index.html`, so confirm files under `/.well-known/` are served as static files | Phase 1 | High | A web-deployment task. No backend code change is needed if the origin is kept |
| **B-06** | Accept HEIC/HEIF uploads or require clients to convert. The recommendation is client conversion (cheaper, no server change) | Phase 1 | Medium | `ALLOWED_MIME_TYPES` has no HEIC |
| **B-07** | Optional hardening: accept the WebSocket token in the first message or a subprotocol header instead of the query string | Later | Low | Matches how the web connects today. A URL token can reach logs |
| **B-08** | Self-service account deletion (and workspace-ownership transfer rules) | Phase 1 if in-app signup ships | High | App Store policy. Confirm against the current guidelines before submission |
| **B-09** | Missing routes the web already calls: `GET /tasks/:id/attachments/:aid/preview`, `PATCH /workflow/:id/progress` (or fix the client), `GET /auth/websocket-token` (or remove the client method) | Web health | Medium | Also improves mobile reliability |

### 12.5 Mobile-specific technical requirements

Confirmed means checked in the code. Assumption means it follows from the design but was not tested.

| Requirement | Confirmed | Assumption / to test |
|---|---|---|
| **Secure credential storage** | The web stores one bearer token. Nothing server-side blocks a native client | Keychain and Keystore through SecureStore |
| **CORS** | The backend accepts requests with no `Origin` header (`config/cors.js:11`), which is how native HTTP clients behave. Allowed request headers include `Authorization` and `x-company-id`, and `Idempotency-Key` is allowed | React Native `fetch` does not send an `Origin` header on either platform (to confirm in a device test) |
| **Google and other OAuth redirects** | Redirect goes to `FRONTEND_URL` with the JWT in the query string | Needs B-03 |
| **Deep links and invitations** | Invite, project invite, verification and reset links are built from the web origin. Activation and verification secrets live in the URL fragment | Fragment survives Universal and App Links on both platforms (to test). Needs B-05 |
| **File selection, upload** | 20 MB per file, 20 per request, a closed allow-list of types. Multipart with `files` | HEIC to JPEG conversion on device. Large camera photos should be resized to stay well under 20 MB |
| **Download and preview** | Download route `GET /tasks/:id/attachments/:aid/download` and `/drive/files/:id/download` require the bearer header | Use file-system download with headers, then open with the system viewer |
| **Push and device tokens** | Nothing server-side | B-02 |
| **Foreground and background WebSocket** | Reconnect with backoff exists in the web code. Server closes on bad token (1008) and caps 20 connections per user | iOS suspends sockets in the background. Close on background, reconnect and refetch on foreground. Push covers the gap |
| **Network interruption** | `NetworkError` handling, retry only on 502/503/504, `refetchOnReconnect` | Add NetInfo and request timeouts. `fetch` has no default timeout |
| **Workspace isolation** | Server checks membership per request. WebSocket rooms are tagged with the workspace and revoked on removal or suspension | Clear workspace-scoped caches on switch, on removal and on logout |
| **Permissions and protected routes** | Server-side checks exist. The web mixes legacy and workspace roles | Mobile gates by effective permissions and `task.access`, never by `user.role` |
| **Camera, media, documents** | None used on the web | `expo-image-picker`, `expo-document-picker`. Camera and photo-library usage strings required |
| **Offline** | The web cache is memory-only by policy | Decision D-10 |
| **Rate limiting** | Per-IP limiters on login, signup and recovery. In-memory per instance | Mobile networks share IPs (carrier NAT). Test that normal users are not throttled |
| **Android and iOS constraints** | n/a | Notification channels (Android 13+ runtime permission), iOS notification permission prompt, background fetch limits, iOS file-size and memory limits, Play and App Store review items (account deletion, login options, data-safety and privacy forms) |

---

## 13. Recommended Mobile Technology Stack

### 13.1 Summary

| Area | Recommendation | Alternative considered |
|---|---|---|
| Framework | **Expo (React Native), TypeScript strict, development builds, EAS** | Bare React Native. Only if a native module blocks Expo |
| Navigation | **Expo Router** | React Navigation (used underneath by Expo Router) |
| Server state | **TanStack Query v5** | RTK Query, SWR |
| App state | **Zustand** (session, active workspace, permissions, UI flags) | React Context (as on the web) |
| Secure storage | **expo-secure-store** | `react-native-keychain` |
| Local cache (Phase 2) | **MMKV** with an encryption key held in SecureStore | AsyncStorage |
| Forms | **react-hook-form + zod** | Hand-rolled (as on the web) |
| Styling | **NativeWind** with a shared tokens file | `StyleSheet` with a theme provider, Unistyles |
| UI building blocks | Own components over `Pressable`, `@gorhom/bottom-sheet`, `@shopify/flash-list`, `react-native-reanimated`, `react-native-gesture-handler`, `expo-haptics` | A full UI kit (Tamagui, React Native Paper) |
| Icons | **lucide-react-native** | |
| Dates | **date-fns** | |
| Push | **expo-notifications** with FCM and APNs credentials through EAS | Direct native SDKs |
| Files | `expo-image-picker`, `expo-document-picker`, `expo-image-manipulator`, `expo-file-system`, `expo-sharing`, `expo-image` | |
| Auth browser flows | `expo-web-browser` (system auth session) and `expo-linking` | `expo-auth-session` |
| Biometric lock | `expo-local-authentication` | |
| Realtime | React Native `WebSocket` with ported protocol code, `@react-native-community/netinfo`, `AppState` | |
| Monitoring | `@sentry/react-native` (same Sentry organisation as web) | |
| Tests | Jest (`jest-expo`) + React Native Testing Library, MSW, **Maestro** for end-to-end | Detox |
| CI/CD | GitHub Actions + **EAS Build, Submit, Update** | Fastlane |

Pin exact versions when the repository is created, using the Expo SDK that is current at that time. No versions are recommended here, to avoid advice that is already out of date.

### 13.2 Choices explained

| # | Choice | Why it fits Admiino | Relevant existing dependency | Constraints and risks | Backend change? |
|---|---|---|---|---|---|
| 1 | **Expo with development builds** | Admiino's needs (push, camera, files, deep links, secure storage, biometric) are all covered by maintained Expo modules. EAS removes local Xcode/Gradle work for most of the team. Config plugins allow native additions later without ejecting | None. The web is not React Native | Expo Go cannot test push or custom schemes, so use development builds from day one. iOS builds need an Apple Developer account and certificates | No |
| 2 | **TypeScript, strict** | The web is TypeScript and the shared types are the main reuse asset | `typescript` 5.8 on web | The web has `any` in many places (`getUserById: any`, `getTeamMembers: any` in `api.ts`). Do not copy those | No |
| 3 | **Expo Router** | Admiino's web routes are paths (`/task-details/:id`, `/projects/:id`). Expo Router maps file paths to those, makes deep links and push taps routable by default, and supports typed routes. Tabs, stacks and modals are first-class | `react-router-dom` on web (concepts transfer) | Newer than React Navigation. Fragments (`#token=`) need explicit handling | No |
| 4 | **TanStack Query v5** | The web already uses it, with tuned retry and `staleTime` defaults, query keys and fetchers that can be reused | `@tanstack/react-query` 5.83 | Persistence is a separate decision (D-10). Mutation queues for offline need care | No |
| 5 | **Zustand for app state** | The web's three contexts (Auth, WebSocket, Notifications) re-render widely. A small store gives selective subscriptions | Web contexts (logic reused, shape not) | Another dependency. Keep stores small | No |
| 6 | **SecureStore for the session** | Matches the web rule "never store tokens insecurely" (`AGENTS.md`). JWT size is small | `localStorage` on web (replaced) | Value-size limits on some platforms. A token of a few hundred bytes is fine. Check any larger blobs (do not store caches here) | No |
| 7 | **react-hook-form + zod** | Mobile forms (create task, sign up, profile) need field-level validation and keyboard handling. Both libraries are already installed in the web `package.json`, though unused | Installed, unused on web | New validation rules must match the backend. The backend remains the authority | No |
| 8 | **NativeWind + tokens** | Keeps Tailwind-style class names and token names that web developers already use, and makes dark mode a token swap | Tailwind 3 and shadcn tokens | NativeWind depends on Reanimated and a Babel/Metro setup. Some web utility classes do not exist. If it causes trouble, fall back to `StyleSheet` with the same tokens file (the tokens file is the real asset) | No |
| 9 | **Own components, bottom sheets, FlashList** | The web UI kit (Radix) cannot be used. Lists are long and mixed (tasks, notifications), so virtualisation matters | `lucide-react`, `vaul` (drawer idea) | Bottom-sheet and gesture libraries need Reanimated. Keep one sheet implementation | No |
| 10 | **Push with expo-notifications** | One API for FCM and APNs. Works with EAS credentials. Local and remote handling, categories and tap routing through Expo Router | None. The notification link mapper is reused | Android 13+ runtime permission, notification channels, iOS provisional or explicit prompt. Needs the server work in B-02 | **Yes (B-02)** |
| 11 | **File stack** | Camera, library, documents, resize and HEIC-to-JPEG conversion, authenticated download, share sheet | Backend upload limits and allow-list | HEIC is not allowed by the backend. Large images must be resized. Office preview is not portable. Use "Open in…" | Optional (B-06) |
| 12 | **System-browser auth sessions** | Google sign-in and integration connections are redirect flows today. A system auth session is the secure, store-approved way | `GoogleAuthButton`, `Integrations` | The redirect must come back to the app (B-03). Google may require specific client types per platform | **Yes (B-03)** |
| 13 | **Ported WebSocket client** | The protocol (rooms, acks, backoff, de-duplication) is already correct and tested on the web | `lib/websocket.ts`, `test/websocket-reconnect-and-ack.test.ts`, `test/backend-websocket.test.ts` | Foreground only. iOS closes background sockets. Token in the URL | Optional (B-07) |
| 14 | **Sentry for React Native** | Same product, same error taxonomy, same organisation | `@sentry/react` | Source-map and symbol upload in EAS builds | No |
| 15 | **Jest + RNTL + Maestro** | Unit tests for ported logic, component tests, and flows that mirror the journeys in §7.4 | Vitest fixtures from `src/test/fixtures` can seed mock data | Maestro needs a test workspace and test accounts. The web remediation notes that no authorised test account existed for a live smoke test, so this must be arranged with the backend owner | No |
| 16 | **GitHub Actions + EAS** | Same branch discipline as the web (feature branches from `staging`, approved dual-remote staging publication) | `scripts/build-environment.mjs` pattern | Reproduce the web rule that staging builds cannot use production hosts: validate `EXPO_PUBLIC_API_BASE_URL` against the build profile in CI | No |
| 17 | **Store release process** | Standard Apple and Google flows. TestFlight and Play internal testing | n/a | Needs: Apple Developer and Google Play accounts, bundle and package ids, privacy labels and data-safety forms, review notes with a demo account, account-deletion path (B-08), a login-options review for third-party sign-in on iOS. Check current store guidelines at submission time | **Yes (B-08)** |

### 13.3 Environments and configuration

| Item | Rule |
|---|---|
| API base URL | `EXPO_PUBLIC_API_BASE_URL`, required, validated at build. No default pointing at production |
| Environment names | `development`, `staging`, `production`, matching the web |
| Secrets | None in the app bundle. Google client ids and Sentry DSN are public identifiers. No backend keys |
| Staging data | Staging builds point at the staging API only. Production builds point at production only. A CI check enforces this, mirroring `scripts/build-environment.mjs` |
| Feature flags | Read the governance capability endpoint (`GET /workspace/governance/capabilities`) to hide features the workspace disabled (Drive, Dropbox, automations, time tracking) |

---

## 14. Proposed React Native Repository Structure

Nothing has been created. This is a proposal for the new mobile repository (name suggestion: `admiino-mobile`).

```
admiino-mobile/
├── app/                          # Expo Router (file = route)
│   ├── _layout.tsx               # providers: Query, Auth bootstrap, theme, Sentry, WebSocket
│   ├── index.tsx                 # redirect by session state
│   ├── (auth)/
│   │   ├── sign-in.tsx           # A01
│   │   ├── create-account.tsx    # A02
│   │   ├── verify-email.tsx      # A03
│   │   ├── forgot-password.tsx   # A04
│   │   ├── reset-password.tsx    # A05
│   │   ├── invite.tsx            # A06
│   │   ├── activate.tsx          # A07 (Phase 2)
│   │   └── workspace-setup.tsx   # A08
│   ├── (tabs)/
│   │   ├── _layout.tsx           # 5-tab bar, badge from inbox store
│   │   ├── home/index.tsx        # H01
│   │   ├── tasks/index.tsx       # T01
│   │   ├── tasks/[id]/index.tsx          # T02
│   │   ├── tasks/[id]/conversation.tsx   # T03
│   │   ├── projects/index.tsx    # P01
│   │   ├── projects/[id].tsx     # P02
│   │   ├── inbox/index.tsx       # N01
│   │   └── more/index.tsx        # S01
│   ├── (modals)/
│   │   ├── task-create.tsx       # T04
│   │   ├── task-edit.tsx         # T05
│   │   ├── search.tsx            # H03
│   │   ├── file-viewer.tsx       # F03
│   │   └── notification-primer.tsx # A10
│   ├── workspace-suspended.tsx   # A09
│   └── +not-found.tsx            # A12
├── src/
│   ├── api/                      # copied and slimmed from the web client (§11.7)
│   │   ├── types/                # interfaces
│   │   ├── client.ts             # request(), injected token and workspace stores
│   │   ├── endpoints/            # tasks.ts, projects.ts, notifications.ts …
│   │   └── transport/            # multipart and download adapters for RN
│   ├── auth/                     # session store, secure storage, refresh (B-01), OAuth
│   ├── workspace/                # active workspace, effective permissions, switcher
│   ├── realtime/                 # WebSocket service, cache sync, AppState/NetInfo
│   ├── notifications/            # push registration, tap routing, link mapper
│   ├── features/                 # tasks/, projects/, inbox/, home/, teams/ …
│   │   └── tasks/{hooks,components,utils}
│   ├── ui/                       # design system: Button, Card, Chip, Sheet, Row, Empty, Skeleton
│   ├── theme/                    # tokens.ts, light/dark, status and priority maps
│   ├── lib/                      # ported pure helpers (taskListUtils, calendarStatus …)
│   ├── config/                   # env validation, feature flags
│   └── test/                     # fixtures (seeded from web), msw handlers, test utils
├── e2e/                          # Maestro flows mirroring §7.4 journeys
├── scripts/                      # contract-drift check, env validation
├── docs/                         # decisions, store checklists
├── app.config.ts                 # bundle ids, schemes, associated domains, plugins
├── eas.json                      # development, staging, production profiles
├── .github/workflows/            # lint, typecheck, test, EAS build
├── tsconfig.json                 # strict, path aliases
└── AGENTS.md                     # rules for AI-assisted work, mirroring the Admiino guides
```

**Conventions to carry over from the Admiino engineering guides:** the client contains no business rules; permissions come from the server; workspace isolation is preserved on every cache key; no secrets or tokens in logs; every fix has a regression test; branches start from `staging`.

---
## 15. MVP and Phased Development Roadmap

The roadmap uses sizes (Low, Medium, High complexity) and dependencies, not calendar dates. Dates depend on team size, backend capacity and the decisions in §16.3. Nothing here has been estimated in hours.

### 15.0 Before Phase 1 starts (pre-work)

| # | Item | Why |
|---|---|---|
| 1 | Close the **blocking decisions** D-01, D-02, D-03, D-04 (§16.3) | They change the backend scope and the auth screens |
| 2 | Schedule backend items **B-01, B-02, B-03, B-05** (and B-04, B-08 if native signup ships) | Phase 1 cannot meet its acceptance criteria without them |
| 3 | Fix or confirm the web defects: forgot/reset/verify routes, the missing attachment-preview and `workflow` routes | The mobile recovery and attachment paths mirror them |
| 4 | Create a **staging workspace with test accounts** for owner, admin, manager, member, guest and a Team Lead, and a staging API | Needed for contract tests and Maestro. The web remediation notes that no authorised live test account existed |
| 5 | Open Apple Developer and Google Play accounts, reserve bundle and package ids, host `apple-app-site-association` and `assetlinks.json` | Lead times are outside engineering control |
| 6 | Run six **technical spikes** (§17.2) | They retire the biggest unknowns cheaply |
| 7 | Low-fidelity flows reviewed by product, then high-fidelity design for the 25 MVP screens | The audit stops at written wireframes |

### 15.1 Phase 1: Mobile Foundation and MVP

**Goal.** A user can sign in, stay signed in, see what needs their attention, work on tasks, discuss them, review them, and get a push notification, on iOS and Android, in any workspace role.

| | |
|---|---|
| **Features** | **Foundation:** Expo project, environments, CI, tokens and base UI kit, Sentry, session handling, workspace context with effective permissions, API layer copied and slimmed with the drift check. **Authentication and onboarding:** sign in, Google sign-in, create account (per D-03), verify email, forgot and reset password, accept workspace invitation, join by code or create a workspace, suspended-workspace screen, error states. **Home:** role-adaptive overview. **Tasks:** list with scopes, filters and presets; detail; create; edit; status change; assign; subtasks (view and complete); attachments (view, upload from camera, library, files); conversation with live updates in the foreground; review approve and send back. **Projects:** list; detail with overview, tasks and members (read-only); add a task to a project. **Inbox:** list, mark read, delete, tap routing, push registration and receipt, preferences. **Search.** **More:** my profile (name, photo), settings (appearance, default tab, biometric lock, about, legal, sign out), workspace switcher |
| **Screens (25)** | A01, A02, A03, A04, A05, A06, A08, A09, A10, A12 · H01, H03 · T01, T02, T03, T04, T05 · P01, P02 · F03 · N01, N02 · S01, S02, S04 |
| **Technical dependencies** | Expo and EAS accounts; development builds; secure storage; push credentials (APNs key, FCM); Universal and App Links; WebSocket service port; NetInfo and AppState handling; Sentry; the staging test workspace |
| **Backend requirements** | **B-01** refresh/long session. **B-02** push. **B-03** Google redirect or token exchange. **B-05** link hosting. If native signup ships: **B-04**, **B-08**. Recommended: **B-06** (or client conversion), **B-09** |
| **Complexity** | **High.** Three parts are individually hard: session and push (backend dependent), realtime on a mobile lifecycle, and role-adaptive UI built on effective permissions |
| **Key risks** | Backend items slip, so push or refresh is missing at launch. Turnstile blocks native signup. Fragment-carrying links fail on one platform. Store review asks for account deletion or login-option changes. Permission gaps show controls that fail. Workspace-switch cache leaks. Carrier NAT trips IP rate limits |
| **Out of this phase** | Offline writes, calendar, Teams, Drive, Time, project editing, admin screens, Harmony, any Phase 2 and 3 item |

**Acceptance criteria for Phase 1** (each is testable):

| # | Criterion |
|---|---|
| 1 | A new user can create an account (or be invited), verify the email, join or create a workspace, and reach Home, on a physical iPhone and a physical Android phone |
| 2 | After sign-in the session survives app restarts and phone reboots for the agreed lifetime (D-02) without asking for the password. Sign out and password change end it |
| 3 | Two test accounts can complete this path: create a task, assign it, comment in real time, submit for review, approve. Each step shows in the other account's UI and as a push notification |
| 4 | For each of owner, admin, manager, member and guest, an automated test confirms that only permitted controls appear, and that the server's 403 produces a clear message without a crash |
| 5 | Switching workspace shows no task, project or notification from the previous workspace (automated test with two workspaces) |
| 6 | Tapping a push notification opens the right screen from a killed, backgrounded and foreground app state, including a task in another workspace (with the switch prompt) |
| 7 | Invite, verification and reset links open the app from the common mail apps on both platforms. If the app is not installed, the web page opens |
| 8 | Photos from the iPhone camera upload as JPEG. PDFs and images download and open. A file over the limit or of a blocked type shows a clear message |
| 9 | Airplane mode shows an offline banner, keeps typed drafts, and recovers on reconnect with a refetch. No crash |
| 10 | Dynamic Type at the largest setting and Android font scale 200% do not hide primary actions. Screen-reader labels exist on every interactive element. Touch targets meet 44 pt and 48 dp |
| 11 | The 500-task fixture from the web remediation scrolls smoothly on a mid-range Android reference device. The reference device and the cold-start target are agreed before build starts |
| 12 | No token, password or message content appears in logs or Sentry events. Logout clears caches and unregisters the push token |
| 13 | Builds are accepted by TestFlight and Play internal testing. Store privacy answers match the data actually collected |
| 14 | Unit tests cover the ported logic. Maestro covers the five journeys: sign-in, task create and assign, comment, review, notification tap |
| 15 | Contract tests pass against staging for every endpoint the 25 screens use |

### 15.2 Phase 2: Functional Expansion

**Goal.** Cover the weekly-use features that were deliberately left out of the MVP, and make the app work through poor connectivity.

| | |
|---|---|
| **Features** | **Planning:** calendar (month strip and agenda), board view, subtask detail. **People and teams:** teams list and detail with chat, people directory, member profile, approvals queue (join requests, pending verifications, permission requests). **Projects:** create and edit, members, checklists. **Files:** Drive, folder view, Shared with me, shared resource. **Time:** timer and entries. **Account:** organisation activation, project invitations, workspace overview and invite code, integrations status, help and support tickets. **Data:** read-only custom fields on tasks and projects, recurrence, dependencies and watchers shown read-only. **Resilience:** encrypted on-device cache for reads (D-10), offline queue for creating tasks and comments, background upload |
| **Screens (20)** | A07, A11 · T06 · P03, P04, P05 · M01, M02, M04, M05, M06 · C01 · F01, F02, F04, F05 · S05, S06, S09 · TM01 |
| **Technical dependencies** | Persistence layer with encryption; mutation queue with idempotency; background upload; cross-workspace notification count; calendar and agenda components |
| **Backend requirements** | Cross-workspace unread and notification feed (finish B-02 scope). Idempotency keys on task create (`Idempotency-Key` is already an allowed header, but support per route is Unverified). Confirm the canonical shapes of the team endpoints (legacy fallbacks exist) |
| **Complexity** | **Medium to High.** Offline writes and conflict handling are the hardest part |
| **Key risks** | Duplicate tasks from retried creates. Stale cache shown as truth. Security review of local storage. Feature flags (`timeTrackingEnabled`, Drive) hiding screens unexpectedly |

**Acceptance criteria:** (1) A task created offline is created once after reconnecting, and the user sees its state meanwhile. (2) Cached lists load with no network, are labelled as cached, and are wiped on logout, workspace removal and account switch. (3) Calendar, Teams and Drive screens respect permissions and governance flags. (4) Owner and admin can clear a week's approvals from the phone. (5) Accessibility, performance and test criteria from Phase 1 hold for the new screens.

### 15.3 Phase 3: Advanced Capabilities

| | |
|---|---|
| **Features** | **Administration (read-first):** workspace members administration, team management, client access approvals, activity log, subscription summary, trash. **Insight:** workspace insights, project portfolio and health, workload. **Other modules:** Hire Talent, Harmony, templates, professional profile, storage browser (Dropbox and Google through the server-side API). **Platform:** tablet layouts, home-screen widgets, local deadline reminders, in-app account deletion UI polish, optional server-synced preferences |
| **Screens (14)** | H02 · P06, P07 · M03, M07, M08, M09 · F06, F07, F08 · S03, S07, S08 · HM01 |
| **Technical dependencies** | Charting or compact visualisation components; larger-form patterns; widget extensions |
| **Backend requirements** | Mostly none. Preferences sync would need a small endpoint. Confirm role gates for insights and workload (Unverified today) |
| **Complexity** | **Medium.** Many screens, but each reuses patterns from earlier phases |
| **Key risks** | Admin actions are higher risk on a phone (mistaken role changes, deletions). Require confirmations and the same server checks. Low usage may not justify some of these |

**Acceptance criteria:** Each screen is built only after usage data from Phase 2 shows demand. Destructive actions need a confirmation sheet and are covered by tests that the server denies unauthorised roles.

### 15.4 Recommended exclusions

| Exclusion | Reason |
|---|---|
| Admin portal functions, platform administration | Out of scope for a user companion. `admiino-admin` serves them |
| Governance, automations builder, custom-field management, audit exports | Dense configuration and file exports suit a desktop. Mobile shows the results, not the settings |
| Client View and External Portal | Public pages for people without the app. They stay web |
| MCP authorisation and connections | Developer-facing |
| AI Hub | Placeholder with no content |
| AI support agent (voice and text assistant) | Depends on an external web SDK session. Support tickets and help links cover the need |
| Legacy role-specific signups, legacy `/team_members` | Superseded |
| Google Picker | Needs a browser API key. Use the server-side connected-storage API instead |
| Office document preview in the app | The web does it with browser-only libraries. Use Open in… |
| Product tour | Replaced by contextual empty states and three coaching cards |
| Landing page content | Marketing site, not an app feature |

---

## 16. Risks, Gaps and Open Decisions

### 16.1 Ranked risks and gaps

Severity: **Critical** = the plan cannot meet Phase 1 without a fix. **High** = likely to delay or break a core flow. **Medium** = manageable with planning. **Low** = worth tracking.

| ID | Severity | Issue | Evidence | Impact on the roadmap | Mitigation |
|---|---|---|---|---|---|
| R-01 | **Critical** | No refresh token. A 1-day access token (default). The WebSocket also closes when the token expires | `middleware/auth.js:94-95`, `app.js:411` | Users sign in daily. Realtime drops. Blocks the "stay signed in" promise | B-01, decision D-02 |
| R-02 | **Critical** | No push infrastructure. Delivery channels are email and WhatsApp only | `NotificationDelivery.js:9`. No device-token code found | The main reason for a native app is missing server-side | B-02, decision D-01 |
| R-03 | **Critical** | Google sign-in returns the JWT in a web redirect URL | `authController.js:1347-1357` | Google login does not work natively without change | B-03, decision D-04 |
| R-04 | **High** | Public signup requires a Turnstile token and fails closed | `signupProtection.js`, `turnstileService.js` | Native account creation blocked | D-03, B-04 |
| R-05 | **High** | Role handling mismatch. The web gates by legacy `user.role` (almost always `executive`), and the workspace role and permissions are the real authority | `ProtectedRoute.tsx`, `TaskDetails.tsx:1733`, `models/User.js:67` | Copying web checks would show controls to the wrong people or hide them from the right ones | Drive all gating from effective permissions and `task.access`. Add the role test matrix (acceptance #4) |
| R-06 | **High** | Who may approve a task is not enforced anywhere found in the files read | `taskDomainService.js`, `taskController.updateTask` | Review journey may let any editor complete a task | Ask the backend owner. Add a server rule and a test before shipping Approve |
| R-07 | **High** | Web password reset and verify-token routes render the login form | `App.tsx:142-144`, commit `8108749` | Users who forget a password may have no working recovery link on the web. Mobile A04 and A05 depend on the reset email link target | Confirm in a browser. Fix the routes. Decide the link target (B-05) |
| R-08 | **High** | Three client calls hit backend routes that do not exist | `api.ts` `updateTaskProgress`, `previewTaskAttachment`, `getWebSocketToken` | Copying the client brings broken calls | Do not port them. Fix or remove in web (B-09) |
| R-09 | **High** | Email links point at the web origin, and no `apple-app-site-association` or `assetlinks.json` is served | `authController.js:703`, `emailService.js:94`, `public/` has neither file | Invite, verify and reset links will not open the app | B-05, with a spike on fragment handling |
| R-10 | **High** | HEIC and video are not allowed uploads | `fileUploadSecurity.js:101-139` | iPhone camera photos fail unless converted on the device | Convert to JPEG on device. Resize |
| R-11 | **High** | Store policy items: account deletion if accounts can be created in the app, and review of third-party login options | No self-service delete route found | Review rejection risk | B-08. Check the current guidelines at submission |
| R-12 | **Medium** | Offline data policy conflicts with the web rule of a memory-only cache | `lib/queryClient.ts` header comment, `AGENTS.md` ("never store tokens insecurely, never sensitive info locally") | Offline reading is a Phase 2 selling point and needs a security decision | D-10. Encrypted store, wipe rules, security review |
| R-13 | **Medium** | `api.ts` is one 5,400-line class with browser calls inside | `lib/api.ts` | Extraction is not trivial. Drift risk if copied | Copy first, drift check, extract later (§11.7) |
| R-14 | **Medium** | Manager dashboard computes stats in the browser from one page of tasks | `DashboardManager.tsx:105` | Inconsistent numbers if copied | Use `/tasks/my/summary` and `/dashboard/executive` |
| R-15 | **Medium** | Rate limiting is per IP and held in memory per instance. Carrier NAT shares IPs | `signupProtection.js` header comment, `loginLimiter` | Legitimate mobile users may be throttled. Limits also differ by instance | Test on mobile networks. Ask the backend owner whether keys can include device or account |
| R-16 | **Medium** | Google OAuth state is held in an in-memory map | `authController.js:27,1256` | Flow breaks if more than one backend instance serves a user's two requests | Confirm the instance count. Move to a shared store if scaled (B-03) |
| R-17 | **Medium** | No contract tests and no end-to-end tests exist. 111 web tests cover logic and components only | `src/test` | Backend changes can break mobile silently | Contract tests against staging. Maestro journeys |
| R-18 | **Medium** | No authorised live test account existed for the web remediation | `docs/responsive-remediation/README.md` | Blocks realistic E2E and review demo accounts | Pre-work item 4 |
| R-19 | **Medium** | Notification routing and unread count are workspace-scoped | `notificationRoutes` uses `setActiveWorkspace`. `notificationLink.ts` | Pushes for other workspaces and a mixed inbox need server support | B-02 payload and cross-workspace count. D-12 |
| R-20 | **Medium** | Realtime on a mobile lifecycle: sockets suspended in background, 20 connections per user cap | `connectionRegistry.js:15` | Missed live updates. Reconnect storms with many devices | Foreground only, refetch on resume, push for background |
| R-21 | **Medium** | The review workflow has no "returned" state and no feedback object | `TASK_STATUSES` has six values | "Send back" is a status change with a comment, which is weaker than a formal return | D-07 |
| R-22 | **Medium** | Status colours differ between screens (`in_review` amber vs violet) | `Board.tsx:25`, `TaskDetails.tsx:982` | Inconsistent meaning on mobile | One token map |
| R-23 | **Medium** | Navigation complexity: role-adaptive content, per-workspace permissions and governance flags can hide features | `canPerformRoleOperation`, governance capabilities | Many states to test | Central permission hook. Matrix tests |
| R-24 | **Low** | Web preferences (theme, default landing page) live in `localStorage` and do not sync | `use-local-preferences.ts` | Settings differ between web and mobile | Accept for now. Sync later |
| R-25 | **Low** | WebSocket token travels in the URL | `app.js:355-357` | May appear in infrastructure logs | B-07 |
| R-26 | **Low** | English only. No i18n library is installed | `package.json` | None now. Expensive later | D-11 |
| R-27 | **Low** | Dark-theme contrast failures remain on Board and Calendar on the web | `docs/responsive-remediation/README.md` | Not a mobile issue, but do not copy their colours | Use the tokens, which meet AA |
| R-28 | **Low** | The 29 `/admin/*` client methods use stale paths and are unused | §12.2 | Dead code if copied | Drop |

### 16.2 Incomplete or unverified web workflows

| Item | Why it matters for mobile |
|---|---|
| Password reset on the web (route defect) | Mobile recovery links |
| Attachment preview on the web | Mobile viewer design |
| Inline status change for non-privileged users | Mobile status control |
| Task approval authority | Review journey |
| `team` plan purchase | Create-workspace screen |
| AI Hub | Excluded |
| Platform-admin organisation onboarding | Org activation links on mobile |
| Hire Talent fulfilment | Phase 3 screen |
| WhatsApp assistant flows | Overlap with push (both are notification channels) |

### 16.3 Decisions required

| ID | Decision | Options | Recommendation | Needed by |
|---|---|---|---|---|
| **D-01** | Is push notification a launch requirement? | Yes (build B-02 first) / No (launch with in-app inbox, add later) | **Yes.** It is the main reason for a native app | Before Phase 1 |
| **D-02** | Session policy | Refresh token with rotation and device list / long-lived access token / keep 1 day and re-prompt with biometrics | **Refresh token with rotation, a sliding window set by the owner (for example 30 days), and revocation on password change.** Biometric unlock sits on top | Before Phase 1 |
| **D-03** | Native account creation | (a) Native form with Turnstile in a WebView / (b) Open the web signup in the in-app browser / (c) Mobile attestation (B-04) | **(b) for the first release**, so the Turnstile rules stay in one place. Revisit (c) after launch | Before Phase 1 |
| **D-04** | Google sign-in approach | System browser flow with an app redirect / native Google SDK with ID-token exchange | System browser flow if B-03 is small. Native SDK gives a better experience but needs a new endpoint. Also check Apple's login-option rules | Before Phase 1 |
| **D-05** | Which workspace roles get the app | All, with guests read-only / owners and managers only | **All roles.** Content follows permissions | Before design |
| **D-06** | Is a user with several workspaces shown one combined inbox or the active workspace only? | Combined / Active only | **Combined** with a workspace tag on each item | With B-02 |
| **D-07** | Add a formal "changes requested" state to the review workflow? | Yes (backend and web change) / No ("Send back" = in progress + comment) | **No for MVP.** Revisit after usage data | Before Phase 1 acceptance |
| **D-08** | Workspace creation on mobile | Full (plan choice) / Free plan only / Hand off to web | **Free plan only**, with a note that plan changes happen on the web | Before design |
| **D-09** | Keep the "gender" onboarding question? | Keep / Drop / Move into profile | **Drop from onboarding.** Make it an optional profile field. Review for privacy | Before design |
| **D-10** | Offline policy | Memory only (as web) / Encrypted read cache / Read cache and write queue | **Memory only in Phase 1. Encrypted read cache and a write queue in Phase 2**, after a security review | Before Phase 2 |
| **D-11** | Languages | English only / Add i18n from the start | **Structure strings for i18n from day one, ship English** | Before build |
| **D-12** | Push content on the lock screen | Full task title / Generic text / User setting | **User setting, default generic on the lock screen** | With B-02 |
| **D-13** | Ownership of web defects (reset routes, missing endpoints) and of backend items B-01 to B-09 | Name an owner for each | Needed to plan the sequence | Before Phase 1 |
| **D-14** | App identity | App name, bundle and package ids, support contact, legal links, who owns the store accounts | Product and legal | Before first build |

---

## 17. Final Recommendations and Next Steps

### 17.1 What the mobile app should contain

1. **Build a native Expo app** as a **companion to the signed-in User Portal**. It is not a port. Reuse types, endpoint knowledge and about two dozen helpers. Rebuild all UI.
2. **Navigation:** five bottom tabs, **Home, Tasks, Projects, Inbox, More**. Calendar is a view of Tasks. Teams, Drive, Time and administration are in More.
3. **MVP scope: 25 screens.** Authentication and onboarding (10), Home and Search (2), Tasks (5), Projects (2), File viewer (1), Inbox and notification settings (2), More, My profile and Settings (3). **Phase 2 adds 20. Phase 3 adds 14.** In total 59.
4. **Gate everything by effective permissions and per-task access**, never by the web's legacy role.
5. **Treat these backend items as prerequisites:** refresh sessions (B-01), push (B-02), Google redirect (B-03), link hosting (B-05).
6. **Do not inherit** the web's three broken calls, the browser-only features (Google Picker, Office preview, Turnstile widget, AI support agent), or the client-side manager statistics.
7. **Copy first, extract later:** a slimmed API folder with a drift check now. A shared package after the endpoint set settles.

### 17.2 Spikes to run before committing to dates

| # | Spike | Question answered |
|---|---|---|
| 1 | Universal and App Links with a `#token=` fragment on iOS and Android, from Gmail, Outlook, Apple Mail and WhatsApp | Do activation and verification links survive? |
| 2 | Push round trip with a stub endpoint and EAS credentials | What payload and token model does B-02 need? |
| 3 | WebSocket on a mobile lifecycle: background, resume, airplane mode, token expiry | What reconnect and refetch rules do we need? |
| 4 | Camera, HEIC conversion, resize, multipart upload to staging | Do real photos pass the 20 MB and type rules? |
| 5 | Turnstile in a WebView (hostname rules) versus hand-off | Which option for D-03? |
| 6 | NativeWind with FlashList and bottom sheets on a mid-range Android phone with the 500-task fixture | Is the styling choice fast enough? |

### 17.3 First vertical slice

Build a thin end-to-end path first: **sign in → workspace → Tasks list → Task detail → conversation**, with contract tests, Sentry, a development build on both platforms, and CI. Everything else attaches to that spine.

### 17.4 Next steps in order

1. Product owner answers D-01 to D-04 and D-13.
2. Backend owner sizes B-01, B-02, B-03, B-05 and confirms the unverified items in §7.6 and §12.
3. Web team confirms and fixes the reset-route defect and the two missing routes.
4. Create the staging workspace and test accounts. Open the store accounts.
5. Run the six spikes.
6. Design: review the wireframes in §10, then produce high-fidelity designs for the 25 MVP screens using the shared tokens.
7. Create the repository (§14) and build the first slice.

### 17.5 What this audit did not verify

| Not done | Consequence |
|---|---|
| The web app was not run | Every "works" statement is based on source reading |
| Web and backend tests were not executed | Test health is unknown |
| No live API call was made | Production behaviour is inferred. Deployed values (`JWT_EXPIRES_IN`, `FRONTEND_URL`, feature flags, instance count) are unknown |
| Request and response schemas were not compared field by field | Contract tests must do this |
| `admiino-admin`, `Admiino-Landing-Page` and the WhatsApp services were not audited | Their flows are marked Unverified |
| Store guidelines were not re-checked against current text | Confirm at submission |
| Production was not touched, and no file other than this report was created or changed | |

### 17.6 Evidence and method

| Item | Detail |
|---|---|
| Routes | `src/App.tsx` (72 `<Route>` entries), `useMatch` patterns in `pages/Teams.tsx` |
| Orphan pages | Script checking whether any non-test file imports each file in `src/pages` |
| Endpoints | Script extracting `request`/`get`/`fetch` paths from `lib/api.ts`, matched to `src/routes/*.js` with mounts from `routes/index.js` and `app.js`. Manual check of the 24 unmatched |
| Browser dependencies | Pattern counts over the 328 non-test source files |
| Reuse classes | Static scan of `lib/`, `hooks/`, `services/`, `types/`, `contexts/` for DOM, React, storage, router and `import.meta` references, then reading of the main files |
| Backend facts | `middleware/auth.js`, `config/cors.js`, `app.js` (WebSocket handshake), `websocket/connectionRegistry.js`, `authController.js`, `signupProtection.js`, `turnstileService.js`, `fileUploadSecurity.js`, `multerMemory.js`, `taskDomainService.js`, `workspaceRolePermissions.js`, `workspaceEffectivePermissions.js`, `NotificationDelivery.js`, `docs/my-tasks-and-assignees.md`, `docs/notification-event-inventory.md` |
| Stale file | `admiino-backend/routes-summary.json` (6 Aug 2026) was not relied on |
