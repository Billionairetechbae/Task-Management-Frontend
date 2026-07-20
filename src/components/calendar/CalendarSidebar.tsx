import {
    CalendarDays,
    CalendarRange,
    Calendar,
    Plus,
    CheckCircle2,
    Clock3,
    AlertTriangle,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
} from "lucide-react";

interface Props {
    view: "month" | "week" | "day";
    onViewChange: (view: "month" | "week" | "day") => void;
    stats?: {
        total: number;
        overdue: number;
        today: number;
        completed: number;
    };
    onCreateTask?: () => void;
    collapsed?: boolean;
    onToggleCollapse?: () => void;
}

export default function CalendarSidebar({
    view,
    onViewChange,
    stats,
    onCreateTask,
    collapsed = false,
    onToggleCollapse,
}: Props) {
    const views = [
        {
            key: "month",
            label: "Month",
            icon: Calendar,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            key: "week",
            label: "Week",
            icon: CalendarRange,
            color: "text-purple-600",
            bg: "bg-purple-50",
        },
        {
            key: "day",
            label: "Day",
            icon: CalendarDays,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
    ] as const;

    const statsData = [
        {
            key: "today",
            label: "Today",
            value: stats?.today ?? 0,
            icon: Clock3,
            color: "text-blue-600",
            bg: "bg-blue-50",
        },
        {
            key: "overdue",
            label: "Overdue",
            value: stats?.overdue ?? 0,
            icon: AlertTriangle,
            color: "text-red-600",
            bg: "bg-red-50",
        },
        {
            key: "completed",
            label: "Completed",
            value: stats?.completed ?? 0,
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
        },
        {
            key: "total",
            label: "Total",
            value: stats?.total ?? 0,
            icon: LayoutDashboard,
            color: "text-gray-600",
            bg: "bg-gray-50",
        },
    ];

    return (
        <aside
            className={`
                relative flex h-full flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-sm transition-all duration-300
                ${collapsed ? "w-16" : "w-72"}
            `}
        >
            {/* Collapse Toggle */}
            <button
                onClick={onToggleCollapse}
                className="absolute -right-3 top-6 z-10 rounded-full border border-gray-200 bg-white p-1 shadow-sm hover:bg-gray-50 transition-all"
            >
                {collapsed ? (
                    <ChevronRight size={16} className="text-gray-600" />
                ) : (
                    <ChevronLeft size={16} className="text-gray-600" />
                )}
            </button>

            {/* New Task Button */}
            <div className="border-b border-gray-200/60 p-4">
                <button
                    onClick={onCreateTask}
                    className={`
                        flex w-full items-center justify-center gap-2 rounded-xl
                        bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-2.5
                        text-sm font-medium text-white shadow-sm
                        transition-all hover:from-blue-700 hover:to-blue-800 hover:shadow-md
                        active:scale-95
                        ${collapsed ? "px-2" : ""}
                    `}
                >
                    <Plus size={18} />
                    {!collapsed && <span>New Task</span>}
                </button>
            </div>

            {/* View Selector */}
            <div className="border-b border-gray-200/60 p-4">
                {!collapsed && (
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Views
                    </p>
                )}

                <div className="space-y-1.5">
                    {views.map((item) => {
                        const Icon = item.icon;
                        const isActive = view === item.key;

                        return (
                            <button
                                key={item.key}
                                onClick={() => onViewChange(item.key)}
                                className={`
                                    flex w-full items-center gap-3 rounded-xl px-3 py-2.5
                                    text-sm font-medium transition-all
                                    ${isActive
                                        ? `${item.bg} ${item.color} shadow-sm`
                                        : "text-gray-600 hover:bg-gray-50"
                                    }
                                    ${collapsed ? "justify-center px-2" : ""}
                                `}
                            >
                                <Icon size={20} />
                                {!collapsed && <span>{item.label}</span>}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Stats */}
            {!collapsed && (
                <div className="flex-1 overflow-y-auto p-4">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
                        Summary
                    </p>

                    <div className="space-y-2">
                        {statsData.map((item) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={item.key}
                                    className="flex items-center justify-between rounded-xl bg-gray-50/50 px-3 py-2.5 transition-all hover:bg-gray-100/50"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`rounded-lg ${item.bg} p-1.5`}>
                                            <Icon size={16} className={item.color} />
                                        </div>
                                        <span className="text-sm text-gray-700">
                                            {item.label}
                                        </span>
                                    </div>
                                    <span className="font-semibold text-gray-900">
                                        {item.value}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {collapsed && (
                <div className="flex-1 flex flex-col items-center gap-3 pt-4">
                    {statsData.map((item) => {
                        const Icon = item.icon;
                        return (
                            <div
                                key={item.key}
                                className="relative group cursor-default"
                            >
                                <div className={`rounded-lg ${item.bg} p-2`}>
                                    <Icon size={18} className={item.color} />
                                </div>
                                {/* Tooltip */}
                                <div className="absolute left-full ml-2 hidden rounded-lg bg-gray-900 px-2 py-1 text-xs text-white group-hover:block">
                                    {item.label}: {item.value}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </aside>
    );
}