import { Clock, Flag, FolderKanban, Users, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEvent as SharedCalendarEvent } from "../../types/calendar";
import { getStatusStyle, isTaskOverdue } from "../../lib/calendarStatus";

interface Props {
    event: SharedCalendarEvent;
    compact?: boolean;
    onClick?: () => void;
}

const fullName = (u: { firstName?: string; lastName?: string }) => `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();

export default function CalendarEvent({ event, compact = false, onClick }: Props) {
    const style = getStatusStyle(event.status);
    const overdue = isTaskOverdue({ status: event.status, deadline: event.task?.deadline ?? event.start });
    const label = `${event.title} — ${style.label}${overdue ? ", overdue" : ""}`;

    // Month view: compact chip. Status is spelled out (text), not only coloured.
    if (compact) {
        return (
            <div
                onClick={() => onClick?.()}
                title={label}
                aria-label={label}
                data-testid="calendar-event"
                data-status={event.status}
                className={`flex cursor-pointer items-center gap-1 truncate rounded-md border px-1.5 py-0.5 text-xs font-medium ${style.chip} ${overdue ? "ring-1 ring-red-500" : ""}`}
            >
                <span className={`h-2 w-2 shrink-0 rounded-full ${style.dot}`} aria-hidden="true" />
                <span className={`truncate ${style.strike ? "line-through" : ""}`}>{event.title}</span>
                <span className="ml-auto shrink-0 text-[10px] font-semibold uppercase opacity-80">
                    {overdue ? "Overdue" : style.label}
                </span>
            </div>
        );
    }

    // Week/Day: richer detail.
    const assignees = event.assignees || [];
    return (
        <div
            onClick={() => onClick?.()}
            title={label}
            data-testid="calendar-event"
            data-status={event.status}
            className={`group cursor-pointer rounded-lg border p-2 text-xs shadow-sm transition-all hover:shadow-md ${style.chip} ${overdue ? "ring-1 ring-red-500" : ""}`}
        >
            <div className="flex items-start justify-between gap-2">
                <h4 className={`line-clamp-2 text-sm font-semibold ${style.strike ? "line-through" : ""}`}>{event.title}</h4>
                <span className="shrink-0 rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-semibold uppercase">{style.label}</span>
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="flex items-center gap-1">
                    <Clock size={12} /> {format(new Date(event.task?.deadline ?? event.start), "h:mm a")}
                </span>
                {event.priority && (
                    <span className="flex items-center gap-1 capitalize">
                        <Flag size={12} /> {event.priority}
                    </span>
                )}
                {overdue && (
                    <span className="flex items-center gap-1 font-semibold text-red-700">
                        <AlertTriangle size={12} /> Overdue
                    </span>
                )}
            </div>

            {(event.project || event.team) && (
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 opacity-90">
                    {event.project && <span className="flex items-center gap-1"><FolderKanban size={12} />{event.project.name}</span>}
                    {event.team && <span className="flex items-center gap-1"><Users size={12} />{event.team.name}</span>}
                </div>
            )}

            {assignees.length > 0 && (
                <div className="mt-1 truncate opacity-90">
                    {assignees.slice(0, 3).map(fullName).join(", ")}
                    {assignees.length > 3 ? ` +${assignees.length - 3}` : ""}
                </div>
            )}
        </div>
    );
}
