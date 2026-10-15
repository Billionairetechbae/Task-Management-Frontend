import { AlertTriangle, Building2, Lock, CalendarDays, Flag, FolderKanban, ListChecks, Users } from "lucide-react";
import type { CalendarEvent } from "@/types/calendar";
import { getStatusStyle, isTaskOverdue } from "@/lib/calendarStatus";

/** Body of the anchored task popover.  Read-only: status changes stay on the Board / task page. */
export function CalendarEventPopoverBody({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
    const overdue = isTaskOverdue({ status: event.status, deadline: event.task?.deadline ?? event.start });
    const style = getStatusStyle(event.status);
    const due = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.task?.deadline ?? event.start));
    const assignees = event.assignees || [];
    const subtaskCount = Number(event.task?.subtaskCount ?? 0);
    return (
        <div>
            <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${style.chip}`}>{style.label}</span>
            <h2 className="mt-2 text-base font-semibold leading-snug">{event.title}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
                <div className="flex gap-2"><CalendarDays size={16} className="mt-0.5 shrink-0 text-muted-foreground" /><div><dt className="sr-only">Due</dt><dd className={overdue ? "font-medium text-red-700" : ""}>{overdue && <AlertTriangle className="mr-1 inline" size={14} />}{overdue ? "Overdue — " : ""}{due}</dd></div></div>
                <div className="flex gap-2"><Flag size={16} className="mt-0.5 shrink-0 text-muted-foreground" /><div><dt className="sr-only">Priority</dt><dd className="capitalize">{event.priority || "medium"} priority</dd></div></div>
                {event.isBlocked && <div className="flex gap-2" data-testid="calendar-blocked-row"><Lock size={16} className="mt-0.5 shrink-0 text-red-600" /><div><dt className="sr-only">Dependencies</dt><dd className="font-medium text-red-700">Blocked by {event.blockedByCount ?? 1} unfinished {(event.blockedByCount ?? 1) === 1 ? "task" : "tasks"}</dd></div></div>}
                {!event.isBlocked && event.hasCancelledDependency && <div className="flex gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" /><div><dt className="sr-only">Dependencies</dt><dd className="text-amber-800">A dependency was cancelled</dd></div></div>}
                {event.workspace?.name && <div className="flex gap-2"><Building2 size={16} className="mt-0.5 shrink-0 text-muted-foreground" /><div><dt className="sr-only">Workspace</dt><dd>Workspace: {event.workspace.name}</dd></div></div>}
                {event.project && <div className="flex gap-2"><FolderKanban size={16} className="mt-0.5 shrink-0 text-muted-foreground" /><div><dt className="sr-only">Project</dt><dd>{event.project.name}</dd></div></div>}
                {event.team && <div className="flex gap-2"><Users size={16} className="mt-0.5 shrink-0 text-muted-foreground" /><div><dt className="sr-only">Team</dt><dd>{event.team.name}</dd></div></div>}
                {(event.task?.parentTaskId || subtaskCount > 0) && <div className="flex gap-2"><ListChecks size={16} className="mt-0.5 shrink-0 text-muted-foreground" /><div><dt className="sr-only">Subtasks</dt><dd>{event.task?.parentTaskId ? "Subtask of another task" : `${subtaskCount} subtask${subtaskCount === 1 ? "" : "s"}`}</dd></div></div>}
                <div><dt className="text-xs text-muted-foreground">Assignees</dt><dd>{assignees.length ? assignees.map((u) => `${u.firstName} ${u.lastName}`).join(", ") : "Unassigned"}</dd></div>
            </dl>
            <button onClick={onOpen} className="mt-4 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">Open task</button>
        </div>
    );
}
