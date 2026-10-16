import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

type Props = {
  open: boolean; onOpenChange: (open: boolean) => void; taskId: string; taskTitle: string; hasDueDate: boolean; isRecurring: boolean;
  onSaved?: (templateId: string) => void;
};

/** Save this task as a shared task template. Only safe fields are copied; the opt-ins are off by default. */
export default function SaveAsTemplateDialog({ open, onOpenChange, taskId, taskTitle, hasDueDate, isRecurring, onSaved }: Props) {
  const { toast } = useToast();
  const [name, setName] = useState(taskTitle);
  const [description, setDescription] = useState("");
  const [keepAssignees, setKeepAssignees] = useState(false);
  const [deriveDueOffsets, setDeriveDueOffsets] = useState(false);
  const [includeRecurrence, setIncludeRecurrence] = useState(false);
  const [includeCustomFieldValues, setIncludeCustomFieldValues] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setName(taskTitle); setDescription(""); setKeepAssignees(false); setDeriveDueOffsets(false); setIncludeRecurrence(false); setIncludeCustomFieldValues(false); setError(null); } }, [open, taskTitle]);

  const save = async () => {
    setSaving(true); setError(null);
    try {
      const res = await api.saveTaskAsTemplate(taskId, { name: name.trim(), description: description.trim() || null, options: { keepAssignees, deriveDueOffsets, includeRecurrence, includeCustomFieldValues } });
      toast({ title: "Template saved", description: `"${res.data.template.name}" is now available in Templates.` });
      onSaved?.(res.data.template.id); onOpenChange(false);
    } catch (e) { setError((e as ApiError).message || "Couldn't save the template."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
          <DialogDescription>Creates a shared workspace task template from this task.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <label className="block text-xs font-medium">Template name
            <input aria-label="Template name" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} />
          </label>
          <label className="block text-xs font-medium">Description (optional)
            <input aria-label="Template description" className="mt-1 w-full rounded-md border px-3 py-2 text-sm" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} />
          </label>
          <p className="rounded-md bg-slate-50 p-2 text-xs text-muted-foreground">
            Copied: title, description, priority, category, estimated hours and its subtasks.<br />
            Never copied: status, hours logged, comments, files, activity, watchers, Google Calendar links, client access, dependencies or any ids.
          </p>
          <fieldset className="space-y-2">
            <legend className="text-xs font-medium">Optional</legend>
            <label className="flex items-center gap-2 text-xs"><input aria-label="Keep assignees" type="checkbox" checked={keepAssignees} onChange={(e) => setKeepAssignees(e.target.checked)} /> Keep current assignees as specific members</label>
            <label className="flex items-center gap-2 text-xs"><input aria-label="Use due dates as offsets" type="checkbox" checked={deriveDueOffsets} disabled={!hasDueDate} onChange={(e) => setDeriveDueOffsets(e.target.checked)} /> Turn due dates into "days after the start" (no time is copied){!hasDueDate && " — this task has no due date"}</label>
            <label className="flex items-center gap-2 text-xs"><input aria-label="Include repeat schedule" type="checkbox" checked={includeRecurrence} disabled={!isRecurring} onChange={(e) => { setIncludeRecurrence(e.target.checked); if (e.target.checked && hasDueDate) setDeriveDueOffsets(true); }} /> Include its repeat schedule{!isRecurring && " — this task doesn't repeat"}</label>
            <label className="flex items-center gap-2 text-xs"><input aria-label="Include custom field values" type="checkbox" checked={includeCustomFieldValues} onChange={(e) => setIncludeCustomFieldValues(e.target.checked)} /> Include custom field values</label>
          </fieldset>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={save} disabled={saving || !name.trim()}>{saving ? "Saving…" : "Save template"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
