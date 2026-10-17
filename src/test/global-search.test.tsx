import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({ globalSearch: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: mocks }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: "owner", activeCompanyId: "workspace-1" }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
import GlobalSearch from "@/components/dashboard/GlobalSearch";

function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function renderSearch() {
  return render(<MemoryRouter initialEntries={["/dashboard"]}><GlobalSearch /><Location /><Routes><Route path="*" element={<div />} /></Routes></MemoryRouter>);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("global search", () => {
  it("renders bounded authorized groups and opens the exact task destination", async () => {
    mocks.globalSearch.mockResolvedValue({ data: { groups: {
      tasks: [{ id: "task-1", title: "Prepare report", subtitle: "pending", href: "/task-details/task-1" }],
      projects: [{ id: "project-1", title: "Quarterly report", subtitle: "Project", href: "/projects/project-1" }],
      subtasks: [{ id: "sub-1", title: "Collect figures", subtitle: "Subtask · Prepare report", href: "/task-details/task-1" }],
      teams: [{ id: "team-1", title: "Ops", subtitle: "Team", href: "/teams?team=team-1" }],
      people: [{ id: "user-1", title: "Alex Doe", subtitle: "Workspace member", href: "/team-management?member=user-1" }],
      templates: [{ id: "template-1", title: "Weekly report", subtitle: "Task template", href: "/templates" }],
      files: [{ id: "file-1", title: "report.pdf", subtitle: "Attached to Prepare report", href: "/task-details/task-1?tab=files" }],
    } } });
    renderSearch();
    const input = screen.getByRole("textbox", { name: "Search Admiino" });
    fireEvent.change(input, { target: { value: "report" } });
    await screen.findAllByRole("option", { name: /Prepare report/ });
    expect(mocks.globalSearch).toHaveBeenCalledWith("report", "workspace-1", expect.any(AbortSignal));
    for (const section of ["Tasks", "Projects", "Subtasks", "Teams", "People", "Templates", "Files"]) expect(screen.getAllByRole("heading", { name: section }).length).toBeGreaterThan(0);
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/task-details/task-1"));
  });

  it("opens from Cmd/Ctrl+K and closes on Escape", async () => {
    renderSearch();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getAllByRole("textbox", { name: "Search Admiino" })[0]).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(screen.getAllByRole("textbox", { name: "Search Admiino" })[0], { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox", { name: "Search results" })).not.toBeInTheDocument());
  });

  it.each(["phase", "PHASE", "3D", "local"])("matches a real-looking partial task query case-insensitively: %s", async (query) => {
    mocks.globalSearch.mockResolvedValue({ data: { groups: { Tasks: [{ id: "phase-task", title: "Phase 3D Local Task", subtitle: "Pending", href: "/task-details/phase-task" }] } } });
    renderSearch();
    fireEvent.change(screen.getByRole("textbox", { name: "Search Admiino" }), { target: { value: query } });
    expect(await screen.findAllByRole("option", { name: /Phase 3D Local Task/ })).not.toHaveLength(0);
  });

  it.each([
    ["calendar", "Calendar", "/calendar"],
    ["drive", "Files & Drive", "/drive"],
    ["integration", "Integration", "/settings/integrations"],
    ["custom field", "Workspace Customization", "/settings/workspace/customization"],
  ])("provides guarded navigation for %s", async (query, title, href) => {
    mocks.globalSearch.mockResolvedValue({ data: { groups: {} } });
    renderSearch();
    const input = screen.getByRole("textbox", { name: "Search Admiino" });
    fireEvent.change(input, { target: { value: query } });
    fireEvent.click((await screen.findAllByRole("option", { name: new RegExp(title, "i") }))[0]);
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(href.split("?")[0]));
  });

  it("ignores an out-of-order response from an older query", async () => {
    let resolveOld!: (value: any) => void;
    mocks.globalSearch.mockImplementation((query: string) => query === "phase"
      ? new Promise((resolve) => { resolveOld = resolve; })
      : Promise.resolve({ data: { groups: { Tasks: [{ id: "new", title: "Local New Task", subtitle: "Task", href: "/task-details/new" }] } } }));
    renderSearch();
    const input = screen.getByRole("textbox", { name: "Search Admiino" });
    fireEvent.change(input, { target: { value: "phase" } });
    await waitFor(() => expect(mocks.globalSearch).toHaveBeenCalledWith("phase", "workspace-1", expect.any(AbortSignal)));
    fireEvent.change(input, { target: { value: "local" } });
    expect(await screen.findAllByRole("option", { name: /Local New Task/ })).not.toHaveLength(0);
    resolveOld({ data: { groups: { Tasks: [{ id: "old", title: "Phase stale result", subtitle: "Task", href: "/task-details/old" }] } } });
    await waitFor(() => expect(screen.queryByText("Phase stale result")).not.toBeInTheDocument());
  });
});
