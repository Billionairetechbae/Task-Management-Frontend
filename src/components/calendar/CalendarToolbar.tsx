import React from "react";
import {
    ChevronLeft,
    ChevronRight,
    CalendarDays,
    Plus,
    Filter,
    LayoutGrid,
    List,
    X,
} from "lucide-react";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import { format } from "date-fns";

type CalendarView = "month" | "week" | "day";

interface Props {
    view: CalendarView;
    setView(view: CalendarView): void;
    currentDate: Date;
    onPrevious(): void;
    onNext(): void;
    onToday(): void;
    onCreateTask?: () => void;
    onToggleFilters?: () => void;
    showFilters?: boolean;
}

const CalendarToolbar: React.FC<Props> = ({
    view,
    setView,
    currentDate,
    onPrevious,
    onNext,
    onToday,
    onCreateTask,
    onToggleFilters,
    showFilters = false,
}) => {
    const viewOptions: { key: CalendarView; label: string; icon: any }[] = [
        { key: "month", label: "Month", icon: LayoutGrid },
        { key: "week", label: "Week", icon: List },
        { key: "day", label: "Day", icon: CalendarDays },
    ];

    const dateRange = () => {
        const start = currentDate;
        const end = currentDate;
        return format(start, "MMMM yyyy");
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-gray-200/60 bg-white/80 backdrop-blur-sm">
            {/* Left Section */}
            <div className="flex items-center gap-3 min-w-0">
                <WorkspaceSwitcher />

                <div className="h-6 w-px bg-gray-300" />

                <button
                    onClick={onToday}
                    className="rounded-lg border border-gray-300/60 px-4 py-1.5 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 hover:border-gray-400 active:scale-95"
                >
                    Today
                </button>

                <div className="flex overflow-hidden rounded-lg border border-gray-300/60 shadow-sm">
                    <button
                        onClick={onPrevious}
                        className="border-r border-gray-300/60 p-1.5 hover:bg-gray-50 transition-colors"
                    >
                        <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    <button
                        onClick={onNext}
                        className="p-1.5 hover:bg-gray-50 transition-colors"
                    >
                        <ChevronRight size={18} className="text-gray-600" />
                    </button>
                </div>

                <div className="flex items-center gap-2">
                    <CalendarDays size={20} className="text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900 whitespace-nowrap">
                        {dateRange()}
                    </h2>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2">
                {/* View Toggle */}
                <div className="flex overflow-hidden rounded-lg border border-gray-300/60 shadow-sm bg-white p-0.5">
                    {viewOptions.map(v => {
                        const Icon = v.icon;
                        const isActive = view === v.key;
                        return (
                            <button
                                key={v.key}
                                onClick={() => setView(v.key)}
                                className={`
                                    flex items-center gap-1.5 px-3.5 py-1.5 text-sm font-medium rounded-md transition-all
                                    ${isActive
                                        ? "bg-blue-600 text-white shadow-sm"
                                        : "text-gray-600 hover:bg-gray-50"
                                    }
                                `}
                            >
                                <Icon size={16} />
                                <span className="hidden sm:inline">{v.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Filter Toggle */}
                <button
                    onClick={onToggleFilters}
                    className={`
                        rounded-lg border p-2 transition-all
                        ${showFilters
                            ? "border-blue-400 bg-blue-50 text-blue-600"
                            : "border-gray-300/60 text-gray-600 hover:bg-gray-50"
                        }
                    `}
                >
                    <Filter size={18} />
                </button>

                <div className="h-6 w-px bg-gray-300" />

                {/* Create Task Button */}
                <button
                    onClick={onCreateTask}
                    className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2 text-sm font-medium text-white shadow-sm transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-md active:scale-95"
                >
                    <Plus size={18} />
                    <span className="hidden sm:inline">New Task</span>
                </button>
            </div>
        </div>
    );
};

export default CalendarToolbar;