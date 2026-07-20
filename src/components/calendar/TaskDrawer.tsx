import { X, Calendar, Clock, Flag, User, Tag, FileText } from "lucide-react";
import { format } from "date-fns";

interface Props {
    open: boolean;
    task: any;
    onClose: () => void;
}

export default function TaskDrawer({
    open,
    task,
    onClose,
}: Props) {
    if (!open || !task) return null;

    const t = task.task ?? task;

    const statusColors: Record<string, string> = {
        todo: "bg-gray-100 text-gray-700",
        in_progress: "bg-blue-100 text-blue-700",
        review: "bg-purple-100 text-purple-700",
        completed: "bg-emerald-100 text-emerald-700",
    };

    const priorityColors: Record<string, string> = {
        low: "bg-emerald-100 text-emerald-700",
        medium: "bg-blue-100 text-blue-700",
        high: "bg-orange-100 text-orange-700",
        urgent: "bg-red-100 text-red-700",
    };

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 transition-opacity"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 h-full w-[440px] max-w-[90vw] bg-white shadow-2xl z-50 flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-200/60">
                    <h2 className="font-semibold text-lg text-gray-900 flex items-center gap-2">
                        <FileText size={20} className="text-blue-600" />
                        Task Details
                    </h2>
                    <button
                        onClick={onClose}
                        className="rounded-lg p-1.5 hover:bg-gray-100 transition-colors"
                    >
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Title
                        </label>
                        <p className="mt-1 text-lg font-semibold text-gray-900">
                            {t.title}
                        </p>
                    </div>

                    {/* Description */}
                    {t.description && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Description
                            </label>
                            <p className="mt-1 text-sm text-gray-700 leading-relaxed">
                                {t.description}
                            </p>
                        </div>
                    )}

                    {/* Status & Priority */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                            </label>
                            <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${statusColors[t.status] || "bg-gray-100 text-gray-700"}`}>
                                {t.status?.replace('_', ' ') || "Unknown"}
                            </span>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Priority
                            </label>
                            <span className={`mt-1 inline-block rounded-full px-3 py-1 text-xs font-medium ${priorityColors[t.priority] || "bg-gray-100 text-gray-700"}`}>
                                {t.priority || "None"}
                            </span>
                        </div>
                    </div>

                    {/* Dates */}
                    <div className="grid grid-cols-2 gap-4">
                        {t.deadline && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Deadline
                                </label>
                                <p className="mt-1 text-sm text-gray-700">
                                    {format(new Date(t.deadline), "MMM d, yyyy h:mm a")}
                                </p>
                            </div>
                        )}
                        {t.createdAt && (
                            <div>
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Created
                                </label>
                                <p className="mt-1 text-sm text-gray-700">
                                    {format(new Date(t.createdAt), "MMM d, yyyy")}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Project */}
                    {t.project && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Project
                            </label>
                            <p className="mt-1 text-sm text-gray-700">
                                {t.project.name}
                            </p>
                        </div>
                    )}

                    {/* Assignees */}
                    {t.assignees?.length > 0 && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Assignees
                            </label>
                            <div className="mt-2 flex flex-wrap gap-2">
                                {t.assignees.map((user: any) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5"
                                    >
                                        <img
                                            src={user.profilePictureUrl || "/default-avatar.png"}
                                            alt={`${user.firstName} ${user.lastName}`}
                                            className="h-6 w-6 rounded-full object-cover"
                                        />
                                        <span className="text-sm font-medium text-gray-700">
                                            {user.firstName} {user.lastName}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}