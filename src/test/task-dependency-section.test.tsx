import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getDeps: vi.fn(),
  getCandidates: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  toast: vi.fn(),
  handlers: {} as Record<string, () => void>,
}));

vi.mock("@/lib/api", () => ({
  api: { getTaskDependencies: h.getDeps, getTaskDependencyCandidates: h.getCandidates, addTaskDependency: h.add, removeTaskDependency: h.remove },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/contexts/WebSocketContext", () => ({
  useWebSocket: () => ({ on: (e: string, fn: () => void) => { h.handlers[e] = fn; }, off: (e: string) => { delete h.handlers[e]; } }),
}));

import TaskDependencySection from "../components/tasks/TaskDependencySection";

// cmdk needs these browser APIs, which jsdom lacks.
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any;
Element.prototype.scrollIntoView ??= () => {};

const graph = (over: any = {}) => ({
  dependsOn: [], blocking: [], isBlocked: false, unresolvedDependencyCount: 0, dependsOnCount: 0, blockingCount: 0,
  hasCancelledDependency: false, canManageDependencies: true, ...over,
});
const item = (id: string, title: string, status: string, over: any = {}) => ({
  linkId: `l-${id}`, status, resolved: status === "completed", cancelled: status === "cancelled", restricted: false,
  task: { id, title, status, deadline: "2026-10-20T10:00:00.000Z", assignees: [{ id: "u1", firstName: "Ada", lastName: "Lovelace" }], teamId: null, parentTaskId: null }, ...over,
});

function Where() { return <div data-testid="where">{useLocation().pathname}</div>; }
function renderSection() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/task-details/t1"]}>
        <Routes>
          <Route path="/task-details/t1" element={<TaskDependencySection taskId="t1" />} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}
const respond = (data: any) => h.getDeps.mockResolvedValue({ status: "success", data });

beforeEach(() => {
  for (const m of [h.getDeps, h.getCandidates, h.add, h.remove, h.toast]) m.mockReset();
  for (const k of Object.keys(h.handlers)) delete h.handlers[k];
  h.getCandidates.mockResolvedValue({ status: "success", data: { tasks: [] } });
});

describe("TaskDependencySection", () => {
  it("shows both relationship lists with status, due date and assignees, and the blocked banner", async () => {
    respond(graph({
      dependsOn: [item("p1", "Write spec", "in_progress"), item("p2", "Get sign-off", "completed")],
      blocking: [item("d1", "Launch campaign", "pending")],
      isBlocked: true, unresolvedDependencyCount: 1, dependsOnCount: 2, blockingCount: 1,
    }));
    renderSection();
    expect(await screen.findByText("Depends on (2)")).toBeInTheDocument();
    expect(screen.getByText("Blocking (1)")).toBeInTheDocument();
    expect(screen.getByText("Write spec")).toBeInTheDocument();
    expect(screen.getByText("Launch campaign")).toBeInTheDocument();
    expect(screen.getAllByText("Ada Lovelace").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^Due /).length).toBe(3);
    expect(screen.getByText("In Progress")).toBeInTheDocument();
    expect(screen.getByTestId("dependency-banner-blocked")).toHaveTextContent("Blocked · waiting on 1 unfinished task");
    expect(screen.queryByTestId("dependency-banner-unblocked")).toBeNull();
  });

  it("shows Unblocked when every dependency is finished", async () => {
    respond(graph({ dependsOn: [item("p2", "Get sign-off", "completed")], dependsOnCount: 1 }));
    renderSection();
    expect(await screen.findByTestId("dependency-banner-unblocked")).toHaveTextContent("Unblocked");
    expect(screen.queryByTestId("dependency-banner-blocked")).toBeNull();
  });

  it("a cancelled dependency does not block, shows 'A dependency was cancelled' and can be removed by an authorised user", async () => {
    respond(graph({ dependsOn: [item("p3", "Old plan", "cancelled")], dependsOnCount: 1, hasCancelledDependency: true }));
    h.remove.mockResolvedValue({ status: "success", data: graph() });
    renderSection();
    expect(await screen.findByTestId("dependency-cancelled-notice")).toHaveTextContent("A dependency was cancelled");
    expect(screen.queryByTestId("dependency-banner-blocked")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Remove dependency on Old plan" }));
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith("t1", "p3"));
  });

  it("restricted counterparts show no title; status only; still removable through their id", async () => {
    respond(graph({
      dependsOn: [{ linkId: "l-x", status: "pending", resolved: false, cancelled: false, restricted: true, taskId: "hidden-1" }],
      blocking: [{ linkId: "l-y", status: "pending", resolved: false, cancelled: false, restricted: true }],
      isBlocked: true, unresolvedDependencyCount: 1, dependsOnCount: 1, blockingCount: 1,
    }));
    h.remove.mockResolvedValue({ status: "success", data: graph() });
    renderSection();
    const rows = await screen.findAllByTestId("dependency-restricted");
    expect(rows).toHaveLength(2);
    rows.forEach((row) => expect(row).toHaveTextContent("A task you can't view"));
    expect(screen.getAllByText("Pending").length).toBe(2);
    const removers = screen.getAllByRole("button", { name: "Remove dependency" });
    expect(removers).toHaveLength(1); // only the predecessor side is removable from here
    await userEvent.click(removers[0]);
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith("t1", "hidden-1"));
  });

  it("without permission there is no Add or Remove control (and an empty graph renders nothing)", async () => {
    respond(graph({ canManageDependencies: false, dependsOn: [item("p1", "Write spec", "pending")], dependsOnCount: 1, isBlocked: true, unresolvedDependencyCount: 1 }));
    renderSection();
    await screen.findByText("Write spec");
    expect(screen.queryByRole("button", { name: /Add dependency/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Remove dependency/ })).toBeNull();
  });
  it("renders nothing when there are no links and the user cannot manage them", async () => {
    respond(graph({ canManageDependencies: false }));
    const { container } = renderSection();
    await waitFor(() => expect(h.getDeps).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });

  it("candidate search calls the backend endpoint; choosing a result adds it via the dedicated API", async () => {
    respond(graph());
    h.getCandidates.mockImplementation(async (_id: string, params: any) => ({
      status: "success", data: { tasks: params.q ? [{ id: "c9", title: "Budget review", status: "pending" }] : [{ id: "c1", title: "Anything", status: "pending" }] },
    }));
    h.add.mockResolvedValue({ status: "success", data: graph({ dependsOn: [item("c9", "Budget review", "pending")], dependsOnCount: 1, isBlocked: true, unresolvedDependencyCount: 1 }) });
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: /Add dependency/ }));
    expect(await screen.findByText("Anything")).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Search tasks to depend on"), "budget");
    await waitFor(() => expect(h.getCandidates).toHaveBeenLastCalledWith("t1", { q: "budget", limit: 20 }));
    await userEvent.click(await screen.findByText("Budget review"));
    await waitFor(() => expect(h.add).toHaveBeenCalledWith("t1", "c9"));
    expect(await screen.findByTestId("dependency-banner-blocked")).toBeInTheDocument();
  });

  it("a rejected add (e.g. cycle) shows the server message and changes nothing", async () => {
    respond(graph());
    h.getCandidates.mockResolvedValue({ status: "success", data: { tasks: [{ id: "c1", title: "Loop task", status: "pending" }] } });
    h.add.mockRejectedValue(new Error("This dependency would create a circular chain"));
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: /Add dependency/ }));
    await userEvent.click(await screen.findByText("Loop task"));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't add dependency", description: "This dependency would create a circular chain", variant: "destructive" })));
    expect(screen.queryByTestId("dependency-banner-blocked")).toBeNull();
  });

  it("opens a linked task", async () => {
    respond(graph({ dependsOn: [item("p1", "Write spec", "pending")], dependsOnCount: 1, isBlocked: true, unresolvedDependencyCount: 1 }));
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: "Write spec" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/task-details/p1");
  });

  it("refreshes in realtime when a task_updated event arrives (predecessor finished elsewhere)", async () => {
    h.getDeps.mockResolvedValueOnce({ status: "success", data: graph({ dependsOn: [item("p1", "Write spec", "in_progress")], dependsOnCount: 1, isBlocked: true, unresolvedDependencyCount: 1 }) });
    h.getDeps.mockResolvedValue({ status: "success", data: graph({ dependsOn: [item("p1", "Write spec", "completed")], dependsOnCount: 1 }) });
    renderSection();
    expect(await screen.findByTestId("dependency-banner-blocked")).toBeInTheDocument();
    h.handlers.task_updated();
    expect(await screen.findByTestId("dependency-banner-unblocked")).toBeInTheDocument();
    expect(h.getDeps).toHaveBeenCalledTimes(2);
  });
});

describe("integration points", () => {
  it("Task Details mounts the standalone section; lists, Board and Calendar use the shared badge", async () => {
    const fs = await import("node:fs"); const path = await import("node:path");
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
    expect(read("src/pages/TaskDetails.tsx")).toContain("<TaskDependencySection taskId={task.id}");
    for (const file of ["src/pages/Board.tsx", "src/pages/ProjectDetails.tsx", "src/components/dashboard/TaskComponents.tsx", "src/pages/TaskDetails.tsx"]) {
      expect(read(file), file).toContain("<BlockedBadge");
    }
    expect(read("src/components/calendar/CalendarEventPopover.tsx")).toContain("calendar-blocked-row");
    // TaskDetails must not grow dependency logic inline
    expect(read("src/pages/TaskDetails.tsx")).not.toMatch(/addTaskDependency|removeTaskDependency|getTaskDependencies/);
  });
});

describe("shared pieces", () => {
  it("BlockedBadge shows 'Blocked · N' only for blocked tasks", async () => {
    const { default: BlockedBadge } = await import("../components/tasks/BlockedBadge");
    const { rerender } = render(<BlockedBadge task={{ isBlocked: true, unresolvedDependencyCount: 2 }} />);
    expect(screen.getByTestId("blocked-badge")).toHaveTextContent("Blocked · 2");
    rerender(<BlockedBadge task={{ isBlocked: false, unresolvedDependencyCount: 0 }} />);
    expect(screen.queryByTestId("blocked-badge")).toBeNull();
    rerender(<BlockedBadge task={undefined} />);
    expect(screen.queryByTestId("blocked-badge")).toBeNull();
  });

  it("warning text matches the product copy and handles singular/plural", async () => {
    const { dependencyWarningMessage } = await import("../lib/taskDependencies");
    expect(dependencyWarningMessage([{ code: "BLOCKED_BY_INCOMPLETE_DEPENDENCIES", count: 2 }])).toBe("Moved, but 2 dependencies are unfinished.");
    expect(dependencyWarningMessage([{ code: "BLOCKED_BY_INCOMPLETE_DEPENDENCIES", count: 1 }])).toBe("Moved, but 1 dependency is unfinished.");
    expect(dependencyWarningMessage([])).toBeNull();
    expect(dependencyWarningMessage(undefined)).toBeNull();
  });

  it("activity labels for dependency_added/removed are readable and never carry a task title", async () => {
    const { getTaskActivityPresentation } = await import("../lib/taskActivityMapper");
    expect(getTaskActivityPresentation("dependency_added", { direction: "depends_on" })).toMatchObject({ label: "Dependency added", detail: "This task now depends on another task" });
    expect(getTaskActivityPresentation("dependency_added", { direction: "blocks" }).detail).toBe("Another task now depends on this task");
    expect(getTaskActivityPresentation("dependency_removed", { direction: "depends_on" })).toMatchObject({ label: "Dependency removed", detail: "This task no longer depends on another task" });
    expect(getTaskActivityPresentation("dependency_removed", { direction: "blocks" }).detail).toBe("Another task no longer depends on this task");
    expect(getTaskActivityPresentation("dependency_added").detail).toBeUndefined();
  });

  it("the activity timeline renders dependency entries without any task title", async () => {
    const { default: TaskActivityTimeline } = await import("../components/tasks/TaskActivityTimeline");
    render(
      <TaskActivityTimeline
        taskId="t1"
        initialActivities={[
          { id: "a1", actionType: "dependency_added", createdAt: "2026-10-15T10:00:00.000Z", oldValue: null, newValue: null, metadata: { linkId: "l", relatedTaskId: "x", direction: "depends_on" }, user: { firstName: "Ada", lastName: "Lovelace" } },
          { id: "a2", actionType: "dependency_removed", createdAt: "2026-10-15T11:00:00.000Z", oldValue: null, newValue: null, metadata: { linkId: "l", relatedTaskId: "x", direction: "blocks" } },
        ] as any}
      />
    );
    expect(screen.getByText("Dependency added")).toBeInTheDocument();
    expect(screen.getByText("This task now depends on another task")).toBeInTheDocument();
    expect(screen.getByText("Dependency removed")).toBeInTheDocument();
    expect(screen.getByText("Another task no longer depends on this task")).toBeInTheDocument();
  });
});
