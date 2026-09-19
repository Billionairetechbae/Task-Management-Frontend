import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DashboardRoleRouter from "@/pages/DashboardRoleRouter";

const authMock = vi.hoisted(() => ({ workspaceRole: "manager" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authMock }));
vi.mock("@/pages/DashboardManager", () => ({ default: () => <div>Manager dashboard</div> }));
vi.mock("@/pages/DashboardExecutive", () => ({ default: () => <div>Workspace dashboard</div> }));

describe("Phase 4 dashboard routing", () => {
  beforeEach(() => { authMock.workspaceRole = "manager"; });

  it("uses the manager dashboard for managers", () => {
    render(<DashboardRoleRouter />);
    expect(screen.getByText("Manager dashboard")).toBeInTheDocument();
  });

  it("uses the workspace dashboard for non-manager roles", () => {
    authMock.workspaceRole = "member";
    render(<DashboardRoleRouter />);
    expect(screen.getByText("Workspace dashboard")).toBeInTheDocument();
  });
});
