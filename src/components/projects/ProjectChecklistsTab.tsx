import { useState } from "react";
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

interface ProjectChecklistsTabProps {
  projectId: string;
  checklists: ProjectChecklist[];
  loading: boolean;
  onAddChecklist: () => void;
  onRefresh: () => void;
}

const ProjectChecklistsTab = ({ projectId, checklists, loading, onAddChecklist, onRefresh }: ProjectChecklistsTabProps) => {
  const { toast } = useToast();

  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-32 bg-muted/50 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (checklists.length === 0) {
    return (
      <Card className="shadow-soft animate-fade-in">
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mb-4">
            <ListChecks className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">No checklists yet</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-xs">Break your project down into checklists to track detailed progress.</p>
          <Button onClick={onAddChecklist} size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add Checklist
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{checklists.length} checklist{checklists.length !== 1 ? "s" : ""}</p>
        <Button size="sm" variant="secondary" onClick={onAddChecklist}>
          <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Checklist
        </Button>
      </div>

      {checklists.map((checklist, idx) => (
        <ChecklistCard
          key={checklist.id}
          projectId={projectId}
          checklist={checklist}
          onRefresh={onRefresh}
          index={idx}
        />
      ))}
    </div>
  );
};

const ChecklistCard = ({
  projectId,
  checklist,
  onRefresh,
  index,
}: {
  projectId: string;
  checklist: ProjectChecklist;
  onRefresh: () => void;
  index: number;
}) => {
  const { toast } = useToast();
  const [newItemTitle, setNewItemTitle] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [showInput, setShowInput] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(checklist.title);
  const [togglingItems, setTogglingItems] = useState<Set<string>>(new Set());

  const items = checklist.items || [];
  const completed = items.filter(i => i.isCompleted).length;
  const total = items.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleToggleItem = async (item: ChecklistItem) => {
    setTogglingItems(prev => new Set(prev).add(item.id));
    try {
      await api.updateChecklistItem(projectId, checklist.id, item.id, { isCompleted: !item.isCompleted });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setTogglingItems(prev => { const s = new Set(prev); s.delete(item.id); return s; });
    }
  };

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    setAddingItem(true);
    try {
      await api.createChecklistItem(projectId, checklist.id, { title: newItemTitle.trim() });
      setNewItemTitle("");
      setShowInput(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setAddingItem(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.deleteChecklistItem(projectId, checklist.id, itemId);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleRename = async () => {
    if (!titleDraft.trim() || titleDraft.trim() === checklist.title) {
      setEditingTitle(false);
      return;
    }
    try {
      await api.updateProjectChecklist(projectId, checklist.id, { title: titleDraft.trim() });
      setEditingTitle(false);
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    try {
      await api.deleteProjectChecklist(projectId, checklist.id);
      toast({ title: "Checklist deleted" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Card className="shadow-soft hover:shadow-elevated transition-shadow duration-200" style={{ animationDelay: `${index * 60}ms` }}>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                className="h-8 text-sm"
                autoFocus
                onKeyDown={e => e.key === "Enter" && handleRename()}
              />
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={handleRename}><Check className="w-3.5 h-3.5" /></Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setEditingTitle(false); setTitleDraft(checklist.title); }}><X className="w-3.5 h-3.5" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-sm text-foreground truncate">{checklist.title}</h3>
              <span className="text-xs text-muted-foreground">{completed}/{total}</span>
            </div>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7"><MoreHorizontal className="w-4 h-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditingTitle(true)}>
              <Pencil className="w-3.5 h-3.5 mr-2" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onClick={handleDelete}>
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="space-y-2">
        {total > 0 && <Progress value={pct} className="h-1.5 mb-3" />}

        {items.map(item => (
          <div key={item.id} className="flex items-center gap-2.5 group py-1 rounded-md hover:bg-muted/50 px-1 transition-colors">
            <Checkbox
              checked={item.isCompleted}
              disabled={togglingItems.has(item.id)}
              onCheckedChange={() => handleToggleItem(item)}
              className="transition-all duration-200"
            />
            <span className={cn(
              "flex-1 text-sm transition-all duration-200",
              item.isCompleted && "line-through text-muted-foreground"
            )}>
              {item.title}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive"
                  onClick={() => handleDeleteItem(item.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Remove item</TooltipContent>
            </Tooltip>
          </div>
        ))}

        {showInput ? (
          <div className="flex items-center gap-2 mt-2">
            <Input
              placeholder="Item title..."
              value={newItemTitle}
              onChange={e => setNewItemTitle(e.target.value)}
              className="h-8 text-sm"
              autoFocus
              onKeyDown={e => e.key === "Enter" && handleAddItem()}
            />
            <Button size="sm" onClick={handleAddItem} disabled={addingItem || !newItemTitle.trim()}>
              {addingItem ? "..." : "Add"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowInput(false); setNewItemTitle(""); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground mt-1" onClick={() => setShowInput(true)}>
            <Plus className="w-3 h-3 mr-1" /> Add item
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default ProjectChecklistsTab;
