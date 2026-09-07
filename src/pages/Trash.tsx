import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Loader2, RotateCcw, Trash2 } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api, ApiError, TrashItem, TrashItemType } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { expiryLabel } from "@/lib/workspaceLifecycle";

const PAGE_SIZE = 20;
const filters: Array<{ label: string; value: "all" | TrashItemType }> = [
  { label: "All", value: "all" }, { label: "Workspaces", value: "workspace" },
  { label: "Projects", value: "project" }, { label: "Tasks", value: "task" },
  { label: "Folders", value: "folder" }, { label: "Files", value: "file" },
];

const restoreConflictMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message.toLocaleLowerCase() : "";
  if (message.includes("workspace")) return "Restore the parent workspace first.";
  if (message.includes("project")) return "Restore the parent project first.";
  return error instanceof ApiError && error.statusCode === 403
    ? "You don't have permission to perform this action."
    : "We couldn't restore this item. Please try again.";
};

const Trash = () => {
  const { activeCompanyId, refreshWorkspaces } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | TrashItemType>("all");
  const [page, setPage] = useState(1);
  const [restoreItem, setRestoreItem] = useState<TrashItem | null>(null);
  const [deleteItem, setDeleteItem] = useState<TrashItem | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [nameConfirmation, setNameConfirmation] = useState("");
  const queryKey = ["trash", activeCompanyId];
  const trashQuery = useQuery({ queryKey, queryFn: async () => (await api.getTrash()).data.items || [] });
  const filtered = useMemo(() => {
    const items = trashQuery.data || [];
    return (filter === "all" ? [...items] : items.filter((item) => item.type === filter)).sort((a, b) => +new Date(b.deletedAt) - +new Date(a.deletedAt));
  }, [trashQuery.data, filter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  useEffect(() => setPage(1), [filter]);
  useEffect(() => { if (page > totalPages) setPage(totalPages); }, [page, totalPages]);

  const refreshRelated = async (item: TrashItem) => {
    await queryClient.invalidateQueries({ queryKey });
    const roots: Record<TrashItemType, string[]> = { workspace: ["dashboard"], project: ["projects"], task: ["tasks"], folder: ["drive"], file: ["drive", "tasks"] };
    for (const root of roots[item.type]) await queryClient.invalidateQueries({ predicate: (query) => query.queryKey[0] === root });
    if (item.type === "workspace") await refreshWorkspaces();
  };

  const restoreMutation = useMutation({
    mutationFn: (item: TrashItem) => api.restoreTrashItem(item.type, item.id),
    onSuccess: async (_, item) => { await refreshRelated(item); setRestoreItem(null); toast({ title: `${item.type[0].toUpperCase()}${item.type.slice(1)} restored.` }); },
    onError: (error) => toast({ title: "Restore failed", description: restoreConflictMessage(error), variant: "destructive" }),
  });
  const deleteMutation = useMutation({
    mutationFn: (item: TrashItem) => api.permanentlyDeleteTrashItem(item.type, item.id, item.type === "workspace" ? nameConfirmation : undefined),
    onSuccess: async (_, item) => { await refreshRelated(item); setDeleteItem(null); setConfirmed(false); setNameConfirmation(""); toast({ title: `${item.type[0].toUpperCase()}${item.type.slice(1)} permanently deleted.` }); },
    onError: (error) => toast({ title: "Permanent deletion failed", description: error instanceof ApiError && error.statusCode === 403 ? "You don't have permission to perform this action." : "We couldn't complete this action. Please try again.", variant: "destructive" }),
  });

  return <DashboardLayout><div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight">Trash</h1><p className="text-muted-foreground">Deleted items are kept for 30 days before they are permanently removed.</p></div>
    <Tabs value={filter} onValueChange={(value) => setFilter(value as typeof filter)}><TabsList className="h-auto max-w-full justify-start overflow-x-auto">{filters.map((entry) => <TabsTrigger key={entry.value} value={entry.value}>{entry.label}</TabsTrigger>)}</TabsList></Tabs>
    {trashQuery.isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin" /></div> : pageItems.length === 0 ? <Card><CardContent className="py-16 text-center text-muted-foreground">Trash is empty.</CardContent></Card> : <div className="space-y-3">{pageItems.map((item) => <Card key={`${item.type}-${item.id}`}><CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><Badge variant="secondary">{item.type}</Badge><p className="truncate font-medium">{item.name}</p></div><p className="mt-1 text-sm text-muted-foreground">Deleted {new Date(item.deletedAt).toLocaleDateString()} · {expiryLabel(item.expiresAt)}{item.parentName ? ` · From ${item.parentName}` : ""}</p></div>
      <div className="flex gap-2"><Button size="sm" variant="outline" disabled={item.canRestore === false} onClick={() => setRestoreItem(item)}><RotateCcw className="mr-2 h-4 w-4" />Restore</Button><Button size="sm" variant="destructive" disabled={item.canPermanentlyDelete === false} onClick={() => setDeleteItem(item)}><Trash2 className="mr-2 h-4 w-4" />Delete permanently</Button></div>
    </CardContent></Card>)}</div>}
    {totalPages > 1 && <div className="flex items-center justify-between"><p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((value) => value - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button><Button size="sm" variant="outline" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button></div></div>}
  </div>
  <Dialog open={!!restoreItem} onOpenChange={(open) => !open && setRestoreItem(null)}><DialogContent><DialogHeader><DialogTitle>Restore this {restoreItem?.type}?</DialogTitle><DialogDescription>It will return to its previous active location when its parent is available.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setRestoreItem(null)}>Cancel</Button><Button disabled={restoreMutation.isPending} onClick={() => restoreItem && restoreMutation.mutate(restoreItem)}>{restoreMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Restore</Button></DialogFooter></DialogContent></Dialog>
  <Dialog open={!!deleteItem} onOpenChange={(open) => { if (!open) { setDeleteItem(null); setConfirmed(false); setNameConfirmation(""); } }}><DialogContent><DialogHeader><DialogTitle>Permanently delete this item?</DialogTitle><DialogDescription>This action cannot be undone.{deleteItem?.type === "workspace" ? " This will permanently delete the workspace and its remaining projects, tasks, files and related data." : ""}</DialogDescription></DialogHeader>{deleteItem?.type === "workspace" ? <div className="space-y-2"><Label htmlFor="trash-name">Type {deleteItem.name} to confirm</Label><Input id="trash-name" value={nameConfirmation} onChange={(event) => setNameConfirmation(event.target.value)} /></div> : <label className="flex items-start gap-2 text-sm"><Checkbox checked={confirmed} onCheckedChange={(value) => setConfirmed(value === true)} />I understand this item cannot be restored after deletion.</label>}<DialogFooter><Button variant="outline" onClick={() => setDeleteItem(null)}>Cancel</Button><Button variant="destructive" disabled={deleteMutation.isPending || (deleteItem?.type === "workspace" ? nameConfirmation !== deleteItem.name : !confirmed)} onClick={() => deleteItem && deleteMutation.mutate(deleteItem)}>{deleteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Delete permanently</Button></DialogFooter></DialogContent></Dialog>
  </DashboardLayout>;
};

export default Trash;
