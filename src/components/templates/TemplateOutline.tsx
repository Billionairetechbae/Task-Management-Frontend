import { Lock, Repeat } from "lucide-react";
import type { ProjectTemplateBody, TaskTemplateBody, TemplateAssigneeConfig, TemplateDetail } from "@/lib/api";
import { PRESET_LABELS } from "@/lib/recurrenceForm";
import { offsetLabel, repeatFromConfig } from "@/lib/templateForm";
import type { Member } from "./useWorkspaceLookups";

const ASSIGNEE_TEXT: Record<string, string> = { none: "Unassigned", instantiator: "Whoever uses the template", teamLead: "The team lead", projectLead: "The project lead" };
const assigneeText = (a: TemplateAssigneeConfig, members: Member[]) =>
  a.mode === "member" ? members.find((m) => m.id === a.userId)?.name || "A specific member" : ASSIGNEE_TEXT[a.mode];

/** Read-only view of a template body: exactly what will be created (relative dates, assignee rules, dependencies). */
export default function TemplateOutline({ template, members = [] }: { template: TemplateDetail; members?: Member[] }) {
  const isTask = template.type === "task";
  const task = isTask ? (template.body as TaskTemplateBody).task : null;
  const project = !isTask ? (template.body as ProjectTemplateBody) : null;
  const repeat = task?.recurrence ? repeatFromConfig(task.recurrence) : null;

  const Row = ({ node, depth, label }: { node: any; depth: number; label: string }) => (
    <li className={`rounded-md border p-2 ${depth ? "ml-5 bg-slate-50" : ""}`} data-testid="outline-task">
      <p className="font-medium">{node.title}</p>
      <p className="text-xs text-muted-foreground">{label} · {offsetLabel(node)} · {assigneeText(node.assignee, members)} · {node.priority}</p>
      {node.dependsOn?.length > 0 && <p className="mt-0.5 flex items-center gap-1 text-xs text-red-700"><Lock size={11} /> After: {node.dependsOn.join(", ")}</p>}
    </li>
  );

  return (
    <div className="space-y-3 text-sm" data-testid="template-outline">
      {template.description && <p className="text-muted-foreground">{template.description}</p>}
      {task && (
        <>
          <ul className="space-y-1.5">
            <Row node={task} depth={0} label="Task" />
            {task.subtasks.map((s) => <Row key={s.key} node={s} depth={1} label="Subtask" />)}
          </ul>
          {repeat && <p className="flex items-center gap-1 text-xs text-indigo-700" data-testid="outline-repeat"><Repeat size={12} /> Repeats: {PRESET_LABELS[repeat.preset]}{repeat.limit ? `, ${repeat.maxOccurrences} occurrences in total` : ""}</p>}
        </>
      )}
      {project && (
        <>
          <div className="rounded-md bg-slate-50 p-2 text-xs" data-testid="outline-project">
            <p><strong>{project.project.name}</strong> · {project.project.visibility === "private" ? "Private (members only)" : "Visible to the whole workspace"}</p>
            <p className="text-muted-foreground">Lead: {assigneeText(project.project.lead, members)}{project.project.members.length ? ` · ${project.project.members.length} default member(s)` : ""}</p>
          </div>
          <ul className="space-y-1.5">
            {project.tasks.map((t) => <Row key={t.key} node={t} depth={t.parentKey ? 1 : 0} label={t.parentKey ? "Subtask" : "Task"} />)}
          </ul>
        </>
      )}
    </div>
  );
}
