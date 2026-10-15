import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
    open: boolean;
    workspaces: { id: string; name: string }[];
    onOpenChange: (open: boolean) => void;
    onConfirm: (workspaceId: string) => void;
}

/**
 * Asked before creating a task from an "All workspaces" calendar, where no destination can be inferred.
 * Nothing is pre-selected on purpose: a task must never land in whichever workspace happens to be globally active.
 */
export default function WorkspacePickerDialog({ open, workspaces, onOpenChange, onConfirm }: Props) {
    const [choice, setChoice] = useState("");
    useEffect(() => { if (open) setChoice(""); }, [open]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                    <DialogTitle>Which workspace?</DialogTitle>
                    <DialogDescription>Choose where this task should be created.</DialogDescription>
                </DialogHeader>
                <label className="block text-sm font-medium">
                    Workspace
                    <select
                        value={choice}
                        onChange={(e) => setChoice(e.target.value)}
                        className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="" disabled>Select a workspace…</option>
                        {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                </label>
                <DialogFooter>
                    <button onClick={() => onOpenChange(false)} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
                    <button
                        disabled={!choice}
                        onClick={() => onConfirm(choice)}
                        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Continue
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
