import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Repeat } from "lucide-react";
import { api, type TemplateSummary, type TemplateType, type TemplateUseResult } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import UseTemplateDialog from "./UseTemplateDialog";

type Props = { type: TemplateType; open: boolean; onOpenChange: (open: boolean) => void; onCreated: (result: TemplateUseResult) => void };

/** "Use template" entry point (Create Task / Projects): pick an ACTIVE template, then run the use-template dialog. */
export default function UseTemplateFlow({ type, open, onOpenChange, onCreated }: Props) {
  const [selected, setSelected] = useState<TemplateSummary | null>(null);
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["templates-picker", type], enabled: open && !selected, staleTime: 0, retry: false,
    queryFn: async () => (await api.listTemplates({ type, status: "active" })).data.templates,
  });
  useEffect(() => { if (!open) { setSelected(null); setSearch(""); } }, [open]);

  const rows = (list.data ?? []).filter((t) => `${t.name} ${t.category ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));

  return (
    <>
      <Dialog open={open && !selected} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{type === "project" ? "New project from template" : "Use a task template"}</DialogTitle>
            <DialogDescription>Choose a template. You can review everything before anything is created.</DialogDescription>
          </DialogHeader>
          <input aria-label="Search templates" placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full rounded-md border px-3 py-2 text-sm" />
          {list.isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 size={14} className="animate-spin" /> Loading…</p>
            : list.isError ? <p role="alert" className="text-sm text-muted-foreground">{(list.error as Error)?.message || "Templates are unavailable right now."}</p>
            : rows.length === 0 ? <p className="text-sm text-muted-foreground">{(list.data ?? []).length === 0 ? `No ${type} templates yet. A workspace manager can create them from the Templates page.` : "No templates match your search."}</p>
            : (
              <ul className="space-y-2">
                {rows.map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setSelected(t)} className="w-full rounded-md border p-3 text-left hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500">
                      <span className="flex items-center justify-between gap-2"><span className="font-medium">{t.name}</span>{t.summary?.hasRecurrence && <Repeat size={12} className="text-indigo-600" aria-label="Repeats" />}</span>
                      {t.description && <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>}
                      {t.summary && <span className="mt-1 block text-xs text-muted-foreground">{t.summary.taskCount} task(s){t.summary.subtaskCount ? `, ${t.summary.subtaskCount} subtask(s)` : ""}</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
        </DialogContent>
      </Dialog>
      <UseTemplateDialog
        open={open && Boolean(selected)} onOpenChange={(next) => { if (!next) { setSelected(null); onOpenChange(false); } }}
        template={selected ? { id: selected.id, type: selected.type, name: selected.name } : null}
        onDone={(result) => { onCreated(result); }}
      />
    </>
  );
}
