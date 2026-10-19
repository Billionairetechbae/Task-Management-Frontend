import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { MemoryRouter } from "react-router-dom";
import { PICKER_RENDER_LIMIT, ResourcePicker, type PickerTarget } from "@/components/connectedStorage/ResourcePicker";

const projects = [{ id: "p1", name: "Website Relaunch" }, { id: "p2", name: "Annual Report" }];
const tasks = [
  { id: "t1", title: "Write homepage copy", projectId: "p1", projectName: "Website Relaunch" },
  { id: "t2", title: "Collect KPI tables", projectId: "p2", projectName: "Annual Report" },
  { id: "t3", title: "Book venue (no project)", projectId: null, projectName: null },
];

function Harness({ onQuery, extraTasks = [], initial = null }: { onQuery?: (q: { q: string; projectId: string | null }) => void; extraTasks?: typeof tasks; initial?: PickerTarget | null }) {
  const [value, setValue] = useState<PickerTarget | null>(initial);
  return <ResourcePicker projects={projects} tasks={[...tasks, ...extraTasks]} value={value} onChange={setValue} onTaskQuery={onQuery} selectedLabel={value ? "chosen" : null} />;
}
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe("ResourcePicker", () => {
  it("lists Projects first, searches by name and selects with a visible indicator and clear action", async () => {
    const user = userEvent.setup(); render(<Harness />);
    expect(screen.getByRole("tab", { name: /Projects/ })).toHaveAttribute("aria-selected", "true");
    expect(within(screen.getByRole("listbox", { name: "Projects" })).getAllByRole("option")).toHaveLength(2);
    await user.type(screen.getByRole("combobox", { name: "Search projects" }), "annual");
    const options = within(screen.getByRole("listbox")).getAllByRole("option"); expect(options).toHaveLength(1);
    await user.click(options[0]);
    expect(screen.getByRole("option", { name: "Annual Report" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("picker-selection")).toHaveTextContent("chosen");
    await user.click(screen.getByRole("button", { name: "Clear selection" })); expect(screen.queryByTestId("picker-selection")).not.toBeInTheDocument();
  });

  it("Tasks tab shows each task's project context, can narrow by project or 'No project', and keeps project-less tasks selectable", async () => {
    const user = userEvent.setup(); render(<Harness />);
    await user.click(screen.getByRole("tab", { name: "Tasks" }));
    expect(screen.getByRole("option", { name: "Write homepage copy, project Website Relaunch" })).toBeInTheDocument();
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter tasks by project" }), "p2");
    expect(within(screen.getByRole("listbox", { name: "Tasks" })).getAllByRole("option").map((o) => o.getAttribute("aria-label"))).toEqual(["Collect KPI tables, project Annual Report"]);
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter tasks by project" }), "__none__");
    const only = screen.getByRole("option", { name: "Book venue (no project)" }); await user.click(only);
    expect(only).toHaveAttribute("aria-selected", "true");   // a task with no project is a valid destination
  });

  it("is operable by keyboard: arrows move, Enter selects, Escape clears the query", async () => {
    const user = userEvent.setup(); const onChange = vi.fn();
    render(<ResourcePicker projects={projects} tasks={[]} value={null} onChange={onChange} />);
    const box = screen.getByRole("combobox", { name: "Search projects" }); await user.click(box);
    await user.keyboard("{ArrowDown}"); expect(box).toHaveAttribute("aria-activedescendant", expect.stringMatching(/opt-1$/));
    await user.keyboard("{Enter}"); expect(onChange).toHaveBeenCalledWith({ type: "project", id: "p2" });
    await user.type(box, "zzz"); expect(screen.getByText(/No projects match your search/)).toBeInTheDocument();
    await user.keyboard("{Escape}"); expect(box).toHaveValue("");
    await user.keyboard("{ArrowUp}{ArrowUp}{Enter}"); expect(onChange).toHaveBeenLastCalledWith({ type: "project", id: "p1" });
  });

  it("truncates long names visually but keeps the full name accessible", () => {
    const long = "Quarterly cross-functional alignment and stakeholder communication plan for the regional expansion programme";
    render(<ResourcePicker projects={[{ id: "pl", name: long }]} tasks={[]} value={null} onChange={() => {}} />);
    const label = screen.getByTitle(long); expect(label.className).toContain("truncate");
    expect(screen.getByRole("option", { name: long })).toBeInTheDocument();
  });

  it("shows loading and empty states, and never renders an unbounded list", async () => {
    const { rerender } = render(<ResourcePicker projects={[]} tasks={[]} value={null} onChange={() => {}} loading />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
    rerender(<ResourcePicker projects={[]} tasks={[]} value={null} onChange={() => {}} />);
    expect(screen.getByText("No projects available to you.")).toBeInTheDocument();
    const many = Array.from({ length: PICKER_RENDER_LIMIT + 30 }, (_, i) => ({ id: `m${i}`, name: `Project ${i}` }));
    rerender(<ResourcePicker projects={many} tasks={[]} value={null} onChange={() => {}} />);
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(PICKER_RENDER_LIMIT); expect(screen.getByRole("status")).toHaveTextContent(`Showing ${PICKER_RENDER_LIMIT} of ${PICKER_RENDER_LIMIT + 30}`);
  });

  it("asks the server (debounced, bounded) for tasks instead of loading everything", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true }); const onQuery = vi.fn(); const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness onQuery={onQuery} />); await user.click(screen.getByRole("tab", { name: "Tasks" }));
    await user.type(screen.getByRole("combobox", { name: "Search tasks" }), "kpi");
    expect(onQuery).not.toHaveBeenCalledWith({ q: "kpi", projectId: null }); await act(async () => { vi.advanceTimersByTime(350); });
    expect(onQuery).toHaveBeenLastCalledWith({ q: "kpi", projectId: null });
    await user.selectOptions(screen.getByRole("combobox", { name: "Filter tasks by project" }), "p1"); await act(async () => { vi.advanceTimersByTime(350); });
    expect(onQuery).toHaveBeenLastCalledWith({ q: "kpi", projectId: "p1" });
  });

  it("is built for narrow screens: full-width controls and a viewport-capped scrolling list", () => {
    render(<Harness />);
    expect(screen.getByRole("combobox", { name: "Search projects" }).className).toContain("w-full");
    expect(screen.getByRole("listbox").className).toMatch(/max-h-\[min\(50vh/); expect(screen.getByRole("listbox").className).toContain("overflow-auto");
  });
});

const governanceValue = vi.hoisted(() => ({ capabilities: { dropboxEnabled: true } }));
const stableToast = vi.hoisted(() => vi.fn());
const hub = vi.hoisted(() => ({ role: "owner", company: "w1", list: vi.fn(), tasks: vi.fn(), projects: vi.fn(), taskById: vi.fn(), attached: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: hub.role, user: { id: "u1" }, activeCompanyId: hub.company }) }));
vi.mock("@/lib/api", () => ({ api: { listConnectedStorageConnections: hub.list, getTasks: hub.tasks, getProjects: hub.projects, getTaskById: hub.taskById } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: stableToast }) }));
vi.mock("@/hooks/useWorkspaceGovernance", () => ({ useWorkspaceGovernance: () => governanceValue }));
vi.mock("@/components/connectedStorage/ConnectedStorageAttachmentsSection", () => ({ ConnectedStorageAttachmentsSection: (p: { targetType: string; targetId: string }) => { hub.attached(p.targetType, p.targetId); return <div data-testid="attach-section">{p.targetType}:{p.targetId}</div>; } }));

describe("Dropbox hub with the picker", () => {
  beforeEach(async () => {
    Object.values(hub).forEach((f) => typeof f === "function" && (f as ReturnType<typeof vi.fn>).mockReset?.());
    hub.role = "owner"; hub.company = "w1";
    hub.list.mockResolvedValue({ data: { connections: [{ provider: "dropbox", status: "active" }] } });
    hub.projects.mockResolvedValue({ data: { projects: [{ id: "p1", name: "Website Relaunch" }] } });
    hub.tasks.mockResolvedValue({ data: { tasks: [{ id: "t1", title: "Write homepage copy", projectId: "p1", project: { id: "p1", name: "Website Relaunch" } }] } });
  });
  const renderHub = async () => { const { default: Hub } = await import("@/components/connectedStorage/DropboxDriveHub"); return render(<MemoryRouter><Hub /></MemoryRouter>); };

  it("attaches to exactly the chosen project or task, and uses only API-authorized resources", async () => {
    const user = userEvent.setup(); await renderHub();
    expect(await screen.findByText("Website Relaunch")).toBeInTheDocument();
    expect(screen.queryByText("Secret board project")).not.toBeInTheDocument();               // only what the API returned is offered
    await user.click(screen.getByRole("option", { name: "Website Relaunch" }));
    await waitFor(() => expect(screen.getByTestId("attach-section")).toHaveTextContent("project:p1"));
    await user.click(screen.getByRole("tab", { name: "Tasks" }));
    await user.click(await screen.findByRole("option", { name: /Write homepage copy/ }));
    await waitFor(() => expect(screen.getByTestId("attach-section")).toHaveTextContent("task:t1"));
    expect(hub.tasks).toHaveBeenCalledWith(expect.objectContaining({ limit: 50 }));         // bounded
  });

  it("a read-only task shows the view-only notice instead of the attach UI", async () => {
    hub.role = "member"; const user = userEvent.setup();
    hub.taskById.mockResolvedValue({ data: { access: { canEdit: false, readOnly: true } } });
    await renderHub(); await user.click(await screen.findByRole("tab", { name: "Tasks" }));
    await user.click(await screen.findByRole("option", { name: /Write homepage copy/ }));
    expect(await screen.findByText(/view this item only/i)).toBeInTheDocument(); expect(screen.queryByTestId("attach-section")).not.toBeInTheDocument();
  });

  it("switching workspace clears the selection and reloads that workspace's resources", async () => {
    const user = userEvent.setup(); const { rerender } = await renderHub();
    await user.click(await screen.findByRole("option", { name: "Website Relaunch" })); await screen.findByTestId("attach-section");
    hub.company = "w2"; hub.projects.mockResolvedValue({ data: { projects: [{ id: "p9", name: "Other Workspace Project" }] } }); hub.tasks.mockResolvedValue({ data: { tasks: [] } });
    const { default: Hub } = await import("@/components/connectedStorage/DropboxDriveHub");
    rerender(<MemoryRouter><Hub /></MemoryRouter>);
    expect(await screen.findByText("Other Workspace Project")).toBeInTheDocument();
    expect(screen.queryByTestId("attach-section")).not.toBeInTheDocument(); expect(screen.queryByText("Website Relaunch")).not.toBeInTheDocument();
  });
});
