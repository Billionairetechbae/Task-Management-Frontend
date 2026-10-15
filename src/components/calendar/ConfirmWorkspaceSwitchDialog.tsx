import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
    workspaceName: string | null;
    onCancel: () => void;
    onContinue: () => void;
}

/** Shown before the global active workspace changes so that a task can be created in another workspace. */
export default function ConfirmWorkspaceSwitchDialog({ workspaceName, onCancel, onContinue }: Props) {
    return (
        <Dialog open={workspaceName !== null} onOpenChange={(open) => { if (!open) onCancel(); }}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Create task in {workspaceName}?</DialogTitle>
                    <DialogDescription>
                        {workspaceName} needs to become your active workspace while this task is created. Your Calendar will continue showing tasks across all workspaces.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <button onClick={onCancel} className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50">Cancel</button>
                    <button onClick={onContinue} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Continue</button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
