import { useState, useEffect } from "react";
import { ProjectChecklist, ChecklistItem, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Check, ListChecks, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { EmptyState } from "@/components/dashboard/DashboardComponents";

interface ProjectChecklistsTabProps {
  projectId: string;
}

const ProjectChecklistsTab = ({ projectId }: ProjectChecklistsTabProps) => {
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<ProjectChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [newChecklistTitle, setNewChecklistTitle] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchChecklists = async () => {
    try {
      setLoading(true);
      const res = await api.getProjectChecklists(projectId);
      setChecklists(res.data.checklists || []);
    } catch (err) {
      console.error("Failed to fetch checklists", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChecklists();
  }, [projectId]);

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;
    try {
      setCreating(true);
      await api.createProjectChecklist(projectId, newChecklistTitle);
      setNewChecklistTitle("");
      fetchChecklists();
      toast({ title: "Checklist created" });
    } catch (err: any) {
      toast({ title: "Failed to create checklist", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteChecklist = async (checklistId: string) => {
    if (!confirm("Are you sure you want to delete this checklist?")) return;
    try {
      await api.deleteProjectChecklist(projectId, checklistId);
      setChecklists(checklists.filter(c => c.id !== checklistId));
      toast({ title: "Checklist deleted" });
    } catch (err: any) {
      toast({ title: "Failed to delete checklist", description: err.message, variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Project Checklists ({checklists.length})
        </h3>
        <form onSubmit={handleCreateChecklist} className="flex items-center gap-2">
          <Input
            value={newChecklistTitle}
            onChange={(e) => setNewChecklistTitle(e.target.value)}
            placeholder="New checklist title..."
            className="h-9 w-48 sm:w-64"
          />
          <Button type="submit" size="sm" disabled={creating || !newChecklistTitle.trim()}>
            {creating ? "Creating..." : "Add Checklist"}
          </Button>
        </form>
      </div>

      {checklists.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No checklists"
          description="Checklists help you break down complex projects into small, manageable steps."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {checklists.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              projectId={projectId}
              checklist={checklist}
              onDelete={() => handleDeleteChecklist(checklist.id)}
              onRefresh={fetchChecklists}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ChecklistCard = ({
  projectId,
  checklist,
  onDelete,
  onRefresh
}: {
  projectId: string;
  checklist: ProjectChecklist;
  onDelete: () => void;
  onRefresh: () => void;
}) => {
  const { toast } = useToast();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(checklist.title);
  const [newItemTitle, setNewItemTitle] = useState("");
  const [items, setItems] = useState<ChecklistItem[]>(checklist.items || []);

  const completedCount = items.filter(i => i.isCompleted).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  const handleUpdateTitle = async () => {
    if (title === checklist.title) return setIsEditingTitle(false);
    try {
      await api.updateProjectChecklist(projectId, checklist.id, title);
      setIsEditingTitle(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Failed to update title", description: err.message, variant: "destructive" });
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim()) return;
    try {
      const res = await api.createChecklistItem(projectId, checklist.id, newItemTitle);
      setItems([...items, res.data.item]);
      setNewItemTitle("");
    } catch (err: any) {
      toast({ title: "Failed to add item", description: err.message, variant: "destructive" });
    }
  };

  const handleToggleItem = async (itemId: string, isCompleted: boolean) => {
    // Optimistic update
    const oldItems = [...items];
    setItems(items.map(i => i.id === itemId ? { ...i, isCompleted } : i));

    try {
      await api.updateChecklistItem(projectId, checklist.id, itemId, { isCompleted });
    } catch (err: any) {
      setItems(oldItems);
      toast({ title: "Failed to update item", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.deleteChecklistItem(projectId, checklist.id, itemId);
      setItems(items.filter(i => i.id !== itemId));
    } catch (err: any) {
      toast({ title: "Failed to delete item", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="border border-border shadow-soft overflow-hidden group">
      <CardHeader className="p-4 pb-2">
        <div className="flex items-center justify-between gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1 flex-1">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleUpdateTitle}
                onKeyDown={(e) => e.key === "Enter" && handleUpdateTitle()}
                className="h-8 py-0"
                autoFocus
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingTitle(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <h4 className="font-semibold text-base truncate">{checklist.title}</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => setIsEditingTitle(true)}
              >
                <Pencil className="w-3 h-3" />
              </Button>
            </div>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditingTitle(true)}>Rename</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-2 space-y-1.5">
          <div className="flex justify-between text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5" />
        </div>
      </CardHeader>

      <CardContent className="p-4 pt-2 space-y-3">
        <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 py-1 group/item">
              <Checkbox
                checked={item.isCompleted}
                onCheckedChange={(checked) => handleToggleItem(item.id, !!checked)}
              />
              <span className={cn(
                "text-sm flex-1 transition-all",
                item.isCompleted && "text-muted-foreground line-through"
              )}>
                {item.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-item-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                onClick={() => handleDeleteItem(item.id)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>

        <form onSubmit={handleAddItem} className="flex items-center gap-2 pt-2 border-t border-border">
          <Input
            value={newItemTitle}
            onChange={(e) => setNewItemTitle(e.target.value)}
            placeholder="Add an item..."
            className="h-8 text-sm"
          />
          <Button type="submit" size="icon" variant="ghost" className="h-8 w-8" disabled={!newItemTitle.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default ProjectChecklistsTab;
