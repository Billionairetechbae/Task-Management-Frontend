import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock3, Loader2 } from "lucide-react";
import { api, type TimeEntry } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { localDateInput } from "@/lib/timeTrackingUtils";

export default function ManualTimeEntryDialog({ taskId, taskTitle, open, onOpenChange, onSaved, entry }: { taskId: string; taskTitle: string; open: boolean; onOpenChange: (open: boolean) => void; onSaved?: () => void; entry?: TimeEntry | null }) {
  const [date, setDate] = useState(localDateInput());
  const [hours, setHours] = useState("0");
  const [minutes, setMinutes] = useState("30");
  const [note, setNote] = useState("");
  const [billable, setBillable] = useState(false);
  useEffect(() => {
    if (!open) return;
    if (!entry) { setDate(localDateInput()); setHours("0"); setMinutes("30"); setNote(""); setBillable(false); return; }
    const minutesTotal = Math.floor((entry.durationSeconds || 0) / 60);
    setDate(entry.entryDate); setHours(String(Math.floor(minutesTotal / 60))); setMinutes(String(minutesTotal % 60)); setNote(entry.note || ""); setBillable(entry.billable);
  }, [open, entry]);
  const { toast } = useToast();
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      const h = Number(hours); const m = Number(minutes); const durationSeconds = (h * 60 + m) * 60;
      if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || m < 0 || m > 59 || durationSeconds <= 0 || durationSeconds > 86400) throw new Error("Enter a duration between 1 minute and 24 hours.");
      return entry ? api.updateTimeEntry(entry.id, { ...(entry.source === "manual" ? { date, durationSeconds } : {}), note, billable }) : api.createManualTimeEntry({ taskId, date, durationSeconds, note, billable });
    },
    onSuccess: () => {
      client.invalidateQueries({ queryKey: ["time-entries"] }); client.invalidateQueries({ queryKey: ["time-summary"] });
      toast({ title: entry ? "Time updated" : "Time logged", description: entry ? "Your time entry has been updated." : "Your time entry has been saved." });
      setNote(""); setBillable(false); onOpenChange(false); onSaved?.();
    },
    onError: (error: any) => toast({ title: "Could not log time", description: error?.message || "Please check the entry and try again.", variant: "destructive" }),
  });
  return <Dialog open={open} onOpenChange={(value) => !mutation.isPending && onOpenChange(value)}>
    <DialogContent className="sm:max-w-md">
      <DialogHeader><DialogTitle>{entry ? "Edit time entry" : "Log time"}</DialogTitle><DialogDescription>Record time spent on “{taskTitle}”. Entries are stored in seconds and shown in your local time.</DialogDescription></DialogHeader>
      <form className="space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}>
        {(!entry || entry.source === "manual") && <><div><label className="mb-1.5 flex items-center gap-2 text-sm font-medium" htmlFor="time-entry-duration"><Clock3 className="h-4 w-4" />Duration</label><div className="flex items-center gap-2"><Input id="time-entry-duration" type="number" min="0" max="24" value={hours} onChange={(event) => setHours(event.target.value)} aria-label="Hours" /><span className="text-sm text-muted-foreground">hours</span><Input type="number" min="0" max="59" value={minutes} onChange={(event) => setMinutes(event.target.value)} aria-label="Minutes" /><span className="text-sm text-muted-foreground">minutes</span></div></div>
        <div><label className="mb-1.5 flex items-center gap-2 text-sm font-medium" htmlFor="time-entry-date"><CalendarDays className="h-4 w-4" />Date</label><Input id="time-entry-date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></div></>}
        <div><label className="mb-1.5 block text-sm font-medium" htmlFor="time-entry-note">Note <span className="font-normal text-muted-foreground">(optional)</span></label><Textarea id="time-entry-note" value={note} maxLength={1000} onChange={(event) => setNote(event.target.value)} placeholder="What did you work on?" rows={3} /></div>
        <label className="flex items-start gap-2.5 rounded-lg border p-3 text-sm"><input type="checkbox" checked={billable} onChange={(event) => setBillable(event.target.checked)} className="mt-0.5 accent-primary" /><span><span className="block font-medium">Billable time</span><span className="text-xs text-muted-foreground">Mark this entry as billable. Admiino does not calculate rates or invoices.</span></span></label>
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>{mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{entry ? "Save changes" : "Save time"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>;
}
