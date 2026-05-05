import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { getNotificationLink } from "@/lib/notificationLink";

export default function NotificationsPage() {
  const { notifications, unreadCount, loadNotifications, markRead, markAllRead, remove } = useNotifications();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadNotifications({ unreadOnly: showUnreadOnly, limit: 50, offset: 0 });
  }, [showUnreadOnly, loadNotifications]);

  const list = showUnreadOnly ? notifications.filter((n) => !n.isRead) : notifications;

  const handleClick = async (n: typeof notifications[number]) => {
    if (!n.isRead) {
      try { await markRead(n.id); } catch (_) { /* noop */ }
    }
    navigate(getNotificationLink(n));
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{unreadCount} unread</Badge>
            <Button variant="secondary" onClick={() => setShowUnreadOnly((v) => !v)}>
              {showUnreadOnly ? "Show All" : "Show Unread"}
            </Button>
            <Button variant="default" onClick={() => markAllRead()} disabled={unreadCount === 0}>
              <CheckCheck className="w-4 h-4 mr-1" />
              Mark all read
            </Button>
          </div>
        </div>

        <Card className="divide-y">
          {list.length === 0 ? (
            <div className="p-6 text-muted-foreground text-center">No notifications</div>
          ) : (
            list.map((n) => (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                onClick={() => handleClick(n)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleClick(n);
                  }
                }}
                className="p-4 flex items-start gap-4 cursor-pointer hover:bg-muted/40 transition-colors focus:outline-none focus:bg-muted/50"
              >
                <div className={`mt-1 w-2 h-2 rounded-full ${n.isRead ? "bg-muted-foreground/30" : "bg-destructive"}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 flex-col sm:flex-row">
                    <div className="min-w-0">
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-muted-foreground break-words">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                      {!n.isRead && (
                        <Button variant="outline" size="sm" onClick={() => markRead(n.id)}>
                          <CheckCheck className="w-4 h-4 mr-1" />
                          Mark read
                        </Button>
                      )}
                      <Button variant="outline" size="sm" className="text-destructive" onClick={() => remove(n.id)}>
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
}
