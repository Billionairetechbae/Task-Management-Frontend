import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Loader2, Pencil, Play, Plus, Repeat } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, ApiError, type TemplateDetail, type TemplateSummary, type TemplateType, type TemplateUseResult } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import TemplateEditorDialog from "@/components/templates/TemplateEditorDialog";
import TemplateOutline from "@/components/templates/TemplateOutline";
import UseTemplateDialog from "@/components/templates/UseTemplateDialog";
import { useTemplateNavigation } from "@/components/templates/useTemplateNavigation";

export default function Templates() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<TemplateType>("task");
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState<{ open: boolean; template?: TemplateDetail }>({ open: false });
  const [preview, setPreview] = useState<TemplateDetail | null>(null);
  const [using, setUsing] = useState<TemplateSummary | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const goTask = useTemplateNavigation("task");
  const goProject = useTemplateNavigation("project");
  const onCreated = (r: TemplateUseResult) => { const type = using?.type ?? "task"; setUsing(null); (type === "project" ? goProject : goTask)(r); };

  const list = useQuery({
    queryKey: ["templates", tab, showArchived], retry: false, staleTime: 0,
    queryFn: async () => (await api.listTemplates({ type: tab, status: showArchived ? "all" : "active" })).data.templates,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["templates"] });
  const rows = list.data ?? [];
  const canManageAny = rows.some((t) => t.canManage);

  const open = async (t: TemplateSummary, then: (d: TemplateDetail) => void) => {
    try { then((await api.getTemplate(t.id)).data.template); }
    catch (e) { toast({ title: "Couldn't open template", description: (e as ApiError).message, variant: "destructive" }); }
  };
  const act = async (t: TemplateSummary, kind: "archive" | "restore") => {
    setBusy(t.id);
    try {
      if (kind === "archive") await api.archiveTemplate(t.id); else await api.restoreTemplate(t.id);
      toast({ title: kind === "archive" ? "Template archived" : "Template restored" });
      refresh();
    } catch (e) {
      const err = e as ApiError;
      toast({ title: kind === "restore" && err.statusCode === 409 ? "Name already in use" : "Action failed", description: err.statusCode === 409 && kind === "restore" ? "An active template already has this name. Rename one of them (edit this template, then restore)." : err.message, variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <DashboardLayout>
      <div className="w-full px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Templates</h1>
            <p className="mt-1 text-sm text-muted-foreground">Reusable task and project blueprints for this workspace.</p>
          </div>
          {canManageAny || rows.length === 0 ? (
            <Button onClick={() => setEditor({ open: true })} className="gap-2"><Plus className="h-4 w-4" /> New {tab} template</Button>
          ) : null}
        </div>

        <div role="tablist" className="mb-4 flex gap-1 border-b">
          {(["task", "project"] as const).map((t) => (
            <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium ${tab === t ? "border-b-2 border-primary text-primary" : "text-muted-foreground"}`}>
              {t === "task" ? "Task Templates" : "Project Templates"}
            </button>
          ))}
        </div>

        <label className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
          <input aria-label="Show archived" type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
        </label>

        {list.isLoading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
          : list.isError ? <p role="alert" className="text-sm text-muted-foreground">{(list.error as ApiError)?.statusCode === 503 ? "Templates aren't available yet for this environment." : (list.error as Error).message}</p>
          : rows.length === 0 ? <p className="text-sm text-muted-foreground">No {tab} templates yet.</p>
          : (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {rows.map((t) => (
                <li key={t.id} data-testid="template-card" className="rounded-lg border p-4">
                  <div className="flex items-start justify-between gap-2">
                    <button type="button" className="text-left font-semibold hover:underline" onClick={() => open(t, setPreview)}>{t.name}</button>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      {t.summary?.hasRecurrence && <Repeat size={12} className="text-indigo-600" aria-label="Repeats" />}
                      v{t.currentVersion}
                      {t.status === "archived" && <span className="rounded bg-slate-100 px-1.5 py-0.5">Archived</span>}
                    </span>
                  </div>
                  {t.description && <p className="mt-1 text-xs text-muted-foreground">{t.description}</p>}
                  {t.summary && <p className="mt-2 text-xs text-muted-foreground">{t.summary.taskCount} task(s){t.summary.subtaskCount ? `, ${t.summary.subtaskCount} subtask(s)` : ""}{t.summary.dependencyCount ? `, ${t.summary.dependencyCount} dependency link(s)` : ""}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {t.status === "active" && <Button size="sm" onClick={() => setUsing(t)} className="gap-1"><Play className="h-3 w-3" /> Use template</Button>}
                    {t.canManage && t.status === "active" && <Button size="sm" variant="outline" aria-label={`Edit ${t.name}`} onClick={() => open(t, (d) => setEditor({ open: true, template: d }))} className="gap-1"><Pencil className="h-3 w-3" /> Edit</Button>}
                    {t.canManage && t.status === "active" && <Button size="sm" variant="outline" aria-label={`Archive ${t.name}`} disabled={busy === t.id} onClick={() => act(t, "archive")} className="gap-1"><Archive className="h-3 w-3" /> Archive</Button>}
                    {t.canManage && t.status === "archived" && <Button size="sm" variant="outline" aria-label={`Restore ${t.name}`} disabled={busy === t.id} onClick={() => act(t, "restore")} className="gap-1"><ArchiveRestore className="h-3 w-3" /> Restore</Button>}
                  </div>
                </li>
              ))}
            </ul>
          )}

        <TemplateEditorDialog open={editor.open} onOpenChange={(o) => setEditor((s) => ({ ...s, open: o }))} type={editor.template?.type ?? tab} template={editor.template} onSaved={() => { setEditor({ open: false }); refresh(); }} />

        <Dialog open={Boolean(preview)} onOpenChange={(o) => { if (!o) setPreview(null); }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{preview?.name}</DialogTitle>
              <DialogDescription>Version {preview?.currentVersion}{preview?.status === "archived" ? " · archived" : ""}</DialogDescription>
            </DialogHeader>
            {preview && <TemplateOutline template={preview} />}
            {preview?.versions && preview.versions.length > 0 && (
              <p className="text-xs text-muted-foreground">{preview.versions.length} version(s) saved. Edits create a new version; past instantiations keep the version they used.</p>
            )}
          </DialogContent>
        </Dialog>

        <UseTemplateDialog open={Boolean(using)} onOpenChange={(o) => { if (!o) setUsing(null); }} template={using ? { id: using.id, type: using.type, name: using.name } : null} onDone={onCreated} />
      </div>
    </DashboardLayout>
  );
}
