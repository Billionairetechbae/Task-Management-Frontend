import { renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ handlers: {} as Record<string, (m: any) => void> }));
vi.mock("@/lib/websocket", () => ({
  websocketService: {
    on: (event: string, fn: (m: any) => void) => { h.handlers[event] = fn; },
    off: (event: string) => { delete h.handlers[event]; },
  },
}));

import useRealtimeCacheSync from "../hooks/useRealtimeCacheSync";
import { CALENDAR_QUERY_KEY } from "../pages/Calendar";

vi.mock("../services/calendarService", () => ({ default: { getEvents: vi.fn() } }));
vi.mock("../lib/api", () => ({ api: {} }));
vi.mock("@/lib/api", () => ({ api: {} }));

describe("Calendar realtime invalidation (personal, cross-workspace)", () => {
  let client: QueryClient;
  beforeEach(() => { client = new QueryClient(); for (const k of Object.keys(h.handlers)) delete h.handlers[k]; });
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;

  it.each(["task_updated", "task_status_changed", "task_assigned", "task_created", "task_deleted"])(
    "%s marks every cached calendar range/filter stale, whatever workspace filter or active workspace is in use",
    (event) => {
      renderHook(() => useRealtimeCacheSync(true), { wrapper });
      // Calendar keys are [key, start, end, scope, workspaceId, ...]: the active workspace is not part of them.
      const keys = [
        [CALENDAR_QUERY_KEY, "2026-10-01", "2026-10-31", "my", "", "", "", "", ""],
        [CALENDAR_QUERY_KEY, "2026-10-01", "2026-10-31", "my", "ws-other", "", "", "", ""],
      ];
      keys.forEach((k) => client.setQueryData(k, { events: [], workspaces: [] }));
      h.handlers[event]({ task: { id: "t1", companyId: "ws-other" } });
      keys.forEach((k) => expect(client.getQueryState(k)?.isInvalidated).toBe(true));
    },
  );
});
