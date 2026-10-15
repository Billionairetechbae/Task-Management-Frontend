import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getProjects: vi.fn(),
  listTeams: vi.fn(),
  auth: { activeCompanyId: "ws-1" as string | null },
}));

vi.mock("@/lib/api", () => ({ api: { getProjects: h.getProjects, listTeams: h.listTeams } }));
vi.mock("../lib/api", () => ({ api: { getProjects: h.getProjects, listTeams: h.listTeams } }));
vi.mock("../services/calendarService", () => ({ default: { getEvents: h.getEvents } }));
vi.mock("../contexts/AuthContext", () => ({ useAuth: () => h.auth }));
vi.mock("../components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("../components/CreateTaskDialog", () => ({ default: () => null }));
vi.mock("../components/WorkspaceSwitcher", () => ({ default: () => null, WorkspaceSwitcher: () => null }));

import CalendarPage from "../pages/Calendar";

const STATUSES = ["pending", "in_progress", "in_review", "completed", "delayed", "cancelled"] as const;
const LABEL: Record<string, string> = { pending: "Pending", in_progress: "In Progress", in_review: "In Review", completed: "Completed", delayed: "Delayed", cancelled: "Cancelled" };

// Mid-month, mid-day => always inside the current month view, never overdue-edge flaky.
const day = (offset = 0) => { const d = new Date(); d.setDate(15 + offset); d.setHours(12, 0, 0, 0); return d.toISOString(); };
const ev = (id: string, status: string, over: any = {}) => ({
  id, taskId: id, title: `Task ${id}`, start: day(), end: day(), status, priority: "medium",
  creator: null, project: null, assignees: [], task: { id, deadline: day(), status, teamId: null, parentTaskId: null }, ...over,
});

function Where() { const l = useLocation(); return <div data-testid="where">{l.pathname}</div>; }
/** Grid position of a month-view chip: week row + horizontal offset (sum of preceding segment widths). */
function position(chip: HTMLElement) {
  const segment = chip.closest(".rbc-row-segment") as HTMLElement;
  const row = segment.parentElement as HTMLElement;
  let offset = 0;
  for (const sib of Array.from(row.children)) {
    if (sib === segment) break;
    offset += parseFloat((sib as HTMLElement).style.flexBasis || "0");
  }
  const weeks = Array.from(document.querySelectorAll(".rbc-month-row"));
  return `${weeks.indexOf(chip.closest(".rbc-month-row") as Element)}|${offset.toFixed(2)}`;
}
function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    client,
    ...render(
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={["/calendar"]}>
          <Routes>
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="*" element={<Where />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  };
}

beforeEach(() => {
  h.getEvents.mockReset();
  h.getProjects.mockResolvedValue({ data: { projects: [{ id: "p1", name: "Finance" }] } });
  h.listTeams.mockResolvedValue({ data: { teams: [{ id: "team-1", name: "Operations" }] } });
  h.auth.activeCompanyId = "ws-1";
});

describe("Calendar page", () => {
  it("renders every status with text labels and status data attributes (completed/cancelled stay)", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: STATUSES.map((s) => ev(s, s)) });
    renderPage();
    const chips = await screen.findAllByTestId("calendar-event");
    expect(chips.map((c) => c.getAttribute("data-status")).sort()).toEqual([...STATUSES].sort());
    for (const s of STATUSES) {
      const chip = chips.find((c) => c.getAttribute("data-status") === s)!;
      expect(chip.getAttribute("aria-label")).toContain(LABEL[s]);
    }
  });

  it("default request has no status restriction", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [] });
    renderPage();
    await waitFor(() => expect(h.getEvents).toHaveBeenCalled());
    expect(h.getEvents.mock.calls[0][0].status).toBe("");
  });

  it("status filter sends only the selected statuses, and clearing returns to all", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [] });
    renderPage();
    await waitFor(() => expect(h.getEvents).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole("button", { name: "Toggle filters" }));
    await userEvent.click(await screen.findByRole("button", { name: "Completed" }));
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0].status).toBe("completed"));
    await userEvent.click(screen.getByRole("button", { name: "Cancelled" }));
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0].status).toBe("completed,cancelled"));
    await userEvent.click(screen.getByRole("button", { name: "Completed" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelled" }));
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0].status).toBe(""));
  });

  it("sends the selected team filter to the server", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [] });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Toggle filters" }));
    await userEvent.selectOptions(await screen.findByLabelText("Team"), "team-1");
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0].teamId).toBe("team-1"));
  });

  it("changes the toolbar heading for week and day views", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [] });
    renderPage();
    expect(await screen.findByRole("heading", { level: 2 })).toHaveTextContent(String(new Date().getFullYear()));
    await userEvent.click(screen.getAllByRole("button", { name: "Week" }).at(-1)!);
    expect(await screen.findByRole("heading", { level: 2 })).toHaveTextContent("–");
    await userEvent.click(screen.getAllByRole("button", { name: "Day" }).at(-1)!);
    expect(await screen.findByRole("heading", { level: 2 })).toHaveTextContent(String(new Date().getFullYear()));
  });

  it("search narrows events client-side", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("1", "pending", { title: "Monthly report" }), ev("2", "completed", { title: "Payroll" })] });
    renderPage();
    await screen.findAllByTestId("calendar-event");
    await userEvent.type(screen.getByRole("searchbox"), "payroll");
    const chips = await screen.findAllByTestId("calendar-event");
    expect(chips).toHaveLength(1);
    expect(chips[0].getAttribute("aria-label")).toContain("Payroll");
  });

  it("clicking a task opens quick view, whose action opens its workbench route", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("t1", "pending", { title: "Standalone" })] });
    renderPage();
    await userEvent.click(await screen.findByTestId("calendar-event"));
    expect(await screen.findByRole("complementary", { name: "Calendar task quick view" })).toHaveTextContent("Standalone");
    await userEvent.click(screen.getByRole("button", { name: "Open task" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/task-details/t1");
  });

  it("team task opens the team task route", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("t2", "pending", { task: { id: "t2", teamId: "tm1", deadline: day(), status: "pending" } })] });
    renderPage();
    await userEvent.click(await screen.findByTestId("calendar-event"));
    await userEvent.click(await screen.findByRole("button", { name: "Open task" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/teams/tm1/tasks/t2");
  });

  it("a multi-assignee task renders once", async () => {
    const e = ev("m", "pending", { assignees: [{ id: "a", firstName: "A", lastName: "B" }, { id: "c", firstName: "C", lastName: "D" }] });
    h.getEvents.mockResolvedValue({ success: true, events: [e, e] });
    renderPage();
    expect(await screen.findAllByTestId("calendar-event")).toHaveLength(1);
  });

  it("status change recolours the event and a deadline change moves it, without it disappearing", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("x", "pending")] });
    const { client, container } = renderPage();
    const chip0 = await screen.findByTestId("calendar-event");
    expect(chip0.getAttribute("data-status")).toBe("pending");
    const where0 = position(chip0);

    // The task is completed and re-dated elsewhere in the app; its mutation invalidates the calendar cache.
    h.getEvents.mockResolvedValue({
      success: true,
      events: [ev("x", "completed", { start: day(3), end: day(3), task: { id: "x", deadline: day(3), status: "completed" } })],
    });
    await client.invalidateQueries({ queryKey: ["calendar-events"] });

    await waitFor(() => expect(screen.getByTestId("calendar-event").getAttribute("data-status")).toBe("completed"));
    expect(screen.getAllByTestId("calendar-event")).toHaveLength(1);
    expect(position(screen.getByTestId("calendar-event"))).not.toBe(where0);
    expect(container.querySelectorAll('[data-testid="calendar-event"]')).toHaveLength(1);
  });
});

describe("navigation", () => {
  it("Previous/Next/Today change the requested range", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [] });
    renderPage();
    await waitFor(() => expect(h.getEvents).toHaveBeenCalledTimes(1));
    const first = h.getEvents.mock.calls[0][0].start as Date;
    await userEvent.click(screen.getByRole("button", { name: "Next period" }));
    await waitFor(() => expect(h.getEvents).toHaveBeenCalledTimes(2));
    const next = h.getEvents.mock.calls[1][0].start as Date;
    expect(next.getTime()).toBeGreaterThan(first.getTime());
    await userEvent.click(screen.getByRole("button", { name: "Previous period" }));
    await userEvent.click(screen.getByRole("button", { name: "Previous period" }));
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0].start.getTime()).toBeLessThan(first.getTime()));
    await userEvent.click(screen.getByRole("button", { name: /^today$/i }));
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0].start.getTime()).toBe(first.getTime()));
  });

  it("requests the full month window to the last millisecond (end-of-day deadlines included)", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [] });
    renderPage();
    await waitFor(() => expect(h.getEvents).toHaveBeenCalled());
    const { start, end } = h.getEvents.mock.calls[0][0];
    expect(start.getDate()).toBe(1);
    expect(end.getMilliseconds()).toBe(999);
    expect(end.getHours()).toBe(23);
  });
});

describe("workspace isolation", () => {
  it("includes the workspace in the cache key: switching workspace refetches and never shows the previous workspace's tasks", async () => {
    h.getEvents.mockImplementation(async () => {
      return { success: true, events: [ev(h.auth.activeCompanyId === "ws-1" ? "one" : "two", "pending", { title: h.auth.activeCompanyId === "ws-1" ? "WS1 task" : "WS2 task" })] };
    });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = () => (
      <QueryClientProvider client={client}>
        <MemoryRouter><CalendarPage /></MemoryRouter>
      </QueryClientProvider>
    );
    const { rerender } = render(tree());
    expect((await screen.findByTestId("calendar-event")).getAttribute("aria-label")).toContain("WS1 task");
    h.auth.activeCompanyId = "ws-2";
    rerender(tree());
    await waitFor(() => expect(screen.getByTestId("calendar-event").getAttribute("aria-label")).toContain("WS2 task"));
    expect(screen.queryByText(/WS1 task/)).toBeNull();
    expect(h.getEvents).toHaveBeenCalledTimes(2);
  });
});
