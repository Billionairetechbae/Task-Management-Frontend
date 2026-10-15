import { format } from "date-fns";
import { Plus } from "lucide-react";

/** Body of the empty-date quick-create popover. */
export function CalendarSlotPopoverBody({ start, hasTime, onCreate }: { start: Date; hasTime: boolean; onCreate: () => void }) {
    return (
        <div>
            <p className="text-sm font-semibold">{format(start, "EEEE, MMMM d")}{hasTime ? ` · ${format(start, "h:mm a")}` : ""}</p>
            <p className="mt-1 text-xs text-muted-foreground">Create a task due on this date</p>
            <button onClick={onCreate} className="mt-3 flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2">
                <Plus size={16} /> New task
            </button>
        </div>
    );
}
