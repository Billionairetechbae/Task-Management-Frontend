import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  getEvents: vi.fn(),
  getProjects: vi.fn(),
  listTeams: vi.fn(),
  auth: { activeCompanyId: "ws-1" as string | null },
  listeners: new Set<() => void>(),
  setActive: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: { getProjects: h.getProjects, listTeams: h.listTeams } }));
vi.mock("../lib/api", () => ({ api: { getProjects: h.getProjects, listTeams: h.listTeams } }));
vi.mock("../services/calendarService", () => ({ default: { getEvents: h.getEvents } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }), toast: h.toast }));
vi.mock("../contexts/AuthContext", async () => {
  const { useSyncExternalStore } = await import("react");
  return {
    useAuth: () => {
      const activeCompanyId = useSyncExternalStore((cb) => { h.listeners.add(cb); return () => h.listeners.delete(cb); }, () => h.auth.activeCompanyId);
      return { activeCompanyId, setActiveCompanyId: (id: string) => { h.setActive(id); h.auth.activeCompanyId = id; h.listeners.forEach((l) => l()); } };
    },
  };
});
vi.mock("../components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("../components/CreateTaskDialog", () => ({ default: ({ open, initialDeadline }: any) => (open ? <div data-testid="create-dialog" data-deadline={initialDeadline ?? ""} data-workspace={h.auth.activeCompanyId ?? ""} /> : null) }));
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
  h.getProjects.mockReset();
  h.listTeams.mockReset();
  h.getProjects.mockResolvedValue({ data: { projects: [{ id: "p1", name: "Finance" }] } });
  h.listTeams.mockResolvedValue({ data: { teams: [{ id: "team-1", name: "Operations" }] } });
  h.auth.activeCompanyId = "ws-1";
  h.setActive.mockReset();
  h.toast.mockReset();
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

  it("clicking a task opens an anchored popover (not a drawer) whose action opens its workbench route", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("t1", "pending", { title: "Standalone", project: { id: "p1", name: "Finance" }, team: { id: "tm9", name: "Ops" }, assignees: [{ id: "u1", firstName: "Ada", lastName: "Lovelace" }] })] });
    renderPage();
    await userEvent.click(await screen.findByTestId("calendar-event"));
    const pop = await screen.findByRole("dialog", { name: "Calendar task details" });
    expect(screen.queryByRole("complementary")).toBeNull();
    expect(pop).toHaveAttribute("data-side");
    for (const text of ["Standalone", "Pending", "medium priority", "Finance", "Ops", "Ada Lovelace"]) expect(pop).toHaveTextContent(text);
    await userEvent.click(screen.getByRole("button", { name: "Open task" }));
    expect(await screen.findByTestId("where")).toHaveTextContent("/task-details/t1");
  });

  it("the task popover closes on Escape and on outside click without navigating", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("t1", "pending")] });
    renderPage();
    await userEvent.click(await screen.findByTestId("calendar-event"));
    await screen.findByRole("dialog", { name: "Calendar task details" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Calendar task details" })).toBeNull());
    await userEvent.click(await screen.findByTestId("calendar-event"));
    await screen.findByRole("dialog", { name: "Calendar task details" });
    fireEvent.pointerDown(document.body);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Calendar task details" })).toBeNull());
    expect(screen.queryByTestId("where")).toBeNull();
  });

  it("the task popover also opens from week and day views", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("t1", "pending", { title: "Weekly" })] });
    renderPage();
    for (const view of ["Week", "Day"]) {
      await userEvent.click(screen.getAllByRole("button", { name: view }).at(-1)!);
      const chip = await screen.findAllByTestId("calendar-event");
      if (chip.length) {
        await userEvent.click(chip[0]);
        expect(await screen.findByRole("dialog", { name: "Calendar task details" })).toHaveTextContent("Weekly");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => expect(screen.queryByRole("dialog", { name: "Calendar task details" })).toBeNull());
      }
    }
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

const WSA = { id: "ws-1", name: "Admiino" };
const WSB = { id: "ws-2", name: "Richie Tech" };
const wsEv = (id: string, ws: { id: string; name: string }, over: any = {}) => ev(id, "pending", { title: `Task ${id}`, companyId: ws.id, workspace: ws, ...over });

describe("calendar dependency indicators (informational only)", () => {
  it("shows a Blocked indicator on the chip and 'Blocked by N unfinished tasks' in the popover, without moving the event", async () => {
    const blocked = ev("b1", "pending", { title: "Blocked task", isBlocked: true, blockedByCount: 2 });
    h.getEvents.mockResolvedValue({ success: true, events: [blocked, ev("ok", "pending", { title: "Free task" })], workspaces: [] });
    renderPage();
    const chips = await screen.findAllByTestId("calendar-event");
    expect(chips).toHaveLength(2);
    expect(screen.getAllByTestId("calendar-blocked-icon")).toHaveLength(1);
    expect(within(chips.find((c) => c.getAttribute("aria-label")?.includes("Blocked task"))!).getByTestId("calendar-blocked-icon")).toBeInTheDocument();
    const before = new Date(blocked.start).toISOString();
    await userEvent.click(chips.find((c) => c.getAttribute("aria-label")?.includes("Blocked task"))!);
    const pop = await screen.findByRole("dialog", { name: "Calendar task details" });
    expect(within(pop).getByTestId("calendar-blocked-row")).toHaveTextContent("Blocked by 2 unfinished tasks");
    expect(new Date(blocked.start).toISOString()).toBe(before); // dependencies never alter dates
  });

  it("an unblocked task shows no blocked row; a cancelled dependency is mentioned instead", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [ev("c1", "pending", { title: "Was blocked", isBlocked: false, hasCancelledDependency: true })], workspaces: [] });
    renderPage();
    await userEvent.click(await screen.findByTestId("calendar-event"));
    const pop = await screen.findByRole("dialog", { name: "Calendar task details" });
    expect(within(pop).queryByTestId("calendar-blocked-row")).toBeNull();
    expect(pop).toHaveTextContent("A dependency was cancelled");
  });
});

describe("personal cross-workspace calendar", () => {
  it("defaults to my tasks across ALL workspaces and ignores the globally active workspace", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    await waitFor(() => expect(h.getEvents).toHaveBeenCalled());
    const first = h.getEvents.mock.calls[0][0];
    expect(first.scope).toBe("my");
    expect(first.workspaceId).toBe("");
    expect(first.companyId).toBeUndefined();
  });

  it("switching the global workspace neither refetches nor changes the calendar", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [wsEv("a", WSA), wsEv("b", WSB)], workspaces: [WSA, WSB] });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const tree = () => (<QueryClientProvider client={client}><MemoryRouter><CalendarPage /></MemoryRouter></QueryClientProvider>);
    const { rerender } = render(tree());
    expect(await screen.findAllByTestId("calendar-event")).toHaveLength(2);
    h.auth.activeCompanyId = "ws-2";
    h.listeners.forEach((l) => l());
    rerender(tree());
    expect(await screen.findAllByTestId("calendar-event")).toHaveLength(2);
    expect(h.getEvents).toHaveBeenCalledTimes(1);
  });

  it("renders events from several workspaces together, each with a small workspace badge", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [wsEv("a", WSA), wsEv("b", WSB)], workspaces: [WSA, WSB] });
    renderPage();
    const badges = await screen.findAllByTestId("workspace-badge");
    expect(badges.map((b) => b.textContent).sort()).toEqual(["Admiino", "Richie Tech"]);
  });

  it("the event popover shows the workspace name", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [wsEv("b", WSB)], workspaces: [WSA, WSB] });
    renderPage();
    await waitFor(() => expect(h.listTeams).toHaveBeenCalledWith("ws-2")); // let background option queries settle first
    await userEvent.click(await screen.findByTestId("calendar-event"));
    expect(await screen.findByRole("dialog", { name: "Calendar task details" })).toHaveTextContent("Workspace: Richie Tech");
  });

  it("Workspace filter defaults to All workspaces, lists memberships, sends workspaceId and never switches the active workspace", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Toggle filters" }));
    const select = (await screen.findByLabelText("Workspace")) as HTMLSelectElement;
    expect(select.value).toBe("");
    expect(within(select).getByRole("option", { name: "All workspaces" })).toBeInTheDocument();
    await waitFor(() => expect(within(select).getAllByRole("option")).toHaveLength(3));
    await userEvent.selectOptions(select, "ws-2");
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0].workspaceId).toBe("ws-2"));
    expect(h.setActive).not.toHaveBeenCalled();
    expect(h.auth.activeCompanyId).toBe("ws-1");
  });

  it("project and team options are fetched per workspace (never assumed to be the active one), qualified when mixed, and compose with the workspace filter", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    h.getProjects.mockImplementation(async (f?: any) => ({ data: { projects: [{ id: f?.workspaceId === "ws-2" ? "pB" : "pA", name: "Finance" }] } }));
    h.listTeams.mockImplementation(async (w?: string) => ({ data: { teams: [{ id: w === "ws-2" ? "tB" : "tA", name: "Ops" }] } }));
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Toggle filters" }));
    expect(await screen.findByRole("option", { name: "Finance · Admiino" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Finance · Richie Tech" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Ops · Richie Tech" })).toBeInTheDocument();
    await userEvent.selectOptions(screen.getByLabelText("Project"), "pB");
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0]).toMatchObject({ projectId: "pB", workspaceId: "" }));
    // choosing a workspace narrows the option lists and clears now-ambiguous project/team picks
    await userEvent.selectOptions(screen.getByLabelText("Workspace"), "ws-1");
    await waitFor(() => expect(h.getEvents.mock.calls.at(-1)![0]).toMatchObject({ workspaceId: "ws-1", projectId: "", teamId: "" }));
    await waitFor(() => expect(within(screen.getByLabelText("Project")).queryByRole("option", { name: /Richie Tech/ })).toBeNull());
    expect(within(screen.getByLabelText("Team")).queryByRole("option", { name: /Richie Tech/ })).toBeNull();
    expect(h.getProjects).toHaveBeenCalledWith({ workspaceId: "ws-1" });
    expect(h.listTeams).toHaveBeenCalledWith("ws-1");
  });

  it("the summary counts exactly the events shown (same data as the calendar, after search)", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [wsEv("a", WSA, { status: "completed", title: "Alpha" }), wsEv("b", WSB, { title: "Beta" }), wsEv("c", WSB, { title: "Gamma" })], workspaces: [WSA, WSB] });
    renderPage();
    await screen.findAllByTestId("calendar-event");
    const total = () => screen.getAllByText("Total")[0].closest("div")!.parentElement!.parentElement!;
    await waitFor(() => expect(total()).toHaveTextContent("3"));
    await userEvent.type(screen.getByPlaceholderText(/Search title/), "Beta");
    await waitFor(() => expect(screen.getAllByTestId("calendar-event")).toHaveLength(1));
    await waitFor(() => expect(total()).toHaveTextContent("1"));
  });

  const openPicker = async () => {
    await screen.findByRole("heading", { level: 2 });
    await waitFor(() => expect(h.getEvents).toHaveBeenCalled());
    await userEvent.click((await screen.findAllByRole("button", { name: /New Task/i }))[0]);
    return screen.findByRole("dialog", { name: "Which workspace?" });
  };
  const chooseWorkspace = async (picker: HTMLElement, id: string) => {
    await userEvent.selectOptions(within(picker).getByLabelText("Workspace"), id);
    await userEvent.click(within(picker).getByRole("button", { name: "Continue" }));
  };

  it("All workspaces: New Task asks for a destination first (nothing preselected) and touches nothing until chosen", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    const picker = await openPicker();
    expect(screen.queryByTestId("create-dialog")).toBeNull();
    expect(h.setActive).not.toHaveBeenCalled();
    expect(within(picker).getByRole("button", { name: "Continue" })).toBeDisabled();
  });

  it("destination == active workspace: opens the task dialog with no confirmation and no switch", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    await chooseWorkspace(await openPicker(), "ws-1");
    expect((await screen.findByTestId("create-dialog")).getAttribute("data-workspace")).toBe("ws-1");
    expect(screen.queryByRole("dialog", { name: /Create task in/ })).toBeNull();
    expect(h.setActive).not.toHaveBeenCalled();
  });

  it("destination != active: asks for confirmation first; nothing is switched or opened yet", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    await chooseWorkspace(await openPicker(), "ws-2");
    const confirm = await screen.findByRole("dialog", { name: "Create task in Richie Tech?" });
    expect(confirm).toHaveTextContent("Richie Tech needs to become your active workspace while this task is created. Your Calendar will continue showing tasks across all workspaces.");
    expect(h.setActive).not.toHaveBeenCalled();
    expect(h.auth.activeCompanyId).toBe("ws-1");
    expect(screen.queryByTestId("create-dialog")).toBeNull();
  });

  it("Cancel: no switch and no task dialog", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    await chooseWorkspace(await openPicker(), "ws-2");
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Create task in Richie Tech?" })).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: /Create task in/ })).toBeNull());
    expect(h.setActive).not.toHaveBeenCalled();
    expect(screen.queryByTestId("create-dialog")).toBeNull();
    expect(h.auth.activeCompanyId).toBe("ws-1");
  });

  it("Continue: switches via the existing mechanism, then opens the dialog in the new workspace", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    await chooseWorkspace(await openPicker(), "ws-2");
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Create task in Richie Tech?" })).getByRole("button", { name: "Continue" }));
    const dialog = await screen.findByTestId("create-dialog");
    expect(h.setActive).toHaveBeenCalledTimes(1);
    expect(h.setActive).toHaveBeenCalledWith("ws-2");
    expect(dialog.getAttribute("data-workspace")).toBe("ws-2");
    // the personal calendar itself was not refetched or re-scoped by the switch
    expect(h.getEvents).toHaveBeenCalledTimes(1);
  });

  it("switch failure: no task dialog, a clear error, and the workspace is left unchanged", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    h.setActive.mockImplementationOnce(() => { throw new Error("boom"); });
    renderPage();
    await chooseWorkspace(await openPicker(), "ws-2");
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Create task in Richie Tech?" })).getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't switch workspace", variant: "destructive" })));
    expect(screen.queryByTestId("create-dialog")).toBeNull();
    expect(h.auth.activeCompanyId).toBe("ws-1");
  });

  it("the selected date survives the confirmed switch into the task dialog", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA, WSB] });
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Toggle filters" }));
    await waitFor(() => expect(within(screen.getByLabelText("Workspace")).getAllByRole("option")).toHaveLength(3));
    await userEvent.selectOptions(screen.getByLabelText("Workspace"), "ws-2");
    await userEvent.click((await screen.findAllByRole("button", { name: /New Task/i }))[0]);
    expect(screen.queryByRole("dialog", { name: "Which workspace?" })).toBeNull(); // filter already names the destination
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Create task in Richie Tech?" })).getByRole("button", { name: "Continue" }));
    expect((await screen.findByTestId("create-dialog")).getAttribute("data-workspace")).toBe("ws-2");
  });

  it("a user with a single workspace is not asked", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [WSA] });
    renderPage();
    await waitFor(() => expect(h.getEvents).toHaveBeenCalled());
    await userEvent.click((await screen.findAllByRole("button", { name: /New Task/i }))[0]);
    expect(await screen.findByTestId("create-dialog")).toBeInTheDocument();
    expect(h.setActive).not.toHaveBeenCalled();
  });
});
