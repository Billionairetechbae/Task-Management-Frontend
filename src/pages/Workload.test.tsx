import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Workload from "@/pages/Workload";

const mocks = vi.hoisted(() => ({ auth: { activeCompanyId: "workspace-1" }, getWorkload: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => mocks.auth }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div> }));
vi.mock("@/lib/api", () => ({ api: { getWorkload: mocks.getWorkload } }));

const response = {
  status: "success",
  data: {
    scope: "workspace",
    summary: { activeMembers: 2, light: 0, balanced: 1, heavy: 0, overloaded: 1, unassignedTasks: 1, unassignedOverdueTasks: 0, unassignedDueSoonTasks: 1, overdueTasks: 2, dueSoonTasks: 1 },
    people: [
      { user: { id: "u1", firstName: "Amina", lastName: "Owner", avatar: null, role: "manager" }, teams: [{ id: "t1", name: "Delivery" }], metrics: { activeTasks: 8, overdueTasks: 2, dueSoonTasks: 1, highPriorityTasks: 3, activeProjects: 4 }, workload: { level: "overloaded", score: 14, reasons: ["8 active tasks", "2 overdue"] }, tasks: [{ id: "task-1", title: "Release plan", teamId: "t1", projectId: "p1", assigneeId: "u1", status: "pending", priority: "high", deadline: "2026-10-20T00:00:00.000Z" }] },
      { user: { id: "u2", firstName: "Bola", lastName: "Member", avatar: null, role: "member" }, teams: [{ id: "t1", name: "Delivery" }], metrics: { activeTasks: 2, overdueTasks: 0, dueSoonTasks: 0, highPriorityTasks: 0, activeProjects: 1 }, workload: { level: "balanced", score: 2, reasons: ["2 active tasks"] }, tasks: [] },
    ],
    teams: [{ id: "t1", name: "Delivery", lead: { id: "u1", firstName: "Amina", lastName: "Owner" }, memberCount: 2, metrics: { activeTasks: 10, overdueTasks: 2, dueSoonTasks: 1, highPriorityTasks: 3, activeProjects: 4 }, workload: { level: "overloaded", score: 16, reasons: ["10 active tasks", "2 overdue"] }, tasks: [] }],
    unassigned: [{ id: "task-2", title: "Unassigned review", teamId: null, projectId: null, assigneeId: null, status: "pending", priority: "urgent", deadline: null }],
    generatedAt: "2026-10-17T12:00:00.000Z",
  },
} as any;

function LocationText() { const location = useLocation(); return <output data-testid="path">{location.pathname}</output>; }
function renderPage() { const client = new QueryClient({ defaultOptions: { queries: { retry: false } } }); return render(<QueryClientProvider client={client}><MemoryRouter><Workload /><LocationText /></MemoryRouter></QueryClientProvider>); }

beforeEach(() => { mocks.auth = { activeCompanyId: "workspace-1" }; mocks.getWorkload.mockReset().mockResolvedValue(response); });

describe("Workload page", () => {
  it("renders workload summaries, people table and mobile cards", async () => {
    const { container } = renderPage();
    expect(await screen.findByText("Active Members")).toBeTruthy();
    expect(screen.getByText("Unassigned active work")).toBeTruthy();
    expect(screen.getAllByText("Amina Owner").length).toBeGreaterThan(0);
    expect(container.querySelector("table")?.parentElement?.className).toContain("lg:block");
    expect(container.querySelector("table")?.parentElement?.nextElementSibling?.className).toContain("lg:hidden");
  });

  it("supports People and Teams tabs", async () => {
    renderPage();
    await screen.findAllByText("Amina Owner");
    fireEvent.click(screen.getByRole("tab", { name: /Teams/ }));
    expect((await screen.findAllByText("Delivery")).length).toBeGreaterThan(0);
    expect(screen.getAllByText("2", { selector: "td" }).length).toBeGreaterThan(0);
  });

  it("combines search and workload filters", async () => {
    renderPage();
    await screen.findAllByText("Amina Owner");
    fireEvent.change(screen.getByLabelText("Search workload"), { target: { value: "BOLA" } });
    expect(screen.getAllByText("Bola Member").length).toBeGreaterThan(0);
    expect(screen.queryByText("Amina Owner")).toBeNull();
    fireEvent.change(screen.getByLabelText("Search workload"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Workload"), { target: { value: "overloaded" } });
    expect(screen.getAllByText("Amina Owner").length).toBeGreaterThan(0);
    expect(screen.queryByText("Bola Member")).toBeNull();
  });

  it("opens an assigned task from workload detail and navigates to that task", async () => {
    renderPage();
    await screen.findAllByText("Amina Owner");
    fireEvent.click(screen.getAllByRole("button", { name: "View work" })[0]);
    expect(await screen.findByText("Active assigned tasks (1)")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Release plan/ }));
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/tasks/task-1"));
  });

  it("shows unassigned work and navigates to the existing task route", async () => {
    renderPage();
    expect(await screen.findByText("Unassigned review")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Unassigned review/ }));
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/tasks/task-2"));
  });

  it("shows a permission denial when a member is not a Team Lead and lacks workspace access", async () => {
    const forbidden = Object.assign(new Error("forbidden"), { statusCode: 403 });
    mocks.getWorkload.mockRejectedValueOnce(forbidden);
    renderPage();
    expect(await screen.findByRole("heading", { name: "Workload access is restricted" })).toBeTruthy();
  });
});
