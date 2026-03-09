import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, Notification } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  loadNotifications: (opts?: { unreadOnly?: boolean; limit?: number; offset?: number }) => Promise<void>;
  refreshUnreadCount: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  remove: (id: string) => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
};

export const NotificationsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const ws = useWebSocket();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);

  const loadNotifications = useCallback(async (opts?: { unreadOnly?: boolean; limit?: number; offset?: number }) => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getNotifications({
        unreadOnly: opts?.unreadOnly,
        limit: opts?.limit ?? 20,
        offset: opts?.offset ?? 0,
      });
      setNotifications(res.data.notifications || []);
    } catch (e) {
      console.error("Failed to load notifications", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const refreshUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.getUnreadNotificationsCount();
      setUnreadCount(res.data.count || 0);
    } catch (e) {
      console.error("Failed to get unread count", e);
    }
  }, [user]);

  const markRead = useCallback(async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true, readAt: new Date().toISOString() } : n)));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.error("Failed to mark as read", e);
    }
  }, []);

  const markAllRead = useCallback(async () => {
    try {
      await api.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true, readAt: n.readAt ?? new Date().toISOString() })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark all as read", e);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await api.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (e) {
      console.error("Failed to delete notification", e);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }
    loadNotifications();
    refreshUnreadCount();
  }, [user, loadNotifications, refreshUnreadCount]);

  useEffect(() => {
    type IncomingNotificationMessage = {
      type: string;
      notification?: Notification;
      data?: unknown;
    };
    const handler = (message: IncomingNotificationMessage) => {
      try {
        if (message?.type === "notification") {
          const candidate = (message.notification ??
            (typeof message.data === "object" && message.data ? (message.data as Notification) : undefined)) as
            | Notification
            | undefined;
          const notif: Notification | undefined = candidate;
          if (notif) {
            setNotifications((prev) => {
              const exists = prev.find((n) => n.id === notif.id);
              if (exists) return prev;
              return [notif, ...prev];
            });
            if (!notif.isRead) {
              setUnreadCount((c) => c + 1);
            }
          } else {
            // If only count provided
            setUnreadCount((c) => c + 1);
          }
        }
      } catch (e) {
        console.error("Error handling notification WS message", e);
      }
    };

    ws.on("notification", handler);
    return () => {
      ws.off("notification", handler);
    };
  }, [ws]);

  const value: NotificationsContextType = {
    notifications,
    unreadCount,
    loading,
    loadNotifications,
    refreshUnreadCount,
    markRead,
    markAllRead,
    remove,
  };

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
};
