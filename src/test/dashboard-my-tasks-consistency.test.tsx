import { describe, expect, it, vi, beforeEach } from "vitest";

const api = vi.hoisted(() => ({ getMyTaskSummary: vi.fn(), getAllTasksCrossWorkspace: vi.fn(), getExecutiveDashboard: vi.fn(), getTasks: vi.fn() }));
vi.mock("@/lib/api", () => ({ api }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ activeCompanyId: "w1", workspaceRole: "member", user: { id: "kv" } }) }));

import { fetchDashboardData } from "@/hooks/useCoreQueries";

const task = (id: string, status: string, extra: Record<string, unknown> = {}) => ({ id, title: id, status, creator: { id: "kv" }, assigneeId: null, assignees: [], ...extra });
const summary = { relation: "all", totalTasks: 3, pendingTasks: 1, inProgressTasks: 0, inReviewTasks: 0, delayedTasks: 0, completedTasks: 2, cancelledTasks: 0, openTasks: 1, overdueTasks: 0, urgentTasks: 0, completionRate: 66.7 };

describe("Dashboard personal tasks use the canonical My Tasks population", () => {
  beforeEach(() => {
    Object.values(api).forEach((fn) => fn.mockReset());
    api.getMyTaskSummary.mockResolvedValue({ data: { summary } });
    api.getAllTasksCrossWorkspace.mockResolvedValue({ data: { tasks: [
      task("done-1", "completed", { assigneeId: "kv" }), task("done-2", "completed", { assigneeId: "kv" }),
      task("project-richie", "pending", { assigneeId: "richard", assignees: [{ id: "richard" }] }),
    ] } });
  });

  it("regression: a member's task created by them and assigned to someone else is on the Dashboard and counted", async () => {
    const data = await fetchDashboardData("member", "kv");
    expect(data.tasks.map((t) => t.id)).toContain("project-richie");
    expect(data.taskStats).toMatchObject({ totalTasks: 3, completedTasks: 2, pendingTasks: 1, completionRate: 66.7 });
    expect(data.myStats).toEqual(data.taskStats);
  });

  it("uses the same endpoint scope as /tasks/my (assigned_workspace) and the server summary, never a client-side assignee filter", async () => {
    await fetchDashboardData("member", "kv");
    expect(api.getAllTasksCrossWorkspace).toHaveBeenCalledWith(expect.objectContaining({ scope: "assigned_workspace" }));
    expect(api.getMyTaskSummary).toHaveBeenCalledTimes(1);
    expect(api.getTasks).not.toHaveBeenCalled();
  });

  it("subtasks are not listed as personal tasks", async () => {
    api.getAllTasksCrossWorkspace.mockResolvedValue({ data: { tasks: [task("parent", "pending"), task("child", "pending", { parentTaskId: "parent" })] } });
    expect((await fetchDashboardData("member", "kv")).tasks.map((t) => t.id)).toEqual(["parent"]);
  });

  it("managers keep workspace-wide totals AND get personal stats/list for the My Tasks view", async () => {
    api.getExecutiveDashboard.mockResolvedValue({ data: { overview: { team: {}, tasks: { totalTasks: 40, pendingTasks: 10, inProgressTasks: 5, completedTasks: 25, overdueTasks: 2, urgentTasks: 1, completionRate: 62 } }, recentActivity: { tasks: [task("ws-1", "pending")] } } });
    const data = await fetchDashboardData("admin", "kv");
    expect(data.taskStats.totalTasks).toBe(40);
    expect(data.tasks.map((t) => t.id)).toEqual(["ws-1"]);
    expect(data.myStats.totalTasks).toBe(3);
    expect(data.myTasks.map((t) => t.id)).toContain("project-richie");
  });

  it("an API failure surfaces as an error instead of silently showing zeros", async () => {
    api.getMyTaskSummary.mockRejectedValue(new Error("boom"));
    await expect(fetchDashboardData("member", "kv")).rejects.toThrow("boom");
  });

  it("version skew: a backend WITHOUT /tasks/my/summary (404) degrades the metrics instead of breaking the Dashboard", async () => {
    api.getMyTaskSummary.mockRejectedValue(Object.assign(new Error("Route not found"), { name: "ApiError", statusCode: 404 }));
    const data = await fetchDashboardData("member", "kv");
    expect(data.tasks.map((t) => t.id)).toContain("project-richie");
    expect(data.taskStats).toMatchObject({ totalTasks: 3, completedTasks: 2, pendingTasks: 1, completionRate: 66.7 });
  });

  it("an outage (503) on the summary is NOT mistaken for version skew: it surfaces so the UI can retry", async () => {
    api.getMyTaskSummary.mockRejectedValue(Object.assign(new Error("unavailable"), { name: "ApiError", statusCode: 503 }));
    await expect(fetchDashboardData("member", "kv")).rejects.toMatchObject({ statusCode: 503 });
  });
});
