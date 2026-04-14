Good. The backend is now ready for a much better **user-facing task experience**.

For the user frontend, the next integration should focus on **Task Details, Task Edit Drawer, All Tasks, My Tasks, and Project Task views**.

Because you already added:

* subtasks
* task activity timeline
* task watchers
* enriched `GET /tasks/:id` response with:

  * `subtasks`
  * `activities` (recent summary)
  * `watcherCount`
  * `isWatching`
  * `recentWatchers`

So the frontend should now make tasks feel much more like a real work object.

# What you should integrate first

Use this order:

1. API/client updates
2. task types/interfaces
3. subtask UI
4. activity timeline UI
5. watcher UI
6. task detail page integration
7. task edit drawer integration
8. task lists/project task tabs refresh
9. polish states and interactions

Do **not** start by scattering these features everywhere.
Start from the **task detail experience**, then reuse outward.

---

# Master instruction for Copilot

Paste this first in the user frontend project:

```text id="8zjlwm"
You are integrating new task collaboration features into a React + TypeScript + Vite user-facing task management frontend.

Backend features already implemented:
- subtasks
- task activity timeline
- task watchers
- enriched task detail response with:
  - subtasks
  - recent activities
  - watcherCount
  - isWatching
  - recentWatchers

Important rules:
- Preserve the existing workspace-first behavior.
- Reuse existing API client, auth context, task components, drawers, pages, and design system.
- Do not break current task creation, task editing, task chat, notifications, or project workflows.
- Integrate new features in phases:
  1. API/types
  2. subtask UI
  3. activity timeline UI
  4. watcher UI
  5. task detail integration
  6. task drawer integration
  7. task list/project integrations
  8. UI polish
- Keep the design modern, clean, and consistent with the current app shell.
- Prefer reusable components over page-specific duplication.
- After each phase, summarize:
  - files changed
  - backend assumptions
  - unfinished work
```

---

# Phase 1: API and types integration

Use this first.

```text id="ctegbl"
Integrate the new task backend endpoints and response fields into the frontend API layer and TypeScript types.

Tasks:
1. Audit the current API layer and task-related types/interfaces/models.
2. Add support for these backend endpoints:
   - GET /tasks/:id/subtasks
   - POST /tasks/:id/subtasks
   - PATCH /tasks/:id/subtasks/:subtaskId
   - DELETE /tasks/:id/subtasks/:subtaskId
   - GET /tasks/:id/activity
   - GET /tasks/:id/watchers
   - POST /tasks/:id/watchers
   - DELETE /tasks/:id/watchers/:userId
   - POST /tasks/:id/watch
   - DELETE /tasks/:id/unwatch
3. Update task response types to support:
   - parentTask
   - parentTaskId
   - subtasks
   - activities
   - watcherCount
   - isWatching
   - recentWatchers
4. Create clean task-related types for:
   - TaskSubtask
   - TaskActivity
   - TaskWatcher
5. Keep backward compatibility with older task shapes where practical.
6. Return:
   - files changed
   - types added
   - API methods added
   - assumptions about response shape
```

---

# Phase 2: build reusable subtask components

This should come before page integration.

```text id="m8axcn"
Build reusable subtask UI components for the user-facing app.

Tasks:
1. Audit existing task-related components and identify the best place to add subtask UI.
2. Create reusable components such as:
   - SubtaskList
   - SubtaskItem
   - CreateSubtaskInput or CreateSubtaskDialog
   - optional SubtaskSection wrapper
3. Features required:
   - list subtasks
   - create a subtask
   - update subtask title
   - update subtask status
   - delete subtask
   - reorder support only if easy with current structure; otherwise leave TODO
4. Keep the UI simple and modern:
   - clear completion state
   - compact rows
   - inline edit or drawer/modal if consistent with current app
5. Respect workspace/task permissions based on existing user/task access patterns.
6. Show proper loading, empty, saving, and error states.
7. Return:
   - files created
   - reusable components built
   - where they should be integrated next
```

---

# Phase 3: build reusable activity timeline components

This should be a clean display component, not buried in the page.

```text id="gbz4cq"
Build reusable task activity timeline components for the user-facing app.

Tasks:
1. Create reusable activity UI components such as:
   - TaskActivityTimeline
   - TaskActivityItem
   - optional TaskActivitySummary
2. Integrate with:
   - GET /tasks/:id/activity for full timeline
   - task.activities for quick summary if already present in task detail
3. Support action types such as:
   - task_created
   - status_changed
   - priority_changed
   - deadline_changed
   - task_updated
   - assignee_added
   - assignee_removed
   - comment_added
   - attachment_added
   - attachment_removed
   - subtask_created
   - subtask_updated
   - subtask_deleted
4. Render readable messages using actionType plus oldValue/newValue/metadata.
5. Add icons/badges by action type where appropriate.
6. Keep the timeline visually clean and easy to scan.
7. Add loading, empty, and pagination/read-more support if practical.
8. Return:
   - files created
   - activity rendering strategy
   - any backend assumptions
```

---

# Phase 4: build reusable watcher UI

This should support both simple watch/unwatch and optional watcher list display.

```text id="zv9ja3"
Build reusable watcher UI components for the user-facing app.

Tasks:
1. Create reusable components such as:
   - TaskWatchButton
   - TaskWatcherAvatars
   - TaskWatcherList
   - optional TaskWatcherSection
2. Integrate with backend fields and endpoints:
   - watcherCount
   - isWatching
   - recentWatchers
   - GET /tasks/:id/watchers
   - POST /tasks/:id/watch
   - DELETE /tasks/:id/unwatch
3. For normal user-facing flows, prioritize:
   - simple watch/unwatch toggle
   - watcher count
   - recent watcher avatars
4. If there is a good place for advanced watcher management, support:
   - add watcher by user
   - remove watcher
   only if that fits current permissions and UI patterns
5. Show optimistic updates where safe.
6. Keep the UI lightweight and elegant.
7. Return:
   - files created
   - interaction patterns used
   - where watcher UI should be integrated next
```

---

# Phase 5: integrate into Task Details page

This is the most important phase.

```text id="i8wq0f"
Upgrade the main Task Details page to integrate subtasks, activity timeline, and watchers.

Tasks:
1. Audit src/pages/TaskDetails.tsx and related task detail components.
2. Refactor the page into clear sections such as:
   - Overview
   - Assignees / metadata
   - Watchers
   - Subtasks
   - Attachments
   - Comments / chat
   - Activity
3. Integrate:
   - subtask components
   - watcher components
   - activity timeline components
4. Use the enriched GET /tasks/:id response first where possible, then fetch full activity/watchers lazily if needed.
5. Keep the page modern and uncluttered:
   - clean section headers
   - clear spacing
   - responsive layout
   - right-side or lower activity section depending on current layout pattern
6. Preserve existing task chat/comments behavior.
7. Preserve existing attachment behavior.
8. Add loading skeletons and empty states.
9. Return:
   - files changed
   - new task detail structure
   - any opportunities for shared components
```

---

# Phase 6: integrate into Task Edit Drawer

You already have `TaskEditDrawer`. It should surface some of this too.

```text id="4xjlt7"
Upgrade the existing TaskEditDrawer to support the new backend task features where appropriate.

Tasks:
1. Audit src/components/dashboard/TaskEditDrawer.tsx.
2. Decide which new features belong in the drawer versus only the full task detail page.
3. Add lightweight support for:
   - subtask preview or quick subtask management
   - watcher count / watch toggle
   - recent activity preview
4. Do not overload the drawer; keep it useful and fast.
5. Prefer summary blocks and quick actions rather than a full heavy page clone.
6. Preserve all existing edit behavior.
7. Return:
   - files changed
   - what was added to the drawer
   - what remains task-detail-only
```

---

# Phase 7: integrate into All Tasks and Project task tabs

These list views should reflect the richer task model without becoming messy.

```text id="aj7arz"
Integrate the new task fields into list-based task views.

Targets:
- src/pages/AllTasks.tsx
- project task tabs/components
- any My Tasks view if present

Tasks:
1. Audit current task list/table/card views.
2. Add lightweight visibility of new task metadata such as:
   - subtask count
   - watcher count
   - parent task indicator for subtasks where appropriate
   - recent activity indicator or last activity date if practical
3. Add filters if practical for:
   - has subtasks
   - watched by me
4. Keep the list UI clean and not overloaded.
5. Add click-through into the upgraded Task Details experience.
6. Return:
   - files changed
   - list enhancements added
   - any deferred filters
```

---

# Phase 8: integrate into project details experience

Project task views should feel richer now.

```text id="zcq92r"
Upgrade the project task experience to reflect subtasks and task collaboration improvements.

Tasks:
1. Audit these project-related components:
   - ProjectTasksTab
   - ProjectOverviewTab
   - related project task components
2. Improve task cards/rows to show:
   - subtask progress or count
   - watcher count
   - stronger task quick-view behavior
3. Ensure opening a project task uses the upgraded task detail/drawer experience.
4. Keep project pages clean and collaboration-focused.
5. Return:
   - files changed
   - project task UX improvements
```

---

# Phase 9: create action-to-label mapping for activity types

This is a small but important quality step.

```text id="d3narp"
Create a centralized task activity presentation mapper for the frontend.

Tasks:
1. Build a utility that maps activity actionType to:
   - human-readable label
   - icon
   - optional color/badge style
2. Support all current backend action types:
   - task_created
   - status_changed
   - priority_changed
   - deadline_changed
   - task_updated
   - assignee_added
   - assignee_removed
   - comment_added
   - attachment_added
   - attachment_removed
   - subtask_created
   - subtask_updated
   - subtask_deleted
3. Make the mapper reusable by:
   - TaskActivityTimeline
   - notifications if useful later
   - task summary widgets
4. Return:
   - file created
   - mapping strategy
```

---

# Phase 10: upgrade task header/meta area

Your task header should now feel more premium.

```text id="nmzr9s"
Upgrade the task header / meta area in task details and task quick views.

Tasks:
1. Add a cleaner metadata area that can show:
   - status
   - priority
   - deadline
   - assignees
   - watcher count
   - watch/unwatch action
   - subtask count
2. Keep the design compact and modern.
3. Reuse existing badge/avatar/button components from the design system.
4. Return:
   - files changed
   - where the upgraded task header is used
```

---

# Phase 11: loading, empty, and optimistic states

This matters a lot for quality.

```text id="evd1vx"
Polish loading, empty, and optimistic UI states for the new task features.

Tasks:
1. Add proper loading states for:
   - subtasks
   - activity timeline
   - watchers
2. Add empty states for:
   - no subtasks
   - no activity yet
   - no watchers
3. Add optimistic behavior where safe for:
   - watch/unwatch
   - subtask create/update/delete
4. Ensure errors do not break the whole task page.
5. Keep state handling localized and clean.
6. Return:
   - files changed
   - state handling improvements
```

---

# Phase 12: make My Tasks feel smarter

If your My Tasks route exists, use the new features there too.

```text id="s0yc5h"
Upgrade My Tasks or user-focused task views to benefit from the new task features.

Tasks:
1. Audit whether a My Tasks page/view already exists.
2. Add small indicators for:
   - watched tasks
   - tasks with subtasks
   - active task activity
3. If practical, add quick filters:
   - watched by me
   - has subtasks
4. Keep the layout simple and productivity-focused.
5. Return:
   - files changed
   - My Tasks enhancements added
```

---

# Combined full integration prompt

If you want Copilot to execute this in sequence, use this combined prompt:

```text id="4roqsj"
Integrate the newly added backend task collaboration features into the user-facing frontend in this order:

1. update API layer and TypeScript task models
2. build reusable subtask components
3. build reusable task activity timeline components
4. build reusable watcher components
5. upgrade Task Details page
6. upgrade TaskEditDrawer
7. enhance All Tasks and Project task list views
8. improve Project task experience
9. add centralized activity action mapping
10. upgrade task header/meta area
11. polish loading, empty, and optimistic states
12. enhance My Tasks if present

Backend assumptions:
- GET /tasks/:id returns enriched task data with:
  - subtasks
  - activities
  - watcherCount
  - isWatching
  - recentWatchers
- New endpoints exist for:
  - subtasks
  - task activity
  - task watchers
  - watch/unwatch

Rules:
- Do not break existing task editing, comments/chat, attachments, notifications, or workspace-first behavior.
- Keep the UI modern, clean, and reusable.
- Prefer shared components over duplicated page logic.
- After each phase, summarize:
  - files changed
  - backend assumptions
  - unfinished work
```

---

# What I would tell Copilot specifically about your codebase

Since I already saw your structure earlier, this extra instruction will help:

```text id="jlwmvt"
Use these existing files as primary integration points:
- src/pages/TaskDetails.tsx
- src/components/dashboard/TaskEditDrawer.tsx
- src/pages/AllTasks.tsx
- src/components/dashboard/TaskComponents.tsx
- src/components/projects/ProjectTasksTab.tsx
- src/lib/api.ts
- src/contexts/AuthContext.tsx

Reuse existing UI primitives under src/components/ui where possible.
Do not create a second competing task detail pattern if one already exists; upgrade the current one.
```

---

# Best immediate starting batch

Tell Copilot to do these first:

1. API/types
2. subtask components
3. watcher components
4. activity timeline
5. task details page

That is the highest-value first block.

# My blunt recommendation

Do **not** start by putting subtasks, watchers, and activity into every list page.

First make **Task Details** excellent.
Then let the rest of the app inherit from that stronger task experience.

If you want, I can also write you a **screen-by-screen layout for the upgraded Task Details page** so Copilot has a precise UI target.
