import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWebSocket } from "@/contexts/WebSocketContext";

export const joinRequestKey = (companyId: string | null, params: object = {}) => ["workspaceJoinRequests", companyId, params] as const;
export const myJoinRequestKey = () => ["myWorkspaceJoinRequests"] as const;
const EVENT = "workspace_join_request_changed";

/** Subscribes to join-request changes and re-syncs once after a reconnect (events missed while offline). */
function useJoinRequestEvents(enabled: boolean, onChange: (message: { companyId?: string; status?: string }) => void, onReconnect: () => void) {
  const ws = useWebSocket();
  const wsRef = useRef(ws);
  wsRef.current = ws;
  const latest = useRef({ onChange, onReconnect });
  latest.current = { onChange, onReconnect };
  const wasConnected = useRef(ws.isConnected);

  useEffect(() => {
    if (!enabled) return;
    const handler = (message: { companyId?: string; status?: string }) => latest.current.onChange(message);
    wsRef.current.on(EVENT, handler);
    return () => wsRef.current.off(EVENT, handler);
  }, [enabled]);

  useEffect(() => {
    if (enabled && ws.isConnected && !wasConnected.current) latest.current.onReconnect();
    wasConnected.current = ws.isConnected;
  }, [enabled, ws.isConnected]);
}

/** Reviewer view: pending/history for the active workspace. Disabled for non-reviewers. */
export function useWorkspaceJoinRequests(params: { status?: string; search?: string; page?: number; pageSize?: number } = {}, enabled = true) {
  const { activeCompanyId } = useAuth();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: joinRequestKey(activeCompanyId, params),
    queryFn: () => api.listWorkspaceJoinRequests(params).then((response) => response.data),
    enabled: enabled && Boolean(activeCompanyId),
    staleTime: 30_000,
  });
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: ["workspaceJoinRequests", activeCompanyId] }); };
  useJoinRequestEvents(enabled, (message) => { if (!message.companyId || message.companyId === activeCompanyId) invalidate(); }, invalidate);
  return query;
}

/** Requester view: the signed-in user's own requests across workspaces. */
export function useMyWorkspaceJoinRequests(enabled = true) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: myJoinRequestKey(),
    queryFn: () => api.listMyWorkspaceJoinRequests().then((response) => response.data),
    enabled,
    staleTime: 30_000,
  });
  const invalidate = () => { void queryClient.invalidateQueries({ queryKey: myJoinRequestKey() }); };
  useJoinRequestEvents(enabled, invalidate, invalidate);
  return query;
}
