import { AlertTriangle, CalendarDays, Flag, FolderKanban, Users, X } from "lucide-react";
import type { CalendarEvent } from "@/types/calendar";
import { getStatusStyle, isTaskOverdue } from "@/lib/calendarStatus";

export function CalendarQuickView({ event, onClose, onOpen }: { event: CalendarEvent | null; onClose: () => void; onOpen: () => void }) {
  if (!event) return null;
  const overdue = isTaskOverdue({ status: event.status, deadline: event.task?.deadline ?? event.start });
  const style = getStatusStyle(event.status);
  const due = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(event.task?.deadline ?? event.start));
  const assignees = event.assignees || [];
  return <aside aria-label="Calendar task quick view" className="fixed inset-x-0 bottom-0 z-50 max-h-[75dvh] overflow-y-auto rounded-t-2xl border bg-white p-5 shadow-2xl sm:inset-y-0 sm:left-auto sm:right-0 sm:w-96 sm:max-h-none sm:rounded-none">
    <div className="flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${style.chip}`}>{style.label}</span><h2 className="mt-2 text-lg font-semibold">{event.title}</h2></div><button aria-label="Close quick view" onClick={onClose} className="rounded p-1 hover:bg-slate-100"><X size={20} /></button></div>
    <dl className="mt-5 space-y-3 text-sm"><div className="flex gap-2"><CalendarDays size={16} className="mt-0.5 text-muted-foreground" /><div><dt className="text-muted-foreground">Due</dt><dd className={overdue ? "font-medium text-red-700" : "font-medium"}>{overdue && <AlertTriangle className="mr-1 inline" size={14} />}{overdue ? "Overdue — " : ""}{due}</dd></div></div><div className="flex gap-2"><Flag size={16} className="mt-0.5 text-muted-foreground" /><div><dt className="text-muted-foreground">Priority</dt><dd className="capitalize">{event.priority || "Medium"}</dd></div></div>{event.project && <div className="flex gap-2"><FolderKanban size={16} className="mt-0.5 text-muted-foreground" /><div><dt className="text-muted-foreground">Project</dt><dd>{event.project.name}</dd></div></div>}{event.team && <div className="flex gap-2"><Users size={16} className="mt-0.5 text-muted-foreground" /><div><dt className="text-muted-foreground">Team</dt><dd>{event.team.name}</dd></div></div>}<div><dt className="text-muted-foreground">Assignees</dt><dd>{assignees.length ? assignees.map((u) => `${u.firstName} ${u.lastName}`).join(", ") : "Unassigned"}</dd></div></dl>
    <button onClick={onOpen} className="mt-6 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Open task</button>
  </aside>;
}
