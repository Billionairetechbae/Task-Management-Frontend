import { Clock, Flag, User, Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEvent } from "../../types/calendar";

interface Props {
    event: CalendarEvent;
    compact?: boolean;
    onClick?: () => void;
}

const priorityColours = {
    low: {
        border: "border-l-emerald-500",
        badge: "bg-emerald-50 text-emerald-700",
        solid: "bg-gradient-to-r from-emerald-500 to-emerald-600",
        ring: "ring-emerald-500/20",
    },
    medium: {
        border: "border-l-blue-500",
        badge: "bg-blue-50 text-blue-700",
        solid: "bg-gradient-to-r from-blue-500 to-blue-600",
        ring: "ring-blue-500/20",
    },
    high: {
        border: "border-l-orange-500",
        badge: "bg-orange-50 text-orange-700",
        solid: "bg-gradient-to-r from-orange-500 to-orange-600",
        ring: "ring-orange-500/20",
    },
    urgent: {
        border: "border-l-red-500",
        badge: "bg-red-50 text-red-700",
        solid: "bg-gradient-to-r from-red-500 to-red-600",
        ring: "ring-red-500/20",
    },
};

export default function CalendarEvent({
    event,
    compact = false,
    onClick,
}: Props) {
    const colours =
        priorityColours[event.priority as keyof typeof priorityColours] ??
        priorityColours.medium;

    const completed = event.status === "completed";

    // Compact view (Month view)
    if (compact) {
        return (
            <div
                onClick={() => onClick?.()}
                className={`
                    cursor-pointer
                    truncate
                    rounded-md
                    px-2
                    py-1
                    text-xs
                    font-medium
                    text-white
                    shadow-sm
                    transition-all
                    hover:shadow-md
                    hover:scale-[1.02]
                    ${colours.solid}
                    ${completed ? "opacity-60" : ""}
                `}
            >
                {event.title}
            </div>
        );
    }

    // Full view (Week/Day view)
    return (
        <div
            onClick={() => onClick?.()}
            className={`
                group
                cursor-pointer
                rounded-lg
                border
                border-l-4
                bg-white
                p-3
                shadow-sm
                transition-all
                hover:shadow-md
                hover:translate-y-[-1px]
                ${colours.border}
                ${completed ? "opacity-60" : ""}
            `}
        >
            {/* Title */}
            <div className="mb-2">
                <h4 className="line-clamp-2 text-sm font-semibold text-gray-900 group-hover:text-blue-700 transition-colors">
                    {event.title}
                </h4>
            </div>

            {/* Project */}
            {event.project && (
                <div className="mb-2 flex items-center gap-1.5 text-xs text-gray-500">
                    <CalendarIcon size={12} />
                    <span>{event.project.name}</span>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Clock size={13} className="text-gray-400" />
                    {format(new Date(event.start), "h:mm a")}
                    {new Date(event.start).toDateString() !== new Date(event.end).toDateString() && (
                        <span className="text-gray-400">
                            → {format(new Date(event.end), "h:mm a")}
                        </span>
                    )}
                </div>

                <div
                    className={`
                        flex items-center gap-1.5
                        rounded-full
                        px-2.5
                        py-1
                        text-[10px]
                        font-semibold
                        uppercase
                        ${colours.badge}
                    `}
                >
                    <Flag size={10} />
                    {event.priority}
                </div>
            </div>

            {/* Assignees */}
            {event.task?.assignees?.length > 0 && (
                <div className="mt-3 flex items-center gap-1">
                    <div className="flex -space-x-2">
                        {event.task.assignees
                            .slice(0, 4)
                            .map((user) => (
                                <img
                                    key={user.id}
                                    src={
                                        user.profilePictureUrl ||
                                        "/default-avatar.png"
                                    }
                                    alt={`${user.firstName} ${user.lastName}`}
                                    className="h-6 w-6 rounded-full border-2 border-white object-cover shadow-sm"
                                />
                            ))}
                    </div>

                    {event.task.assignees.length > 4 && (
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-200 text-[10px] font-semibold text-gray-600">
                            +{event.task.assignees.length - 4}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}