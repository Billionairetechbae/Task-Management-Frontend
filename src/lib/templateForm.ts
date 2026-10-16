import type {
  ProjectTemplateBody, ProjectTemplateTaskNode, TaskTemplateBody, TemplateAssigneeConfig, TemplateRecurrenceConfig, TemplateSubtaskNode, TemplateTaskFields,
} from "@/lib/api";
import type { RepeatPreset } from "@/lib/recurrenceForm";

/** Pure helpers behind the template editor / use flow. The backend validator is authoritative; these only shape the form. */

export const newIdempotencyKey = (): string =>
  (globalThis.crypto && "randomUUID" in globalThis.crypto ? (globalThis.crypto as Crypto).randomUUID() : `use-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`);

export const MANAGER_ROLES = ["owner", "admin", "manager"];
export const canManageTemplates = (workspaceRole?: string | null, userRole?: string | null): boolean =>
  MANAGER_ROLES.includes(workspaceRole || "") || workspaceRole === "platform_admin" || userRole === "admin";

export const blankAssignee = (): TemplateAssigneeConfig => ({ mode: "none" });

export function blankTaskFields(title = ""): TemplateTaskFields {
  return { title, description: null, priority: "medium", category: null, estimatedHours: null, dueOffsetDays: null, localTime: null, assignee: blankAssignee() };
}

export const blankTaskBody = (): TaskTemplateBody => ({
  schemaVersion: 1,
  task: { ...blankTaskFields(), team: { mode: "none" }, recurrence: null, subtasks: [] },
});

export const blankProjectBody = (): ProjectTemplateBody => ({
  schemaVersion: 1,
  project: { name: "", description: null, color: null, visibility: "private", team: { mode: "none" }, lead: { mode: "none" }, members: [] },
  tasks: [],
});

/** A readable, unique local key (lowercase letters, numbers, - and _ ; max 40) for a new task node. */
export function uniqueKey(existing: string[], base = "task"): string {
  const taken = new Set(existing);
  for (let i = 1; i < 1000; i++) {
    const key = `${base}-${i}`;
    if (!taken.has(key)) return key;
  }
  return `${base}-${Date.now().toString(36)}`;
}

export function moveItem<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/** "Day +5 at 09:00", "Day +5 (time chosen when used)", or "No due date". Never an implicit time. */
export function offsetLabel(node: Pick<TemplateTaskFields, "dueOffsetDays" | "localTime">): string {
  if (node.dueOffsetDays === null || node.dueOffsetDays === undefined) return "No due date";
  const day = node.dueOffsetDays === 0 ? "Start day" : `Day +${node.dueOffsetDays}`;
  return node.localTime ? `${day} at ${node.localTime}` : `${day} (time chosen when used)`;
}

/** True when using the template must ask for a default due time (some dated node has no time of its own). */
export const needsDefaultDueTime = (nodes: Pick<TemplateTaskFields, "dueOffsetDays" | "localTime">[]): boolean =>
  nodes.some((n) => n.dueOffsetDays !== null && n.dueOffsetDays !== undefined && !n.localTime);

export const hasAnyOffset = (nodes: Pick<TemplateTaskFields, "dueOffsetDays">[]): boolean => nodes.some((n) => n.dueOffsetDays !== null && n.dueOffsetDays !== undefined);

/** All nodes of a template body in creation order (parents before their subtasks). */
export function bodyNodes(body: TaskTemplateBody | ProjectTemplateBody): (TemplateTaskFields & { key: string })[] {
  if ("task" in body) return [{ ...body.task, key: "root" }, ...body.task.subtasks];
  return body.tasks;
}

/** Keys a project-template task may list as predecessors: not itself, not its parent/subtask, nothing that already depends on it. */
export function dependencyChoices(tasks: ProjectTemplateTaskNode[], key: string): ProjectTemplateTaskNode[] {
  const self = tasks.find((t) => t.key === key);
  if (!self) return [];
  const dependsOnMe = new Set<string>();
  let changed = true;
  while (changed) {
    changed = false;
    for (const t of tasks) {
      if (dependsOnMe.has(t.key)) continue;
      if (t.dependsOn.includes(key) || t.dependsOn.some((d) => dependsOnMe.has(d))) { dependsOnMe.add(t.key); changed = true; }
    }
  }
  return tasks.filter((t) => t.key !== key && !dependsOnMe.has(t.key) && t.key !== self.parentKey && t.parentKey !== key);
}

/** Removing a task also removes it from every other task's dependsOn and drops its subtasks. */
export function removeProjectTask(tasks: ProjectTemplateTaskNode[], key: string): ProjectTemplateTaskNode[] {
  const gone = new Set([key, ...tasks.filter((t) => t.parentKey === key).map((t) => t.key)]);
  return tasks.filter((t) => !gone.has(t.key)).map((t) => ({ ...t, dependsOn: t.dependsOn.filter((d) => !gone.has(d)) }));
}

/* ------------------------------------------------------- recurrence presets */

export interface TemplateRepeatState { enabled: boolean; preset: RepeatPreset; interval: number; weekdays: number[]; monthDay: number; limit: boolean; maxOccurrences: number }

export const blankRepeat = (): TemplateRepeatState => ({ enabled: false, preset: "weekly", interval: 1, weekdays: [1], monthDay: 1, limit: false, maxOccurrences: 4 });

export function repeatFromConfig(cfg?: TemplateRecurrenceConfig | null): TemplateRepeatState {
  if (!cfg) return blankRepeat();
  const wd = cfg.byWeekday ?? [];
  let preset: RepeatPreset = cfg.frequency;
  if (cfg.frequency === "weekly" && cfg.interval === 1 && wd.length === 5 && [1, 2, 3, 4, 5].every((d) => wd.includes(d))) preset = "weekdays";
  else if (cfg.frequency === "monthly" && cfg.interval === 3) preset = "quarterly";
  return {
    enabled: true, preset, interval: preset === "weekdays" || preset === "quarterly" ? 1 : cfg.interval, weekdays: wd.length ? wd : [1],
    monthDay: cfg.byMonthDay ?? 1, limit: cfg.maxOccurrences != null, maxOccurrences: cfg.maxOccurrences ?? 4,
  };
}

/** null when repeat is off or the form is incomplete (weekly with no weekday). */
export function configFromRepeat(state: TemplateRepeatState): TemplateRecurrenceConfig | null {
  if (!state.enabled) return null;
  const interval = Math.max(1, Math.min(99, Math.round(state.interval) || 1));
  const max = state.limit ? Math.max(1, Math.round(state.maxOccurrences) || 1) : null;
  switch (state.preset) {
    case "daily": return { frequency: "daily", interval, byWeekday: null, byMonthDay: null, maxOccurrences: max };
    case "weekdays": return { frequency: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5], byMonthDay: null, maxOccurrences: max };
    case "weekly": return state.weekdays.length ? { frequency: "weekly", interval, byWeekday: [...state.weekdays].sort((a, b) => a - b), byMonthDay: null, maxOccurrences: max } : null;
    case "monthly": return { frequency: "monthly", interval, byWeekday: null, byMonthDay: state.monthDay, maxOccurrences: max };
    case "quarterly": return { frequency: "monthly", interval: 3, byWeekday: null, byMonthDay: state.monthDay, maxOccurrences: max };
    case "yearly": return { frequency: "yearly", interval, byWeekday: null, byMonthDay: state.monthDay, maxOccurrences: max };
  }
}

/** Display date (local) for an ISO instant, as the rest of the app does. */
export const formatInstant = (iso?: string | null): string =>
  iso ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso)) : "No due date";

export const todayLocalDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const subtaskDefaults = (key: string): TemplateSubtaskNode => ({ key, ...blankTaskFields("") });
export const projectTaskDefaults = (key: string, position: number, parentKey: string | null = null): ProjectTemplateTaskNode => ({
  key, parentKey, position, ...blankTaskFields(""), team: { mode: parentKey ? "inherit" : "none" }, dependsOn: [],
});

/**
 * Where to go after a template was used. Task templates open the created root task on the canonical task-detail route
 * (the same one task cards use); project templates open the new project. `ok:false` means the result carried no id
 * (never expected): fall back to an existing page instead of an undefined route.
 */
export function templateDestination(type: "task" | "project", result: { projectId?: string | null; taskIds?: Record<string, string> | null }): { path: string; ok: boolean } {
  const id = type === "project" ? result.projectId : result.taskIds?.root;
  if (id) return { path: type === "project" ? `/projects/${id}` : `/task-details/${id}`, ok: true };
  return { path: type === "project" ? "/projects" : "/templates", ok: false };
}
