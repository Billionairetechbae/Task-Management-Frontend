import { useEffect, useState } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useNotifications } from "@/contexts/NotificationsContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCheck, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function NotificationsPage() {
  const { notifications, unreadCount, loadNotifications, markRead, markAllRead, remove } = useNotifications();
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  useEffect(() => {
    loadNotifications({ unreadOnly: showUnreadOnly, limit: 50, offset: 0 });
  }, [showUnreadOnly, loadNotifications]);

  const list = showUnreadOnly ? notifications.filter((n) => !n.isRead) : notifications;

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
              <div key={n.id} className="p-4 flex items-start gap-4">
                <div className={`mt-1 w-2 h-2 rounded-full ${n.isRead ? "bg-muted-foreground/30" : "bg-destructive"}`} />
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{n.title}</p>
                      <p className="text-muted-foreground">{n.message}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
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
