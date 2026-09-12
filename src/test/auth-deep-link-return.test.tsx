import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "@/pages/Login";
import AuthGoogleCallback from "@/pages/AuthGoogleCallback";
import {
  consumeAuthReturnPath,
  preserveAuthReturnPath,
  safeInternalReturnPath,
} from "@/lib/authReturnPath";

let authState: any;

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));

const workspace = { id: "workspace-1", name: "Synthetic", role: "owner", status: "active" };
const authenticated = () => ({
  user: { id: "user-1", role: "executive" }, loading: false, activeCompanyId: workspace.id,
  setActiveCompanyId: vi.fn(), workspaces: [workspace], login: vi.fn(), loginWithGoogleToken: vi.fn(),
});

function protectedRender(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/" element={<div>Login destination</div>} />
        <Route path="/task-details/:id" element={<ProtectedRoute><div>Task destination</div></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><div>Project destination</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

function loginRender(initialEntry = "/") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
        <Route path="/task-details/:id" element={<div>Task destination</div>} />
        <Route path="/projects/:id" element={<div>Project destination</div>} />
        <Route path="/auth/google/callback" element={<AuthGoogleCallback />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("safe protected-route return paths", () => {
  beforeEach(() => {
    sessionStorage.clear();
    authState = { ...authenticated(), user: null };
  });

  it.each([
    ["task", "/task-details/11111111-1111-4111-8111-111111111111"],
    ["project", "/projects/22222222-2222-4222-8222-222222222222"],
  ])("preserves an unauthenticated %s deep link", async (_kind, path) => {
    protectedRender(path);
    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(consumeAuthReturnPath()).toBe(path);
  });

  it.each([
    ["task", "/task-details/11111111-1111-4111-8111-111111111111", "Task destination"],
    ["project", "/projects/22222222-2222-4222-8222-222222222222", "Project destination"],
  ])("returns after password authentication to the preserved %s route", async (_kind, path, label) => {
    preserveAuthReturnPath(path);
    authState = authenticated();
    loginRender();
    expect(await screen.findByText(label)).toBeInTheDocument();
  });

  it("lets an authenticated user open a protected deep link directly", () => {
    authState = authenticated();
    protectedRender("/task-details/11111111-1111-4111-8111-111111111111");
    expect(screen.getByText("Task destination")).toBeInTheDocument();
  });

  it.each(["https://evil.example/path", "//evil.example/path", "javascript:alert(1)", "data:text/html,bad", "task-details/no-leading-slash", "/bad\\path", "/%2F%2Fevil.example", "/%ZZ"])("rejects unsafe return value %s", (value) => {
    expect(safeInternalReturnPath(value)).toBeNull();
    expect(preserveAuthReturnPath(value)).toBe(false);
  });

  it("keeps the existing default destination when no return path exists", async () => {
    authState = authenticated();
    loginRender();
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
  });

  it("expires an abandoned return path", () => {
    vi.useFakeTimers();
    try {
      preserveAuthReturnPath("/projects/22222222-2222-4222-8222-222222222222");
      vi.advanceTimersByTime(31 * 60 * 1000);
      expect(consumeAuthReturnPath()).toBeNull();
    } finally { vi.useRealTimers(); }
  });

  it("returns from Google authentication through the same stored internal path", async () => {
    preserveAuthReturnPath("/projects/22222222-2222-4222-8222-222222222222");
    authState.loginWithGoogleToken.mockResolvedValue({ isAdmin: false });
    loginRender("/auth/google/callback?token=synthetic-token");
    await waitFor(() => expect(authState.loginWithGoogleToken).toHaveBeenCalledWith("synthetic-token"));
    expect(await screen.findByText("Project destination")).toBeInTheDocument();
  });

  it("ignores an unsafe Google redirect parameter", async () => {
    authState.loginWithGoogleToken.mockResolvedValue({ isAdmin: false });
    loginRender("/auth/google/callback?token=synthetic-token&redirect=https%3A%2F%2Fevil.example");
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
  });
});
