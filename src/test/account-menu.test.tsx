import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const auth = vi.hoisted(() => ({ user: { firstName: "Maya", lastName: "Okafor", email: "maya@example.com", globalRole: "user" as string }, workspaceRole: "member" as string, activeWorkspace: { name: "Studio" }, logout: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
import AccountMenu from "@/components/dashboard/AccountMenu";

afterEach(() => { cleanup(); vi.clearAllMocks(); auth.user.globalRole = "user"; auth.workspaceRole = "member"; });
const renderMenu = () => render(<MemoryRouter><AccountMenu /></MemoryRouter>);
const openMenu = async () => { fireEvent.pointerDown(screen.getByRole("button", { name: "Open account menu" }), { button: 0, ctrlKey: false }); };

describe("account dropdown", () => {
  it("shows identity, workspace and common destinations and signs out", async () => {
    renderMenu(); await openMenu();
    expect(await screen.findByText("Maya Okafor")).toBeInTheDocument();
    expect(screen.getByText("maya@example.com")).toBeInTheDocument();
    expect(screen.getByText("Studio")).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Admin Portal/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("menuitem", { name: /Sign out/ }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it("shows workspace actions only to workspace admins and staff portal only to platform staff", async () => {
    auth.workspaceRole = "owner";
    auth.user.globalRole = "user";
    renderMenu(); await openMenu();
    expect(await screen.findByRole("menuitem", { name: /Workspace Settings/ })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: /Admin Portal/ })).not.toBeInTheDocument();
    cleanup();
    auth.user.globalRole = "admin";
    renderMenu(); await openMenu();
    expect(await screen.findByRole("menuitem", { name: /Admin Portal/ })).toBeInTheDocument();
  });

  it("closes on Escape and outside click", async () => {
    render(<><button>Outside</button><MemoryRouter><AccountMenu /></MemoryRouter></>);
    await openMenu();
    await screen.findByRole("menu");
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
    await openMenu(); await screen.findByRole("menu");
    fireEvent.pointerDown(screen.getByText("Outside"), { button: 0, ctrlKey: false });
    await waitFor(() => expect(screen.queryByRole("menu")).not.toBeInTheDocument());
  });
});
