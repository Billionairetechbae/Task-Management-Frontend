import React from "react";
import { X, Filter, ChevronDown } from "lucide-react";

interface CalendarFiltersProps {
    filters: {
        scope: "company" | "my" | "team";
        priority: string;
        status: string;
        projectId: string;
    };
    onChange(filters: CalendarFiltersProps["filters"]): void;
    onClose?: () => void;
}

export default function CalendarFilters({
    filters,
    onChange,
    onClose,
}: CalendarFiltersProps) {
    const filterSections = [
        {
            label: "Scope",
            key: "scope",
            options: [
                { value: "company", label: "Company" },
                { value: "my", label: "My" },
                { value: "team", label: "Team" },
            ],
        },
        {
            label: "Priority",
            key: "priority",
            options: [
                { value: "", label: "All" },
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
                { value: "urgent", label: "Urgent" },
            ],
        },
        {
            label: "Status",
            key: "status",
            options: [
                { value: "", label: "All" },
                { value: "todo", label: "To Do" },
                { value: "in_progress", label: "In Progress" },
                { value: "review", label: "Review" },
                { value: "completed", label: "Completed" },
            ],
        },
    ];

    const handleFilterChange = (key: string, value: string) => {
        onChange({ ...filters, [key]: value });
    };

    const clearFilters = () => {
        onChange({
            scope: "company",
            priority: "",
            status: "",
            projectId: "",
        });
    };

    const hasActiveFilters = filters.priority || filters.status || filters.projectId;

    return (
        <div className="rounded-xl bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-sm p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-blue-600" />
                    <h3 className="font-semibold text-gray-900">Filters</h3>
                    {hasActiveFilters && (
                        <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                            Active
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {hasActiveFilters && (
                        <button
                            onClick={clearFilters}
                            className="text-sm text-blue-600 hover:text-blue-800 font-medium transition-colors"
                        >
                            Clear all
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1 hover:bg-gray-100 transition-colors"
                    >
                        <X size={18} className="text-gray-500" />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {filterSections.map((section) => (
                    <div key={section.key}>
                        <label className="mb-1.5 block text-xs font-medium text-gray-600">
                            {section.label}
                        </label>
                        <select
                            value={filters[section.key as keyof typeof filters] as string}
                            onChange={(e) =>
                                handleFilterChange(section.key, e.target.value)
                            }
                            className="w-full rounded-lg border border-gray-300/60 bg-white px-3 py-2 text-sm text-gray-700 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        >
                            {section.options.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                </option>
                            ))}
                        </select>
                    </div>
                ))}

                {/* Project Filter */}
                <div>
                    <label className="mb-1.5 block text-xs font-medium text-gray-600">
                        Project
                    </label>
                    <input
                        type="text"
                        value={filters.projectId}
                        onChange={(e) =>
                            handleFilterChange("projectId", e.target.value)
                        }
                        placeholder="Search by project ID..."
                        className="w-full rounded-lg border border-gray-300/60 bg-white px-3 py-2 text-sm text-gray-700 placeholder:text-gray-400 transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                    />
                </div>
            </div>
        </div>
    );
}