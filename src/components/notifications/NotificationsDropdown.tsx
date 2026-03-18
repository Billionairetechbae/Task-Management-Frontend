import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export default function NotificationsDropdown() {
  const { notifications, unreadCount, loadNotifications, markRead, markAllRead, remove } = useNotifications();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setLoading(true);
      loadNotifications().finally(() => setLoading(false));
    }
  }, [open, loadNotifications]);

  return (
    <TooltipProvider delayDuration={200}>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8">
                <Bell className="h-4 w-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] rounded-full bg-destructive text-destructive-foreground text-[9px] font-medium px-1 animate-scale-in">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          {!open && <TooltipContent>Notifications</TooltipContent>}
        </Tooltip>
        <DropdownMenuContent align="end" className="w-96 p-0 animate-scale-in">
          <div className="p-3 flex items-center justify-between">
            <DropdownMenuLabel className="p-0 text-sm">Notifications</DropdownMenuLabel>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] h-5">{unreadCount} unread</Badge>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllRead()} disabled={unreadCount === 0}>
                    <CheckCheck className="w-3.5 h-3.5 mr-1" />
                    Mark all
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Mark all as read</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <DropdownMenuSeparator />
          <ScrollArea className="max-h-[360px]">
            <div className="py-1">
              {loading && (
                <div className="px-3 py-8 text-sm text-muted-foreground text-center">Loading…</div>
              )}
              {!loading && notifications.length === 0 && (
                <div className="px-3 py-8 text-sm text-muted-foreground text-center">
                  <Bell className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40" />
                  No notifications
                </div>
              )}
              {!loading &&
                notifications.map((n, idx) => (
                  <div
                    key={n.id}
                    className={cn(
                      "px-3 py-2.5 text-sm hover:bg-muted/50 transition-colors duration-150 flex items-start gap-3 animate-slide-up",
                    )}
                    style={{ animationDelay: `${idx * 30}ms` }}
                  >
                    <div className={cn(
                      "mt-1.5 w-2 h-2 rounded-full flex-shrink-0 transition-colors",
                      n.isRead ? "bg-muted-foreground/20" : "bg-primary"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium leading-tight text-sm truncate">{n.title}</p>
                          <p className="text-muted-foreground mt-0.5 text-xs line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-muted-foreground/70 mt-1">
                            {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center gap-0.5 flex-shrink-0">
                          {!n.isRead && (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => markRead(n.id)}>
                                  <CheckCheck className="w-3.5 h-3.5" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent className="text-xs">Mark read</TooltipContent>
                            </Tooltip>
                          )}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive hover:text-destructive" onClick={() => remove(n.id)}>
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="text-xs">Delete</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </ScrollArea>
          <DropdownMenuSeparator />
          <div className="p-2">
            <Button asChild variant="ghost" className="w-full h-8 text-xs text-primary hover:text-primary">
              <Link to="/notifications">View all notifications</Link>
            </Button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  );
}
