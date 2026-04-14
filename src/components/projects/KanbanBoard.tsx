import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";
import { getStatusDisplay, getPriorityBadgeClass, getPriorityDisplay } from "@/components/dashboard/TaskComponents";
import { format } from "date-fns";

interface KanbanTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  deadline?: string;
  assignee?: { firstName?: string; lastName?: string };
}

interface KanbanBoardProps {
  tasks: KanbanTask[];
}

const COLUMNS = [
  { key: "pending", label: "Pending", color: "bg-warning" },
  { key: "in_progress", label: "In Progress", color: "bg-primary" },
  { key: "completed", label: "Done", color: "bg-success" },
  { key: "cancelled", label: "Cancelled", color: "bg-muted-foreground" },
];

export default function KanbanBoard({ tasks }: KanbanBoardProps) {
  const navigate = useNavigate();

  const grouped = useMemo(() => {
    const map: Record<string, KanbanTask[]> = {};
    COLUMNS.forEach(c => { map[c.key] = []; });
    tasks.forEach(t => {
      const col = COLUMNS.find(c => c.key === t.status) ? t.status : "pending";
      map[col]?.push(t);
    });
    return map;
  }, [tasks]);

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-3 p-3 min-w-[700px]">
        {COLUMNS.map(col => {
          const items = grouped[col.key] || [];
          return (
            <div key={col.key} className="flex-1 min-w-[160px] max-w-[280px]">
              {/* Column header */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <div className={cn("w-2 h-2 rounded-full shrink-0", col.color)} />
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{col.label}</span>
                <Badge variant="outline" className="text-[9px] px-1 h-4 ml-auto">{items.length}</Badge>
              </div>

              {/* Cards */}
              <div className="space-y-2 min-h-[80px] bg-muted/20 rounded-lg p-1.5">
                {items.length === 0 && (
                  <div className="text-center py-6">
                    <p className="text-[10px] text-muted-foreground/50 italic">No tasks</p>
                  </div>
                )}
                {items.map(task => (
                  <div
                    key={task.id}
                    className="bg-card border border-border rounded-lg p-2.5 hover:shadow-elevated hover:border-primary/15 transition-all duration-200 cursor-pointer group"
                    onClick={() => navigate(`/task-details/${task.id}`)}
                  >
                    <p className="text-[12px] font-medium leading-tight mb-1.5 line-clamp-2">{task.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge variant="outline" className={cn("text-[8px] px-1 h-3.5", getPriorityBadgeClass(task.priority))}>
                        {getPriorityDisplay(task.priority)}
                      </Badge>
                      {task.deadline && (
                        <span className="text-[9px] text-muted-foreground">
                          {format(new Date(task.deadline), "MMM d")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      {task.assignee ? (
                        <Tooltip>
                          <TooltipTrigger>
                            <Avatar className="w-5 h-5">
                              <AvatarFallback className="text-[7px] font-bold bg-primary/10 text-primary">
                                {task.assignee.firstName?.[0]}{task.assignee.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px]">{task.assignee.firstName} {task.assignee.lastName}</TooltipContent>
                        </Tooltip>
                      ) : <div />}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button size="icon" variant="ghost" className="h-5 w-5" onClick={(e) => { e.stopPropagation(); navigate(`/task-details/${task.id}`); }}>
                              <Eye className="w-3 h-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[10px]">View</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
