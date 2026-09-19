import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AllTasks from "@/pages/AllTasks";

const apiMock = vi.hoisted(() => ({
  getAllTasksCrossWorkspace: vi.fn(),
  listTeams: vi.fn(),
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
});
