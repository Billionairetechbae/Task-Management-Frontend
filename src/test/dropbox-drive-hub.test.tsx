import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const mocks = vi.hoisted(() => ({ role: "owner" as string | null, list: vi.fn(), tasks: vi.fn(), projects: vi.fn(), toast: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, user: { id: "u1" } }) }));
vi.mock("@/lib/api", () => ({ api: { listConnectedStorageConnections: mocks.list, getTasks: mocks.tasks, getProjects: mocks.projects } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/components/connectedStorage/ConnectedStorageAttachmentsSection", () => ({ ConnectedStorageAttachmentsSection: () => <div data-testid="target-scoped-files" /> }));
import DropboxDriveHub from "@/components/connectedStorage/DropboxDriveHub";

function view() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter><DropboxDriveHub /></MemoryRouter></QueryClientProvider>); }
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Dropbox file hub", () => {
  it("does not query or expose Connected Storage metadata to clients", () => {
    mocks.role = "guest";
    view();
    expect(screen.getByText(/internal workspace members only/i)).toBeInTheDocument();
    expect(mocks.list).not.toHaveBeenCalled();
  });

  it("offers workspace admins a connect action when Dropbox is disconnected", async () => {
    mocks.role = "owner";
    mocks.list.mockResolvedValue({ data: { connections: [] } });
    mocks.tasks.mockResolvedValue({ data: { tasks: [] } });
    mocks.projects.mockResolvedValue({ data: { projects: [] } });
    view();
    expect(await screen.findByRole("link", { name: "Connect Dropbox" })).toHaveAttribute("href", "/settings/integrations");
  });

  it("tells members that an owner or admin must connect Dropbox", async () => {
    mocks.role = "member";
    mocks.list.mockResolvedValue({ data: { connections: [] } });
    mocks.tasks.mockResolvedValue({ data: { tasks: [] } });
    mocks.projects.mockResolvedValue({ data: { projects: [] } });
    view();
    expect(await screen.findByText(/Ask a workspace owner or admin to connect Dropbox/)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Connect Dropbox" })).not.toBeInTheDocument();
  });
});
