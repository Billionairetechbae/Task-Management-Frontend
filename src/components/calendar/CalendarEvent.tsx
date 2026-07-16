import { Clock, Flag } from "lucide-react";
import { format } from "date-fns";
import type { CalendarEvent } from "../../types/calendar";

interface Props {
    event: CalendarEvent;
    compact?: boolean;
    onClick?: () => void;
}


const priorityColours = {
    low: {
        border: "border-l-green-500",
        badge: "bg-green-100 text-green-700",
        solid: "bg-green-500",
    },

    medium: {
        border: "border-l-blue-500",
        badge: "bg-blue-100 text-blue-700",
        solid: "bg-blue-500",
    },

    high: {
        border: "border-l-orange-500",
        badge: "bg-orange-100 text-orange-700",
        solid: "bg-orange-500",
    },

    urgent: {
        border: "border-l-red-600",
        badge: "bg-red-100 text-red-700",
        solid: "bg-red-600",
    },
};

export default function CalendarEvent({
    event,
    compact = false,
    onClick,
}: Props) {

    const colours =
        priorityColours[event.priority] ??
        priorityColours.medium;

    const completed =
        event.status === "completed";

     // 👇 COMPACT MONTH VIEW
    if (compact) {
        return (
            <div
                onClick={() => onClick?.()}
                className={`
                    cursor-pointer
                    truncate
                    rounded
                    px-2
                    py-1
                    text-xs
                    font-medium
                    text-white
                    ${colours.solid}
                `}
            >
                {event.title}
            </div>
        );
    }

    return (
        <div
            onClick={() => onClick?.()}
            className={`
                cursor-pointer
                rounded-lg
                border
                border-l-4
                bg-white
                p-3
                shadow-sm
                transition
                hover:shadow-md
                ${colours.border}
                ${completed ? "opacity-50" : ""}
            `}
        >
            {/* Title */}

            <div className="mb-2">

                <h4 className="line-clamp-2 text-sm font-semibold">

                    {event.title}

                </h4>

            </div>

            {/* Project */}

            {event.project && (
                <div className="mb-2 text-xs text-gray-500">

                    {event.project.name}

                </div>
            )}

            {/* Footer */}

            <div className="flex items-center justify-between">

                <div className="flex items-center gap-1 text-xs text-gray-500">

                    <Clock size={13} />

                    {format(
                        new Date(event.start),
                        "h:mm a"
                    )}

                </div>

                <span
                    className={`
                        rounded-full
                        px-2
                        py-1
                        text-[10px]
                        font-semibold
                        uppercase
                        ${colours.badge}
                    `}
                >
                    <div className="flex items-center gap-1">

                        <Flag size={10} />

                        {event.priority}

                    </div>

                </span>

            </div>

            {/* Assignees */}

            {event.task?.assignees?.length > 0 && (

                <div className="mt-3 flex -space-x-2">

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
                                className="h-7 w-7 rounded-full border-2 border-white object-cover"
                            />

                        ))}

                    {event.task.assignees.length > 4 && (

                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gray-300 text-[10px] font-semibold">

                            +{event.task.assignees.length - 4}

                        </div>

                    )}

                </div>

            )}

        </div>
    );
}