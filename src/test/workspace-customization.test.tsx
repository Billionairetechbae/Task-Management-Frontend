import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

const state = vi.hoisted(() => ({ role: "manager" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: state.role }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));
vi.mock("@/components/customFields/CustomFieldsManager", () => ({ default: () => <div data-testid="custom-fields-manager">Task Fields · Project Fields</div> }));
import WorkspaceCustomization from "@/pages/WorkspaceCustomization";

afterEach(cleanup);

describe("workspace customization page", () => {
  it("explains workspace field scope and required behavior and keeps manager CRUD available", () => {
    state.role = "manager";
    render(<WorkspaceCustomization />);
    expect(screen.getByTestId("custom-fields-manager")).toBeInTheDocument();
    expect(screen.getByText(/Task Fields affect tasks; Project Fields affect projects/)).toBeInTheDocument();
    expect(screen.getByText(/Required fields must be filled in/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Learn more in the Guide" })).toHaveAttribute("href", "https://www.admiino.com/guide#custom-fields");
  });

  it("does not expose field management controls to members", () => {
    state.role = "member";
    render(<WorkspaceCustomization />);
    expect(screen.queryByTestId("custom-fields-manager")).not.toBeInTheDocument();
    expect(screen.getByText(/Only workspace owners, admins and managers/)).toBeInTheDocument();
  });
});
