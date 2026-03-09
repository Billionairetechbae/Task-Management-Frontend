import { useEffect, useState } from "react";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

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
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-destructive text-destructive-foreground text-[10px] px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="p-3 flex items-center justify-between">
          <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{unreadCount} unread</Badge>
            <Button variant="ghost" size="sm" onClick={() => markAllRead()} disabled={unreadCount === 0}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          </div>
        </div>
        <DropdownMenuSeparator />
        <ScrollArea className="max-h-[360px]">
          <div className="py-1">
            {loading && (
              <div className="px-3 py-6 text-sm text-muted-foreground text-center">Loading…</div>
            )}
            {!loading && notifications.length === 0 && (
              <div className="px-3 py-6 text-sm text-muted-foreground text-center">No notifications</div>
            )}
            {!loading &&
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={`px-3 py-2.5 text-sm hover:bg-muted/50 transition flex items-start gap-3`}
                >
                  <div className={`mt-1 w-2 h-2 rounded-full ${n.isRead ? "bg-muted-foreground/30" : "bg-destructive"}`} />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{n.title}</p>
                        <p className="text-muted-foreground mt-0.5">{n.message}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {!n.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => markRead(n.id)}
                            title="Mark as read"
                          >
                            <CheckCheck className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-destructive"
                          onClick={() => remove(n.id)}
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
        <DropdownMenuSeparator />
        <div className="p-2">
          <Button asChild variant="outline" className="w-full">
            <Link to="/notifications">View all</Link>
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
