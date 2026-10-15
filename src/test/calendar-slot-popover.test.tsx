import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

// jsdom has no layout, so react-big-calendar cannot resolve which cell was clicked.  The library's
// own slot detection is not what is under test here; its onSelectSlot contract is, so it is stubbed.
const h = vi.hoisted(() => ({ getEvents: vi.fn(), slot: { current: null as any } }));

vi.mock("react-big-calendar", async () => {
  const actual: any = await vi.importActual("react-big-calendar");
  return {
    ...actual,
    Calendar: ({ onSelectSlot, view }: any) => (
      <div data-testid={`stub-${view}`}>
        <button onClick={() => onSelectSlot(h.slot.current)}>empty-slot</button>
      </div>
    ),
  };
});
vi.mock("@/lib/api", () => ({ api: { getProjects: vi.fn().mockResolvedValue({ data: { projects: [] } }), listTeams: vi.fn().mockResolvedValue({ data: { teams: [] } }) } }));
vi.mock("../lib/api", () => ({ api: { getProjects: vi.fn().mockResolvedValue({ data: { projects: [] } }), listTeams: vi.fn().mockResolvedValue({ data: { teams: [] } }) } }));
vi.mock("../services/calendarService", () => ({ default: { getEvents: h.getEvents } }));
const auth = vi.hoisted(() => ({ id: "ws-1", set: vi.fn() }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("../contexts/AuthContext", async () => {
  const { useState } = await import("react");
  return { useAuth: () => { const [id, setId] = useState(auth.id); return { activeCompanyId: id, setActiveCompanyId: (x: string) => { auth.set(x); auth.id = x; setId(x); } }; } };
});
vi.mock("../components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("../components/WorkspaceSwitcher", () => ({ default: () => null, WorkspaceSwitcher: () => null }));
vi.mock("../components/CreateTaskDialog", () => ({
  default: ({ open, initialDeadline }: any) => (open ? <div data-testid="create-dialog" data-deadline={initialDeadline ?? ""} /> : null),
}));

import CalendarPage from "../pages/Calendar";

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter><CalendarPage /></MemoryRouter></QueryClientProvider>);
}

beforeEach(() => {
  h.getEvents.mockReset();
  h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [{ id: "ws-1", name: "Admiino" }] });
  auth.id = "ws-1"; auth.set.mockReset();
});

describe("Calendar empty-date quick create", () => {
  it("month cell: popover shows the date; New task opens the existing dialog pre-filled with that date at 17:00", async () => {
    h.slot.current = { start: new Date(2026, 9, 21, 0, 0), box: { clientX: 120, clientY: 80 } };
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "empty-slot" }));
    const pop = await screen.findByRole("dialog", { name: "Create task on this date" });
    expect(pop).toHaveTextContent("Wednesday, October 21");
    expect(pop).toHaveTextContent("Create a task due on this date");
    expect(screen.queryByTestId("create-dialog")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /New task/ }));
    expect((await screen.findByTestId("create-dialog")).getAttribute("data-deadline")).toBe("2026-10-21T17:00");
    expect(screen.queryByRole("dialog", { name: "Create task on this date" })).toBeNull();
  });

  it("time slot: keeps the clicked time", async () => {
    h.slot.current = { start: new Date(2026, 9, 21, 14, 30), box: { clientX: 300, clientY: 200 } };
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "Week" }).catch(() => screen.getAllByRole("button", { name: "Week" }).at(-1)!));
    await userEvent.click(await screen.findByRole("button", { name: "empty-slot" }));
    expect(await screen.findByRole("dialog", { name: "Create task on this date" })).toHaveTextContent("2:30 PM");
    await userEvent.click(screen.getByRole("button", { name: /New task/ }));
    expect((await screen.findByTestId("create-dialog")).getAttribute("data-deadline")).toBe("2026-10-21T14:30");
  });

  it("Escape closes the popover without opening the dialog", async () => {
    h.slot.current = { start: new Date(2026, 9, 21, 0, 0) };
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "empty-slot" }));
    await screen.findByRole("dialog", { name: "Create task on this date" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Create task on this date" })).toBeNull());
    expect(screen.queryByTestId("create-dialog")).toBeNull();
  });

  it("empty-date quick create in another workspace: the clicked date survives picker, confirmation and workspace switch", async () => {
    h.getEvents.mockResolvedValue({ success: true, events: [], workspaces: [{ id: "ws-1", name: "Admiino" }, { id: "ws-2", name: "Richie Tech" }] });
    h.slot.current = { start: new Date(2026, 9, 21, 0, 0), box: { clientX: 120, clientY: 80 } };
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "empty-slot" }));
    await userEvent.click(await screen.findByRole("button", { name: /New task/ }));
    const picker = await screen.findByRole("dialog", { name: "Which workspace?" });
    await userEvent.selectOptions(screen.getByLabelText("Workspace"), "ws-2");
    await userEvent.click(within(picker).getByRole("button", { name: "Continue" }));
    expect(auth.set).not.toHaveBeenCalled();
    await userEvent.click(within(await screen.findByRole("dialog", { name: "Create task in Richie Tech?" })).getByRole("button", { name: "Continue" }));
    expect(auth.set).toHaveBeenCalledWith("ws-2");
    expect((await screen.findByTestId("create-dialog")).getAttribute("data-deadline")).toBe("2026-10-21T17:00");
  });
});
