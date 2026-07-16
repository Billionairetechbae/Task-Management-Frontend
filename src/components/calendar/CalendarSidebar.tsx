import {
    CalendarDays,
    CalendarRange,
    Calendar,
    Plus,
    CheckCircle2,
    Clock3,
    AlertTriangle,
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
}

export default function CalendarSidebar({
    view,
    onViewChange,
    stats,
    onCreateTask,
}: Props) {
    const views = [
        {
            key: "month",
            label: "Month",
            icon: Calendar,
        },
        {
            key: "week",
            label: "Week",
            icon: CalendarRange,
        },
        {
            key: "day",
            label: "Day",
            icon: CalendarDays,
        },
    ] as const;

    return (
        <aside className="flex h-full w-72 flex-col border-r bg-white">

            <div className="border-b p-5">

                <button
                    onClick={onCreateTask}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-blue-700"
                >
                    <Plus size={18} />
                    New Task
                </button>

            </div>

            <div className="border-b p-5">

                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    View
                </p>

                <div className="space-y-2">

                    {views.map((item) => {

                        const Icon = item.icon;

                        return (
                            <button
                                key={item.key}
                                onClick={() => onViewChange(item.key)}
                                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                                    view === item.key
                                        ? "bg-blue-50 text-blue-700"
                                        : "hover:bg-gray-100"
                                }`}
                            >
                                <Icon size={18} />

                                {item.label}
                            </button>
                        );

                    })}

                </div>

            </div>

            <div className="flex-1 p-5">

                <p className="mb-4 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Summary
                </p>

                <div className="space-y-3">

                    <SummaryCard
                        icon={<Clock3 size={16} />}
                        label="Today's Tasks"
                        value={stats?.today ?? 0}
                    />

                    <SummaryCard
                        icon={<AlertTriangle size={16} />}
                        label="Overdue"
                        value={stats?.overdue ?? 0}
                    />

                    <SummaryCard
                        icon={<CheckCircle2 size={16} />}
                        label="Completed"
                        value={stats?.completed ?? 0}
                    />

                    <SummaryCard
                        icon={<Calendar size={16} />}
                        label="Total"
                        value={stats?.total ?? 0}
                    />

                </div>

            </div>

        </aside>
    );
}

interface SummaryCardProps {
    icon: React.ReactNode;
    label: string;
    value: number;
}

function SummaryCard({
    icon,
    label,
    value,
}: SummaryCardProps) {
    return (
        <div className="flex items-center justify-between rounded-lg border p-3">

            <div className="flex items-center gap-3">

                <div className="text-gray-500">
                    {icon}
                </div>

                <span className="text-sm">
                    {label}
                </span>

            </div>

            <span className="font-semibold">
                {value}
            </span>

        </div>
    );
}