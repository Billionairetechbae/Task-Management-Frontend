import React from "react";

interface CalendarFiltersProps {
    filters: {
        scope: "company" | "my" | "team";
        priority: string;
        status: string;
        projectId: string;
    };
    onChange(filters: CalendarFiltersProps["filters"]): void;
}

export default function CalendarFilters({
    filters,
    onChange,
}: CalendarFiltersProps) {
    return (
        <div className="rounded-lg border bg-white p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
                Filters
            </h3>
            <div className="space-y-4">
                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Scope
                    </label>

                    <select
                        value={filters.scope}
                        onChange={(e) =>
                            onChange({ ...filters, scope: e.target.value as CalendarFiltersProps["filters"]["scope"] })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="company">Company</option>
                        <option value="my">My</option>
                        <option value="team">Team</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Priority
                    </label>

                    <select
                        value={filters.priority}
                        onChange={(e) =>
                            onChange({ ...filters, priority: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="">All</option>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Status
                    </label>

                    <select
                        value={filters.status}
                        onChange={(e) =>
                            onChange({ ...filters, status: e.target.value })
                        }
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="">All</option>
                        <option value="todo">To Do</option>
                        <option value="in_progress">In Progress</option>
                        <option value="review">Review</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                        Project
                    </label>

                    <input
                        type="text"
                        value={filters.projectId}
                        onChange={(e) =>
                            onChange({ ...filters, projectId: e.target.value })
                        }
                        placeholder="Project ID"
                        className="w-full rounded-md border px-3 py-2 text-sm"
                    />
                </div>
            </div>
        </div>
    );
}