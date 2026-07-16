import React from "react";
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Plus,
} from "lucide-react";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

type CalendarView = "month" | "week" | "day";

interface Props {
    view: CalendarView;
    setView(view: CalendarView): void;

    currentDate: Date;

    onPrevious(): void;
    onNext(): void;
    onToday(): void;

    onCreateTask?: () => void;
}

const CalendarToolbar: React.FC<Props> = ({
    view,
    setView,
    currentDate,

    onPrevious,
    onNext,
    onToday,

    onCreateTask,
}) => {
    const monthLabel = currentDate.toLocaleDateString(undefined, {
        month: "long",
        year: "numeric",
    });

    return (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border bg-white p-4">

            {/* LEFT */}

            <div className="flex items-center gap-3">

                <WorkspaceSwitcher />

                <button
                    onClick={onToday}
                    className="rounded-lg border px-4 py-2 text-sm font-medium hover:bg-gray-50"
                >
                    Today
                </button>

                <div className="flex overflow-hidden rounded-lg border">

                    <button
                        onClick={onPrevious}
                        className="border-r p-2 hover:bg-gray-100"
                    >
                        <ChevronLeft size={18} />
                    </button>

                    <button
                        onClick={onNext}
                        className="p-2 hover:bg-gray-100"
                    >
                        <ChevronRight size={18} />
                    </button>

                </div>

                <div className="flex items-center gap-2">

                    <CalendarDays
                        size={18}
                        className="text-blue-600"
                    />

                    <h2 className="text-lg font-semibold">
                        {monthLabel}
                    </h2>

                </div>

            </div>

            {/* RIGHT */}

            <div className="flex items-center gap-3">

                <div className="flex overflow-hidden rounded-lg border">

                        {(["month", "week", "day"] as CalendarView[]).map(v => (

                            <button
                                key={v}
                                onClick={() => setView(v)}
                                className={`px-4 py-2 text-sm capitalize transition

                                    ${
                                        view === v
                                            ? "bg-blue-600 text-white"
                                            : "hover:bg-gray-100"
                                    }
                                `}
                            >
                                {v}
                            </button>

                        ))}

                </div>

                <button
                    onClick={onCreateTask}
                    className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
                >
                    <Plus size={18} />
                    New Task
                </button>

            </div>

        </div>
    );
};

export default CalendarToolbar;