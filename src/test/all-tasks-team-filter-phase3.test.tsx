import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AllTasks from "@/pages/AllTasks";

const apiMock = vi.hoisted(() => ({
  getAllTasksCrossWorkspace: vi.fn(),
  listTeams: vi.fn(),
  listCustomFields: vi.fn(),
}));
const authMock = vi.hoisted(() => ({
  workspaces: [
    { id: "workspace-a", name: "Workspace A", role: "owner", status: "active" },
    { id: "workspace-b", name: "Workspace B", role: "owner", status: "active" },
  ],
  user: { id: "user-1" },
  activeCompanyId: "workspace-a",
  workspaceRole: "owner",
}));

vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/dashboard/DashboardComponents", () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
  ContentCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  LoadingState: () => <div>Loading</div>,
  EmptyState: () => <div>Empty</div>,
}));
vi.mock("@/components/dashboard/TaskComponents", () => ({
  TaskTable: () => <div>Task table</div>,
  Pagination: () => null,
}));
vi.mock("@/components/dashboard/TaskEditDrawer", () => ({ default: () => null }));
vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => <select aria-label="filter" value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: () => null,
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
}));

function renderPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={queryClient}><MemoryRouter initialEntries={["/tasks"]}><AllTasks /></MemoryRouter></QueryClientProvider>);
}

describe("All Tasks Team filter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.listTeams.mockResolvedValue({ data: { teams: [{ id: "team-a", name: "Marketing" }] } });
    apiMock.listCustomFields.mockResolvedValue({ data: { definitions: [
      { id: "region", name: "Region", entityType: "task", fieldType: "text", status: "active", position: 0, options: [] },
      ...Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, name: `Field ${i}`, entityType: "task", fieldType: "text", status: "active", position: i + 1, options: [] })),
    ] } });
    apiMock.getAllTasksCrossWorkspace.mockResolvedValue({ data: { tasks: [] }, pagination: {} });
  });

  it("resets the Team filter when switching workspaces", async () => {
    renderPage();
    const initialFilters = screen.getAllByRole("combobox");
    fireEvent.change(initialFilters[2], { target: { value: "workspace-a" } });
    await waitFor(() => expect(apiMock.listTeams).toHaveBeenCalled());

    const filters = screen.getAllByRole("combobox");
    const teamFilter = filters[3];
    fireEvent.change(teamFilter, { target: { value: "team-a" } });
    expect(teamFilter).toHaveValue("team-a");

    fireEvent.change(filters[2], { target: { value: "workspace-b" } });
    await waitFor(() => expect(teamFilter).toHaveValue("all"));
    await waitFor(() => expect(apiMock.getAllTasksCrossWorkspace).toHaveBeenLastCalledWith(expect.objectContaining({ companyId: "workspace-b", teamId: undefined })));
  });

  it("keeps custom columns/filter workspace-scoped, persists at most five columns, and forwards a filter to the API", async () => {
    localStorage.clear();
    renderPage();
    // The workspace selector is the third combobox on the All Tasks page.
    fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "workspace-a" } });
    expect(await screen.findByText("Custom columns (up to 5)")).toBeInTheDocument();
    for (let i = 0; i < 6; i++) fireEvent.click(screen.getByText(`Field ${i}`).closest("label")!.querySelector("input")!);
    await waitFor(() => expect(JSON.parse(localStorage.getItem("custom-field-columns:tasks:workspace-a") || "[]")).toHaveLength(5));
    expect(screen.getByText("Field 5").closest("label")!.querySelector("input")).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Add filter" }));
    fireEvent.change(screen.getByLabelText("Custom filter field 1"), { target: { value: "region" } });
    fireEvent.change(screen.getByLabelText("Custom filter operator 1"), { target: { value: "contains" } });
    fireEvent.change(screen.getByLabelText("Custom filter value 1"), { target: { value: "West" } });
    await waitFor(() => expect(apiMock.getAllTasksCrossWorkspace).toHaveBeenLastCalledWith(expect.objectContaining({
      companyId: "workspace-a", customFieldColumns: expect.arrayContaining(["f0"]), customFieldFilters: [{ fieldId: "region", op: "contains", value: "West" }], page: 1,
    })));
    expect(screen.queryByText("Custom columns (up to 5)")).toBeInTheDocument();

    // Aggregated All-workspaces view deliberately has no workspace-specific field controls.
    fireEvent.change(screen.getAllByRole("combobox")[2], { target: { value: "all" } });
    await waitFor(() => expect(screen.queryByText("Custom columns (up to 5)")).toBeNull());
    expect(screen.queryByText("Custom filters (up to 5)")).toBeNull();
    await waitFor(() => expect(apiMock.getAllTasksCrossWorkspace).toHaveBeenLastCalledWith(expect.objectContaining({ customFieldColumns: undefined, customFieldFilters: undefined })));
  });
});
