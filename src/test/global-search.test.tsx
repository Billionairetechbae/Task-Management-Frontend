import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

const mocks = vi.hoisted(() => ({ getTasks: vi.fn(), getProjects: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: mocks }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: "member" }) }));
import GlobalSearch from "@/components/dashboard/GlobalSearch";

function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
function renderSearch() {
  return render(<MemoryRouter initialEntries={["/dashboard"]}><GlobalSearch /><Location /><Routes><Route path="*" element={<div />} /></Routes></MemoryRouter>);
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("global search", () => {
  it("searches authorized current-workspace task and project APIs and opens the task result", async () => {
    mocks.getTasks.mockResolvedValue({ data: { tasks: [{ id: "task-1", title: "Prepare report", status: "pending", team: { name: "Ops" } }] } });
    mocks.getProjects.mockResolvedValue({ data: { projects: [{ id: "project-1", name: "Quarterly report", team: { name: "Ops" } }] } });
    renderSearch();
    const input = screen.getByRole("textbox", { name: "Search Admiino" });
    fireEvent.change(input, { target: { value: "report" } });
    await screen.findByRole("option", { name: /Prepare report/ });
    expect(mocks.getTasks).toHaveBeenCalledWith({ q: "report", limit: 8, page: 1 });
    expect(mocks.getProjects).toHaveBeenCalledWith({ search: "report" });
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
