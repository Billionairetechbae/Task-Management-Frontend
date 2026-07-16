import { X } from "lucide-react";

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

    return (
        <>
            <div
                className="fixed inset-0 bg-black/30 z-40"
                onClick={onClose}
            />

            <div className="fixed right-0 top-0 h-full w-[420px] bg-white shadow-xl z-50 flex flex-col">

                <div className="flex items-center justify-between p-5 border-b">
                    <h2 className="font-semibold text-lg">
                        Task Details
                    </h2>

                    <button onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 space-y-5 overflow-y-auto">

                    <div>
                        <p className="text-xs text-gray-500">
                            Title
                        </p>

                        <p className="font-medium">
                            {t.title}
                        </p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">
                            Description
                        </p>

                        <p>
                            {t.description || "No description"}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">

                        <div>
                            <p className="text-xs text-gray-500">
                                Status
                            </p>

                            <p>{t.status}</p>
                        </div>

                        <div>
                            <p className="text-xs text-gray-500">
                                Priority
                            </p>

                            <p>{t.priority}</p>
                        </div>

                    </div>

                    <div>
                        <p className="text-xs text-gray-500">
                            Deadline
                        </p>

                        <p>
                            {t.deadline
                                ? new Date(
                                      t.deadline
                                  ).toLocaleString()
                                : "-"}
                        </p>
                    </div>

                    {t.project && (
                        <div>
                            <p className="text-xs text-gray-500">
                                Project
                            </p>

                            <p>{t.project.name}</p>
                        </div>
                    )}

                </div>

            </div>
        </>
    );
}