import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({ globalSearch: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: mocks }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: "member" }) }));
import GlobalSearch from "@/components/dashboard/GlobalSearch";

function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function renderSearch() {
  return render(<MemoryRouter initialEntries={["/dashboard"]}><GlobalSearch /><Location /><Routes><Route path="*" element={<div />} /></Routes></MemoryRouter>);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("global search", () => {
  it("renders bounded authorized groups and opens the exact task destination", async () => {
    mocks.globalSearch.mockResolvedValue({ data: { groups: {
      Tasks: [{ id: "task-1", title: "Prepare report", subtitle: "pending", href: "/task-details/task-1" }],
      Projects: [{ id: "project-1", title: "Quarterly report", subtitle: "Project", href: "/projects/project-1" }],
      Subtasks: [{ id: "sub-1", title: "Collect figures", subtitle: "Subtask · Prepare report", href: "/task-details/task-1" }],
      Teams: [{ id: "team-1", title: "Ops", subtitle: "Team", href: "/teams?team=team-1" }],
      People: [{ id: "user-1", title: "Alex Doe", subtitle: "Workspace member", href: "/team-management?member=user-1" }],
      Templates: [{ id: "template-1", title: "Weekly report", subtitle: "Task template", href: "/templates" }],
      Files: [{ id: "file-1", title: "report.pdf", subtitle: "Attached to Prepare report", href: "/task-details/task-1?tab=files" }],
    } } });
    renderSearch();
    const input = screen.getByRole("textbox", { name: "Search Admiino" });
    fireEvent.change(input, { target: { value: "report" } });
    await screen.findByText("Prepare report");
    expect(mocks.globalSearch).toHaveBeenCalledWith("report");
    for (const section of ["Tasks", "Projects", "Subtasks", "Teams", "People", "Templates", "Files"]) expect(screen.getByRole("heading", { name: section })).toBeInTheDocument();
    fireEvent.keyDown(input, { key: "Enter" });
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/task-details/task-1"));
  });

  it("opens from Cmd/Ctrl+K and closes on Escape", async () => {
    renderSearch();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(screen.getByRole("textbox", { name: "Search Admiino" })).toHaveAttribute("aria-expanded", "true");
    fireEvent.keyDown(screen.getByRole("textbox", { name: "Search Admiino" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("listbox", { name: "Search results" })).not.toBeInTheDocument());
  });
});
