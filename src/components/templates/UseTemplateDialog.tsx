import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Lock, Repeat } from "lucide-react";
import { api, ApiError, type CustomFieldDefinition, type TemplateIssue, type TemplatePreview, type TemplateUseInput, type TemplateUseResult, type TaskTemplateBody, type ProjectTemplateBody } from "@/lib/api";
import { getBrowserTimeZone } from "@/lib/recurrenceForm";
import { bodyNodes, formatInstant, hasAnyOffset, needsDefaultDueTime, newIdempotencyKey, todayLocalDate } from "@/lib/templateForm";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useWorkspaceLookups } from "./useWorkspaceLookups";
import CustomFieldsForm from "@/components/customFields/CustomFieldsForm";

const field = "mt-1 w-full rounded-md border px-3 py-2 text-sm";

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void;
  template: { id: string; type: "task" | "project"; name: string } | null;
  onDone: (result: TemplateUseResult) => void;
};

/**
 * Use a template: collects the few inputs the template needs, asks the server's planner for a preview (same planner as the real
 * run), lets the user resolve warnings, then submits with ONE idempotency key per open flow (reused for retries of the same
 * submission). Dates are resolved by the server in the browser's IANA timezone; no time is ever assumed.
 */
export default function UseTemplateDialog({ open, onOpenChange, template, onDone }: Props) {
  const { toast } = useToast();
  const timezone = useMemo(() => getBrowserTimeZone(), []);
  const { members } = useWorkspaceLookups(open);
  const keyRef = useRef<string>(newIdempotencyKey());

  const detail = useQuery({
    queryKey: ["template", template?.id], enabled: open && Boolean(template), staleTime: 0,
    queryFn: async () => (await api.getTemplate(template!.id)).data.template,
  });
  const nodes = useMemo(() => (detail.data ? bodyNodes(detail.data.body) : []), [detail.data]);
  const needTime = needsDefaultDueTime(nodes);
  const needStart = hasAnyOffset(nodes);
  const isProject = template?.type === "project";

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState(todayLocalDate());
  const [defaultDueTime, setDefaultDueTime] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [visibility, setVisibility] = useState<"private" | "workspace" | "">("");
  const [leadUserId, setLeadUserId] = useState<string | undefined>(undefined);
  const [overrides, setOverrides] = useState<Record<string, string | null>>({});
  const [accept, setAccept] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState<{ message: string; errors: TemplateIssue[] } | null>(null);
  const [taskFieldDefinitions, setTaskFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [projectFieldDefinitions, setProjectFieldDefinitions] = useState<CustomFieldDefinition[]>([]);
  const [customFieldInputs, setCustomFieldInputs] = useState<{ project: Record<string, unknown>; tasks: Record<string, Record<string, unknown>> }>({ project: {}, tasks: {} });

  // A fresh idempotency key for every use-template flow; retries of the SAME submission keep it.
  useEffect(() => {
    if (!open) return;
    keyRef.current = newIdempotencyKey();
    setOverrides({}); setAccept(false); setFailure(null); setDefaultDueTime(""); setStartDate(todayLocalDate()); setDueAt(""); setLeadUserId(undefined); setVisibility(""); setCustomFieldInputs({ project: {}, tasks: {} });
    Promise.all([api.listCustomFields("task"), api.listCustomFields("project")]).then(([tasks, projects]) => {
      setTaskFieldDefinitions(tasks.data.definitions.filter((f) => f.status === "active" && !["datetime", "user"].includes(f.fieldType)));
      setProjectFieldDefinitions(projects.data.definitions.filter((f) => f.status === "active" && !["datetime", "user"].includes(f.fieldType)));
    }).catch(() => { setTaskFieldDefinitions([]); setProjectFieldDefinitions([]); });
  }, [open, template?.id]);
  useEffect(() => {
    if (!detail.data) return;
    if (isProject) setName((detail.data.body as ProjectTemplateBody).project.name);
    else setTitle((detail.data.body as TaskTemplateBody).task.title);
  }, [detail.data, isProject]);

  const input = useMemo((): Omit<TemplateUseInput, "idempotencyKey"> => {
    const base: Omit<TemplateUseInput, "idempotencyKey"> = { timezone };
    if (needStart && !(dueAt && !isProject)) base.startDate = startDate;
    if (needTime && defaultDueTime) base.defaultDueTime = defaultDueTime;
    const keyed = Object.entries(overrides);
    if (keyed.length) base.overrides = { assignees: Object.fromEntries(keyed) };
    const hasCustomInputs = Object.keys(customFieldInputs.project).length > 0 || Object.values(customFieldInputs.tasks).some((values) => Object.keys(values).length > 0);
    if (hasCustomInputs) base.customFields = customFieldInputs;
    if (isProject) {
      base.name = name;
      if (visibility) base.visibility = visibility;
      if (leadUserId !== undefined) base.leadUserId = leadUserId || null;
    } else {
      if (title.trim()) base.title = title.trim();
      if (dueAt) base.dueAt = new Date(dueAt).toISOString();
    }
    return base;
  }, [timezone, needStart, needTime, startDate, defaultDueTime, overrides, customFieldInputs, isProject, name, visibility, leadUserId, title, dueAt]);

  const [debounced, setDebounced] = useState(input);
  useEffect(() => { const t = setTimeout(() => setDebounced(input), 300); return () => clearTimeout(t); }, [input]);

  const preview = useQuery({
    queryKey: ["template-preview", template?.id, JSON.stringify(debounced)],
    enabled: open && Boolean(template) && Boolean(detail.data),
    retry: false, staleTime: 0,
    queryFn: async (): Promise<TemplatePreview> => (await api.previewTemplate(template!.id, debounced)).data,
  });
  const result = preview.data;
  const plan = result?.plan ?? null;
  const settled = JSON.stringify(debounced) === JSON.stringify(input) && !preview.isFetching;

  const warnings = result?.warnings ?? [];
  // "needs a default time" is asked for with its own field, so it is not repeated as a blocking error.
  const errors = (result?.errors ?? []).filter((e) => !(e.code === "DEFAULT_DUE_TIME_REQUIRED" && needTime));
  const timeMissing = needTime && !defaultDueTime;
  const canSubmit = Boolean(result?.ok) && settled && !submitting && !timeMissing && (warnings.length === 0 || accept) && (!isProject || name.trim().length > 0);

  const submit = async () => {
    if (!template || !canSubmit) return;
    setSubmitting(true); setFailure(null);
    try {
      const res = await api.instantiateTemplate(template.id, { ...input, idempotencyKey: keyRef.current, acceptWarnings: accept });
      toast({ title: res.data.replayed ? "Already created" : isProject ? "Project created from template" : "Task created from template" });
      onDone(res.data); onOpenChange(false);
    } catch (error) {
      const e = error as ApiError;
      setFailure({ message: e.message || "Couldn't use this template.", errors: [...(e.body?.errors ?? []), ...(e.body?.warnings ?? [])] });
    } finally { setSubmitting(false); }
  };

  const overrideFor = (issue: TemplateIssue) => (issue.key ? overrides[issue.key] : undefined);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{isProject ? "New project from template" : "New task from template"}</DialogTitle>
          <DialogDescription>{template?.name}</DialogDescription>
        </DialogHeader>

        {detail.isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading template…</p>
          : detail.isError ? <p role="alert" className="text-sm text-red-700">Couldn't load this template.</p>
          : (
            <div className="space-y-4 text-sm">
              {isProject ? (
                <label className="block text-xs font-medium">Project name
                  <input aria-label="Project name" className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={200} />
                </label>
              ) : (
                <label className="block text-xs font-medium">Task title
                  <input aria-label="Task title" className={field} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
                </label>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {needStart && (
                  <label className="block text-xs font-medium">Start date
                    <input aria-label="Start date" type="date" className={field} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <span className="mt-1 block font-normal text-muted-foreground">Due dates count in calendar days from this date.</span>
                  </label>
                )}
                {needTime && (
                  <label className="block text-xs font-medium">Default due time
                    <input aria-label="Default due time" type="time" className={field} value={defaultDueTime} onChange={(e) => setDefaultDueTime(e.target.value)} />
                    <span className={`mt-1 block font-normal ${timeMissing ? "text-amber-700" : "text-muted-foreground"}`}>
                      {timeMissing ? "Required: some tasks have a due date but no time of their own." : "Used only for tasks without their own time."}
                    </span>
                  </label>
                )}
                {!isProject && !needStart && (
                  <label className="block text-xs font-medium">Due date (optional)
                    <input aria-label="Due date" type="datetime-local" className={field} value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
                  </label>
                )}
                {isProject && (
                  <>
                    <label className="block text-xs font-medium">Visibility
                      <select aria-label="Project visibility" className={field} value={visibility || (detail.data!.body as ProjectTemplateBody).project.visibility} onChange={(e) => setVisibility(e.target.value as "private" | "workspace")}>
                        <option value="private">Private (members only)</option><option value="workspace">Whole workspace</option>
                      </select>
                    </label>
                    <label className="block text-xs font-medium">Project lead
                      <select aria-label="Project lead" className={field} value={leadUserId === undefined ? "__template" : leadUserId} onChange={(e) => setLeadUserId(e.target.value === "__template" ? undefined : e.target.value)}>
                        <option value="__template">As defined in the template</option>
                        <option value="">No lead</option>
                        {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                      </select>
                    </label>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Timezone: {timezone}</p>

              {errors.length > 0 && (
                <div role="alert" data-testid="plan-errors" className="rounded-md bg-red-50 p-3 text-red-800 ring-1 ring-red-200">
                  <p className="font-medium">This can't be created yet:</p>
                  <ul className="mt-1 list-disc pl-5">{errors.map((e, i) => <li key={i}>{e.message}</li>)}</ul>
                </div>
              )}

              {errors.filter((issue) => issue.code === "REQUIRED_CUSTOM_FIELD_MISSING" && issue.fieldId).map((issue) => {
                const targetKey = issue.key || (isProject ? "project" : "root");
                const projectField = targetKey === "project";
                const definitions = (projectField ? projectFieldDefinitions : taskFieldDefinitions).filter((definition) => definition.id === issue.fieldId);
                if (!definitions.length) return null;
                const current = projectField ? customFieldInputs.project : customFieldInputs.tasks[targetKey] || {};
                return <CustomFieldsForm key={`${targetKey}:${issue.fieldId}`} entityType={projectField ? "project" : "task"} templateSafeOnly definitionsOverride={definitions} value={current} onChange={(next) => setCustomFieldInputs((previous) => projectField
                  ? { ...previous, project: { ...previous.project, ...next } }
                  : { ...previous, tasks: { ...previous.tasks, [targetKey]: { ...(previous.tasks[targetKey] || {}), ...next } } })} />;
              })}

              {warnings.length > 0 && (
                <div role="status" data-testid="plan-warnings" className="space-y-2 rounded-md bg-amber-50 p-3 text-amber-900 ring-1 ring-amber-200">
                  <p className="flex items-center gap-1 font-medium"><AlertTriangle size={14} /> Please review</p>
                  <ul className="space-y-2">
                    {warnings.map((w, i) => (
                      <li key={i}>
                        <p>{w.message}</p>
                        {w.key && (
                          <label className="mt-1 flex items-center gap-2 text-xs">Assign to
                            <select aria-label={`Replacement for ${w.key}`} className="rounded-md border bg-white px-2 py-1" value={overrideFor(w) === undefined ? "__keep" : overrideFor(w) ?? ""}
                              onChange={(e) => setOverrides((o) => { const next = { ...o }; if (e.target.value === "__keep") delete next[w.key!]; else next[w.key!] = e.target.value === "" ? null : e.target.value; return next; })}>
                              <option value="__keep">(as planned)</option><option value="">Leave unassigned</option>
                              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                          </label>
                        )}
                      </li>
                    ))}
                  </ul>
                  <label className="flex items-center gap-2 text-xs"><input aria-label="Accept warnings" type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} /> I understand and want to continue</label>
                </div>
              )}

              {plan && (
                <div className="space-y-2" data-testid="plan-summary">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Preview</p>
                  <p>
                    Creates {plan.summary.taskCount} task{plan.summary.taskCount === 1 ? "" : "s"}
                    {plan.summary.subtaskCount ? ` and ${plan.summary.subtaskCount} subtask${plan.summary.subtaskCount === 1 ? "" : "s"}` : ""}
                    {plan.summary.dependencyCount ? `, ${plan.summary.dependencyCount} dependenc${plan.summary.dependencyCount === 1 ? "y" : "ies"}` : ""}
                    {plan.project ? ` in a ${plan.project.visibility === "private" ? "private" : "workspace-visible"} project` : ""}.
                  </p>
                  {plan.recurrence && <p className="flex items-center gap-1 text-xs text-indigo-700"><Repeat size={12} /> Repeats: {plan.recurrence.summary}</p>}
                  <ul className="space-y-1">
                    {plan.nodes.map((n) => (
                      <li key={n.key} data-testid="plan-node" className={`rounded-md border p-2 ${n.parentKey ? "ml-5 bg-slate-50" : ""}`}>
                        <p className="font-medium">{n.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatInstant(n.deadline)} · {n.assignees.length ? n.assignees.map((a) => a.name || "Member").join(", ") : "Unassigned"}
                        </p>
                        {n.dependsOn.length > 0 && <p className="flex items-center gap-1 text-xs text-red-700"><Lock size={11} /> After {n.dependsOn.join(", ")}</p>}
                      </li>
                    ))}
                  </ul>
                  {plan.projectMembers.length > 0 && <p className="text-xs text-muted-foreground">Added to the project: {plan.projectMembers.map((m) => m.name || "Member").join(", ")}</p>}
                </div>
              )}
              {preview.isFetching && <p className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 size={12} className="animate-spin" /> Checking…</p>}
              {failure && (
                <div role="alert" data-testid="use-failure" className="rounded-md bg-red-50 p-3 text-red-800 ring-1 ring-red-200">
                  <p>{failure.message}</p>
                  {failure.errors.length > 0 && <ul className="mt-1 list-disc pl-5">{failure.errors.slice(0, 5).map((e, i) => <li key={i}>{e.message}</li>)}</ul>}
                </div>
              )}
            </div>
          )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={!canSubmit}>{submitting ? "Creating…" : isProject ? "Create project" : "Create task"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
