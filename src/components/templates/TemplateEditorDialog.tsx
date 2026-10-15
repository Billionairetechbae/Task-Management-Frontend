import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import {
  api, ApiError, type ProjectTemplateBody, type ProjectTemplateTaskNode, type TaskTemplateBody, type TemplateAssigneeConfig, type TemplateAssigneeMode,
  type TemplateDetail, type TemplateIssue, type TemplateTaskFields, type TemplateType,
} from "@/lib/api";
import {
  blankProjectBody, blankTaskBody, configFromRepeat, dependencyChoices, moveItem, offsetLabel, projectTaskDefaults, removeProjectTask, repeatFromConfig, subtaskDefaults,
  uniqueKey, type TemplateRepeatState,
} from "@/lib/templateForm";
import { PRESET_LABELS, INTERVAL_UNIT, PRESETS_WITH_INTERVAL, WEEKDAY_NAMES, type RepeatPreset } from "@/lib/recurrenceForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

import { useWorkspaceLookups, type Member } from "./useWorkspaceLookups";

const field = "mt-1 w-full rounded-md border px-3 py-2 text-sm";
const ASSIGNEE_LABELS: Record<TemplateAssigneeMode, string> = {
  none: "Unassigned", instantiator: "Whoever uses the template", member: "A specific member", teamLead: "The team lead", projectLead: "The project lead",
};

/* ----------------------------------------------------------- shared pieces */

function AssigneeField({ value, onChange, modes, members, label }: { value: TemplateAssigneeConfig; onChange: (v: TemplateAssigneeConfig) => void; modes: TemplateAssigneeMode[]; members: Member[]; label: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      <label className="min-w-[10rem] flex-1 text-xs font-medium">Assignee
        <select aria-label={`${label} assignee`} className={field} value={value.mode}
          onChange={(e) => { const mode = e.target.value as TemplateAssigneeMode; onChange(mode === "member" ? { mode, userId: members[0]?.id } : { mode }); }}>
          {modes.map((m) => <option key={m} value={m}>{ASSIGNEE_LABELS[m]}</option>)}
        </select>
      </label>
      {value.mode === "member" && (
        <label className="min-w-[10rem] flex-1 text-xs font-medium">Member
          <select aria-label={`${label} member`} className={field} value={value.userId ?? ""} onChange={(e) => onChange({ mode: "member", userId: e.target.value })}>
            <option value="" disabled>Choose a member…</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </label>
      )}
    </div>
  );
}

function TaskFieldsForm({ value, onChange, label, members, modes }: { value: TemplateTaskFields; onChange: (patch: Partial<TemplateTaskFields>) => void; label: string; members: Member[]; modes: TemplateAssigneeMode[] }) {
  const dated = value.dueOffsetDays !== null && value.dueOffsetDays !== undefined;
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium">Title
        <input aria-label={`${label} title`} className={field} value={value.title} onChange={(e) => onChange({ title: e.target.value })} maxLength={200} />
      </label>
      <label className="block text-xs font-medium">Description
        <textarea aria-label={`${label} description`} className={field} rows={2} value={value.description ?? ""} onChange={(e) => onChange({ description: e.target.value || null })} />
      </label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <label className="text-xs font-medium">Priority
          <select aria-label={`${label} priority`} className={field} value={value.priority} onChange={(e) => onChange({ priority: e.target.value as TemplateTaskFields["priority"] })}>
            {["low", "medium", "high", "urgent"].map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium">Category
          <input aria-label={`${label} category`} className={field} value={value.category ?? ""} onChange={(e) => onChange({ category: e.target.value || null })} />
        </label>
        <label className="text-xs font-medium">Est. hours
          <input aria-label={`${label} hours`} type="number" min={0} step="0.5" className={field} value={value.estimatedHours ?? ""} onChange={(e) => onChange({ estimatedHours: e.target.value === "" ? null : Number(e.target.value) })} />
        </label>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-xs font-medium">
          <input aria-label={`${label} has due date`} type="checkbox" checked={dated} onChange={(e) => onChange(e.target.checked ? { dueOffsetDays: 0 } : { dueOffsetDays: null, localTime: null })} />
          Due date
        </label>
        {dated && (
          <>
            <label className="text-xs font-medium">Days after the start
              <input aria-label={`${label} due offset`} type="number" min={0} max={3650} className="mt-1 block w-24 rounded-md border px-2 py-1.5 text-sm" value={value.dueOffsetDays ?? 0} onChange={(e) => onChange({ dueOffsetDays: Math.max(0, Math.min(3650, Math.round(Number(e.target.value) || 0))) })} />
            </label>
            <label className="text-xs font-medium">Time (optional)
              <input aria-label={`${label} due time`} type="time" className="mt-1 block rounded-md border px-2 py-1.5 text-sm" value={value.localTime ?? ""} onChange={(e) => onChange({ localTime: e.target.value || null })} />
            </label>
            <span data-testid={`${label}-offset-label`} className="pb-2 text-xs text-muted-foreground">{offsetLabel(value)}</span>
          </>
        )}
      </div>
      <AssigneeField label={label} value={value.assignee} onChange={(assignee) => onChange({ assignee })} modes={modes} members={members} />
    </div>
  );
}

function RepeatFields({ state, onChange }: { state: TemplateRepeatState; onChange: (patch: Partial<TemplateRepeatState>) => void }) {
  return (
    <fieldset className="space-y-2 rounded-md border p-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <input aria-label="Repeat this task" type="checkbox" checked={state.enabled} onChange={(e) => onChange({ enabled: e.target.checked })} /> Repeat
      </label>
      {state.enabled && (
        <div className="space-y-2 text-sm">
          <p className="text-xs text-muted-foreground">The task created from this template becomes occurrence #1 of a recurring series. It needs a due date.</p>
          <label className="block text-xs font-medium">Repeat
            <select aria-label="Repeat frequency" className={field} value={state.preset} onChange={(e) => onChange({ preset: e.target.value as RepeatPreset })}>
              {(Object.keys(PRESET_LABELS) as RepeatPreset[]).map((p) => <option key={p} value={p}>{PRESET_LABELS[p]}</option>)}
            </select>
          </label>
          {PRESETS_WITH_INTERVAL.includes(state.preset) && (
            <label className="flex items-center gap-2 text-xs font-medium">Every
              <input aria-label="Repeat every" type="number" min={1} max={99} className="w-20 rounded-md border px-2 py-1.5 text-sm" value={state.interval} onChange={(e) => onChange({ interval: Number(e.target.value) })} />
              <span className="font-normal text-muted-foreground">{INTERVAL_UNIT[state.preset]}</span>
            </label>
          )}
          {state.preset === "weekly" && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Repeat on">
              {WEEKDAY_NAMES.map((name, day) => {
                const on = state.weekdays.includes(day);
                return <button key={name} type="button" aria-pressed={on} aria-label={`Repeat ${name}`} onClick={() => onChange({ weekdays: on ? state.weekdays.filter((d) => d !== day) : [...state.weekdays, day] })}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${on ? "border-indigo-600 bg-indigo-600 text-white" : "bg-white"}`}>{name}</button>;
              })}
            </div>
          )}
          {["monthly", "quarterly", "yearly"].includes(state.preset) && (
            <label className="block text-xs font-medium">On day
              <select aria-label="Repeat day of month" className={field} value={state.monthDay} onChange={(e) => onChange({ monthDay: Number(e.target.value) })}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}{d >= 29 ? " (last day in shorter months)" : ""}</option>)}
                <option value={-1}>Last day of the month</option>
              </select>
            </label>
          )}
          <label className="flex items-center gap-2 text-xs font-medium">
            <input aria-label="Limit occurrences" type="checkbox" checked={state.limit} onChange={(e) => onChange({ limit: e.target.checked })} /> Stop after
            <input aria-label="Total occurrences" type="number" min={1} disabled={!state.limit} className="w-20 rounded-md border px-2 py-1.5 text-sm" value={state.maxOccurrences} onChange={(e) => onChange({ maxOccurrences: Number(e.target.value) })} />
            occurrences in total (counting the first)
          </label>
        </div>
      )}
    </fieldset>
  );
}

/* ----------------------------------------------------------------- editor */

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; type: TemplateType;
  template?: TemplateDetail | null; onSaved: (template: TemplateDetail) => void;
};

export default function TemplateEditorDialog({ open, onOpenChange, type, template, onSaved }: Props) {
  const { toast } = useToast();
  const editing = Boolean(template);
  const { members, teams } = useWorkspaceLookups(open);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [taskBody, setTaskBody] = useState<TaskTemplateBody>(blankTaskBody());
  const [projectBody, setProjectBody] = useState<ProjectTemplateBody>(blankProjectBody());
  const [repeat, setRepeat] = useState<TemplateRepeatState>(repeatFromConfig(null));
  const [issues, setIssues] = useState<TemplateIssue[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIssues([]); setMessage(null);
    setName(template?.name ?? ""); setDescription(template?.description ?? ""); setCategory(template?.category ?? "");
    if (type === "task") {
      const body = (template?.body as TaskTemplateBody | undefined) ?? blankTaskBody();
      setTaskBody(structuredClone(body)); setRepeat(repeatFromConfig(body.task.recurrence));
    } else setProjectBody(structuredClone((template?.body as ProjectTemplateBody | undefined) ?? blankProjectBody()));
  }, [open, template, type]);

  const recurrenceConfig = useMemo(() => configFromRepeat(repeat), [repeat]);

  const buildBody = (): TaskTemplateBody | ProjectTemplateBody => {
    if (type === "task") return { ...taskBody, task: { ...taskBody.task, recurrence: recurrenceConfig } };
    return { ...projectBody, tasks: projectBody.tasks.map((t, i) => ({ ...t, position: i })) };
  };

  const save = async () => {
    setSaving(true); setIssues([]); setMessage(null);
    try {
      const body = buildBody();
      const res = editing
        ? await api.updateTemplate(template!.id, { expectedVersion: template!.currentVersion, name, description: description || null, category: category || null, body })
        : await api.createTemplate({ type, name, description: description || null, category: category || null, body });
      toast({ title: editing ? `Template saved as version ${res.data.template.currentVersion}` : "Template created" });
      onSaved(res.data.template); onOpenChange(false);
    } catch (error) {
      const api_ = error as ApiError;
      setIssues(api_.body?.errors ?? []);
      setMessage(api_.statusCode === 409 && api_.body?.code === "VERSION_CONFLICT"
        ? "This template was changed by someone else. Close this editor and reopen it to edit the latest version."
        : api_.message || "Couldn't save the template.");
    } finally { setSaving(false); }
  };

  /* project-template mutators */
  const setProjectTasks = (tasks: ProjectTemplateTaskNode[]) => setProjectBody((b) => ({ ...b, tasks }));
  const patchTask = (key: string, patch: Partial<ProjectTemplateTaskNode>) => setProjectTasks(projectBody.tasks.map((t) => (t.key === key ? { ...t, ...patch } : t)));
  const addProjectTask = (parentKey: string | null = null) => {
    const key = uniqueKey(projectBody.tasks.map((t) => t.key), parentKey ? "subtask" : "task");
    const tasks = [...projectBody.tasks];
    const at = parentKey ? tasks.reduce((last, t, i) => (t.key === parentKey || t.parentKey === parentKey ? i : last), -1) + 1 : tasks.length;
    tasks.splice(at, 0, projectTaskDefaults(key, at, parentKey));
    setProjectTasks(tasks);
  };
  const topLevel = projectBody.tasks.filter((t) => t.parentKey === null);
  const moveTop = (key: string, delta: number) => {
    const order = topLevel.map((t) => t.key);
    const from = order.indexOf(key);
    const next = moveItem(order, from, delta);
    if (next === order) return;
    setProjectTasks(next.flatMap((k) => projectBody.tasks.filter((t) => t.key === k || t.parentKey === k)));
  };
  const projectModes: TemplateAssigneeMode[] = ["none", "instantiator", "member", "teamLead", "projectLead"];
  const taskModes: TemplateAssigneeMode[] = ["none", "instantiator", "member", "teamLead"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${type} template` : `New ${type} template`}</DialogTitle>
          <DialogDescription>
            {editing ? `You are editing version ${template!.currentVersion}. Saving creates a new version; projects and tasks already created are not changed.` : "Templates are shared with the whole workspace."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium sm:col-span-2">Template name
              <input aria-label="Template name" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
            </label>
            <label className="block text-xs font-medium">Category (optional)
              <input aria-label="Template category" className={field} value={category} onChange={(e) => setCategory(e.target.value)} maxLength={100} />
            </label>
            <label className="block text-xs font-medium">Description (optional)
              <input aria-label="Template description" className={field} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
            </label>
          </div>

          {type === "task" ? (
            <section aria-label="Task definition" className="space-y-3 rounded-md border p-3">
              <TaskFieldsForm label="Task" value={taskBody.task} members={members} modes={taskModes} onChange={(patch) => setTaskBody((b) => ({ ...b, task: { ...b.task, ...patch } }))} />
              <label className="block text-xs font-medium">Team
                <select aria-label="Task team" className={field} value={taskBody.task.team.mode === "team" ? taskBody.task.team.teamId ?? "" : ""}
                  onChange={(e) => setTaskBody((b) => ({ ...b, task: { ...b.task, team: e.target.value ? { mode: "team", teamId: e.target.value } : { mode: "none" } } }))}>
                  <option value="">No team</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </label>
              <RepeatFields state={repeat} onChange={(patch) => setRepeat((r) => ({ ...r, ...patch }))} />
              <div className="space-y-2">
                <div className="flex items-center justify-between"><h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Subtasks</h4>
                  <Button type="button" size="sm" variant="outline" onClick={() => setTaskBody((b) => ({ ...b, task: { ...b.task, subtasks: [...b.task.subtasks, subtaskDefaults(uniqueKey(b.task.subtasks.map((s) => s.key), "sub"))] } }))}><Plus size={14} className="mr-1" /> Add subtask</Button>
                </div>
                {taskBody.task.subtasks.length === 0 && <p className="text-xs text-muted-foreground">No subtasks.</p>}
                {taskBody.task.subtasks.map((sub, i) => (
                  <div key={sub.key} className="space-y-2 rounded-md bg-slate-50 p-3" data-testid="subtask-editor">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">Subtask {i + 1}</span>
                      <span className="flex gap-1">
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move subtask ${i + 1} up`} onClick={() => setTaskBody((b) => ({ ...b, task: { ...b.task, subtasks: moveItem(b.task.subtasks, i, -1) } }))}><ArrowUp size={14} /></Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move subtask ${i + 1} down`} onClick={() => setTaskBody((b) => ({ ...b, task: { ...b.task, subtasks: moveItem(b.task.subtasks, i, 1) } }))}><ArrowDown size={14} /></Button>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove subtask ${i + 1}`} onClick={() => setTaskBody((b) => ({ ...b, task: { ...b.task, subtasks: b.task.subtasks.filter((_, j) => j !== i) } }))}><Trash2 size={14} /></Button>
                      </span>
                    </div>
                    <TaskFieldsForm label={`Subtask ${i + 1}`} value={sub} members={members} modes={taskModes} onChange={(patch) => setTaskBody((b) => ({ ...b, task: { ...b.task, subtasks: b.task.subtasks.map((s, j) => (j === i ? { ...s, ...patch } : s)) } }))} />
                  </div>
                ))}
              </div>
            </section>
          ) : (
            <>
              <section aria-label="Project definition" className="space-y-3 rounded-md border p-3">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</h4>
                <label className="block text-xs font-medium">Default project name
                  <input aria-label="Project name" className={field} value={projectBody.project.name} onChange={(e) => setProjectBody((b) => ({ ...b, project: { ...b.project, name: e.target.value } }))} maxLength={200} />
                </label>
                <label className="block text-xs font-medium">Project description
                  <textarea aria-label="Project description" rows={2} className={field} value={projectBody.project.description ?? ""} onChange={(e) => setProjectBody((b) => ({ ...b, project: { ...b.project, description: e.target.value || null } }))} />
                </label>
                <div className="grid gap-3 sm:grid-cols-3">
                  <label className="text-xs font-medium">Visibility
                    <select aria-label="Project visibility" className={field} value={projectBody.project.visibility} onChange={(e) => setProjectBody((b) => ({ ...b, project: { ...b.project, visibility: e.target.value as "private" | "workspace" } }))}>
                      <option value="private">Private (members only)</option><option value="workspace">Whole workspace</option>
                    </select>
                  </label>
                  <label className="text-xs font-medium">Team
                    <select aria-label="Project team" className={field} value={projectBody.project.team.mode === "team" ? projectBody.project.team.teamId ?? "" : ""}
                      onChange={(e) => setProjectBody((b) => ({ ...b, project: { ...b.project, team: e.target.value ? { mode: "team", teamId: e.target.value } : { mode: "none" } } }))}>
                      <option value="">No team</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </label>
                  <div className="text-xs"><AssigneeField label="Project lead" value={projectBody.project.lead} modes={["none", "instantiator", "member"]} members={members} onChange={(lead) => setProjectBody((b) => ({ ...b, project: { ...b.project, lead } }))} /></div>
                </div>
                <fieldset>
                  <legend className="text-xs font-medium">Default members</legend>
                  <div className="mt-1 flex max-h-28 flex-wrap gap-2 overflow-y-auto">
                    {members.map((m) => {
                      const on = projectBody.project.members.some((x) => x.userId === m.id);
                      return <label key={m.id} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs"><input type="checkbox" aria-label={`Default member ${m.name}`} checked={on}
                        onChange={() => setProjectBody((b) => ({ ...b, project: { ...b.project, members: on ? b.project.members.filter((x) => x.userId !== m.id) : [...b.project.members, { userId: m.id }] } }))} />{m.name}</label>;
                    })}
                  </div>
                </fieldset>
              </section>

              <section aria-label="Project tasks" className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tasks ({projectBody.tasks.length})</h4>
                  <Button type="button" size="sm" variant="outline" onClick={() => addProjectTask(null)}><Plus size={14} className="mr-1" /> Add task</Button>
                </div>
                {projectBody.tasks.length === 0 && <p className="text-xs text-muted-foreground">No tasks yet.</p>}
                {topLevel.map((task, index) => {
                  const subs = projectBody.tasks.filter((t) => t.parentKey === task.key);
                  return (
                    <div key={task.key} className="space-y-2 rounded-md border p-3" data-testid="project-task-editor">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">Task {index + 1} <code className="ml-1 rounded bg-slate-100 px-1">{task.key}</code></span>
                        <span className="flex gap-1">
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move task ${index + 1} up`} onClick={() => moveTop(task.key, -1)}><ArrowUp size={14} /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Move task ${index + 1} down`} onClick={() => moveTop(task.key, 1)}><ArrowDown size={14} /></Button>
                          <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove task ${index + 1}`} onClick={() => setProjectTasks(removeProjectTask(projectBody.tasks, task.key))}><Trash2 size={14} /></Button>
                        </span>
                      </div>
                      <TaskFieldsForm label={`Task ${index + 1}`} value={task} members={members} modes={projectModes} onChange={(patch) => patchTask(task.key, patch)} />
                      <label className="block text-xs font-medium">Team
                        <select aria-label={`Task ${index + 1} team`} className={field} value={task.team.mode === "team" ? task.team.teamId ?? "" : task.team.mode}
                          onChange={(e) => patchTask(task.key, { team: e.target.value === "none" || e.target.value === "inherit" ? { mode: e.target.value as "none" | "inherit" } : { mode: "team", teamId: e.target.value } })}>
                          <option value="none">No team</option><option value="inherit">Same as the project</option>
                          {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                      </label>
                      <fieldset>
                        <legend className="text-xs font-medium">Depends on</legend>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {dependencyChoices(projectBody.tasks, task.key).length === 0 && <span className="text-xs text-muted-foreground">No other task can be a predecessor.</span>}
                          {dependencyChoices(projectBody.tasks, task.key).map((choice) => {
                            const on = task.dependsOn.includes(choice.key);
                            return <label key={choice.key} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs"><input type="checkbox" aria-label={`Task ${index + 1} depends on ${choice.key}`} checked={on}
                              onChange={() => patchTask(task.key, { dependsOn: on ? task.dependsOn.filter((d) => d !== choice.key) : [...task.dependsOn, choice.key] })} />{choice.title || choice.key}</label>;
                          })}
                        </div>
                      </fieldset>
                      {subs.map((sub, i) => (
                        <div key={sub.key} className="ml-4 space-y-2 rounded-md bg-slate-50 p-3" data-testid="project-subtask-editor">
                          <div className="flex items-center justify-between"><span className="text-xs font-semibold">Subtask {i + 1} of task {index + 1}</span>
                            <Button type="button" size="icon" variant="ghost" className="h-7 w-7" aria-label={`Remove subtask ${i + 1} of task ${index + 1}`} onClick={() => setProjectTasks(removeProjectTask(projectBody.tasks, sub.key))}><Trash2 size={14} /></Button>
                          </div>
                          <TaskFieldsForm label={`Task ${index + 1} subtask ${i + 1}`} value={sub} members={members} modes={projectModes} onChange={(patch) => patchTask(sub.key, patch)} />
                          <fieldset>
                            <legend className="text-xs font-medium">Depends on</legend>
                            <div className="mt-1 flex flex-wrap gap-2">
                              {dependencyChoices(projectBody.tasks, sub.key).map((choice) => {
                                const on = sub.dependsOn.includes(choice.key);
                                return <label key={choice.key} className="flex items-center gap-1 rounded-full border px-2 py-1 text-xs"><input type="checkbox" aria-label={`Task ${index + 1} subtask ${i + 1} depends on ${choice.key}`} checked={on}
                                  onChange={() => patchTask(sub.key, { dependsOn: on ? sub.dependsOn.filter((d) => d !== choice.key) : [...sub.dependsOn, choice.key] })} />{choice.title || choice.key}</label>;
                              })}
                            </div>
                          </fieldset>
                        </div>
                      ))}
                      <Button type="button" size="sm" variant="ghost" onClick={() => addProjectTask(task.key)}><Plus size={14} className="mr-1" /> Add subtask</Button>
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">Recurrence is not available in project templates yet.</p>
              </section>
            </>
          )}

          {(message || issues.length > 0) && (
            <div role="alert" data-testid="template-errors" className="rounded-md bg-red-50 p-3 text-sm text-red-800 ring-1 ring-red-200">
              {message && <p>{message}</p>}
              {issues.length > 0 && <ul className="mt-1 list-disc pl-5">{issues.slice(0, 8).map((i, n) => <li key={n}>{i.message}{i.key ? ` (${i.key})` : ""}</li>)}</ul>}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>{saving ? "Saving…" : editing ? "Save as new version" : "Create template"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
