import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ listCustomFields: vi.fn(), projectsQuery: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: { listCustomFields: h.listCustomFields } }));
vi.mock("@/hooks/useCoreQueries", () => ({ useProjectsQuery: (ids: string[]) => h.projectsQuery(ids) }));
vi.mock("@/hooks/useWorkspaceSettings", () => ({ useWorkspaceSettings: () => ({ canPerformRoleOperation: () => true }) }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: "member", activeCompanyId: "ws-1" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <>{children}</> }));
vi.mock("@/components/templates/useTemplateNavigation", () => ({ useTemplateNavigation: () => vi.fn() }));
vi.mock("@/components/templates/UseTemplateFlow", () => ({ default: () => null }));
vi.mock("@/components/projects/EditProjectDrawer", () => ({ default: () => null }));

import Projects from "@/pages/Projects";

describe("Project custom columns", () => {
  beforeEach(() => {
    vi.clearAllMocks(); localStorage.clear();
    h.listCustomFields.mockResolvedValue({ data: { definitions: [
      { id: "region", name: "Region", entityType: "project", fieldType: "text", status: "active", position: 0 },
      ...Array.from({ length: 3 }, (_, index) => ({ id: `p${index}`, name: `Field ${index}`, entityType: "project", fieldType: "text", status: "active", position: index + 1 })),
    ] } });
    h.projectsQuery.mockImplementation((ids: string[]) => ({ data: [{ id: "project-1", companyId: "ws-1", name: "Launch", status: "active", customFieldColumns: ids.includes("region") ? { region: "West" } : {} }], isPending: false, isFetching: false, isError: false }));
  });
  it("renders selected values, limits columns to three, and persists workspace selection", async () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter><Projects /></MemoryRouter></QueryClientProvider>);
    expect(await screen.findByText("Custom columns (up to 3)")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Region").closest("label")!.querySelector("input")!);
    fireEvent.click(screen.getByText("Field 0").closest("label")!.querySelector("input")!);
    fireEvent.click(screen.getByText("Field 1").closest("label")!.querySelector("input")!);
    fireEvent.click(screen.getByText("Field 2").closest("label")!.querySelector("input")!);
    await waitFor(() => expect(JSON.parse(localStorage.getItem("custom-field-columns:projects:ws-1") || "[]")).toHaveLength(3));
    expect(screen.getByText("Field 2").closest("label")!.querySelector("input")).toBeDisabled();
    expect(await screen.findByText("West")).toBeInTheDocument();
    expect(h.projectsQuery).toHaveBeenLastCalledWith(expect.arrayContaining(["region"]));
  });
});
