import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMocks = vi.hoisted(() => ({
  getWorkspaceNotificationDeliveryStatus: vi.fn(),
  processWorkspaceNotificationDeliveries: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api: apiMocks }));

import { WorkspaceNotificationDelivery, canManageWorkspaceNotificationDeliveries } from "@/components/notifications/WorkspaceNotificationDelivery";

describe("Workspace notification delivery controls", () => {
  it("limits delivery controls to workspace owners and admins", () => {
    expect(canManageWorkspaceNotificationDeliveries("owner")).toBe(true);
    expect(canManageWorkspaceNotificationDeliveries("admin")).toBe(true);
    expect(canManageWorkspaceNotificationDeliveries("manager")).toBe(false);
    expect(canManageWorkspaceNotificationDeliveries("member")).toBe(false);
    expect(canManageWorkspaceNotificationDeliveries("client")).toBe(false);
  });
  beforeEach(() => {
    vi.clearAllMocks();
    apiMocks.getWorkspaceNotificationDeliveryStatus.mockResolvedValue({ status: "success", data: { freshQueued: 4, staleQueued: 2, retrying: 1, failed: 3, sentRecently: 8 } });
    apiMocks.processWorkspaceNotificationDeliveries.mockResolvedValue({ status: "success", data: { summary: { selected: 5, sent: 2, failed: 1, retrying: 1, expired: 1 } } });
  });

  it("shows safe queue counts and requires confirmation before processing", async () => {
    render(<WorkspaceNotificationDelivery companyId="workspace-a" />);
    expect(await screen.findByLabelText("Fresh queued: 4")).toBeInTheDocument();
    expect(screen.getByLabelText("Stale queued: 2")).toBeInTheDocument();
    expect(screen.getByText(/Important Email and WhatsApp notifications are also attempted immediately/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /process queued notifications/i }));
    expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
    expect(screen.getByText(/outside the delivery window will expire/i)).toBeInTheDocument();
    expect(apiMocks.processWorkspaceNotificationDeliveries).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Process queue" }));
    await waitFor(() => expect(apiMocks.processWorkspaceNotificationDeliveries).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole("status")).toHaveTextContent("Sent 2 · Failed 1 · Retrying 1 · Expired 1");
  });

  it("disables the action for an empty queue and refreshes on workspace changes", async () => {
    apiMocks.getWorkspaceNotificationDeliveryStatus.mockResolvedValue({ status: "success", data: { freshQueued: 0, staleQueued: 0, retrying: 0, failed: 0, sentRecently: 0 } });
    const view = render(<WorkspaceNotificationDelivery companyId="workspace-a" />);
    const button = await screen.findByRole("button", { name: /process queued notifications/i });
    expect(button).toBeDisabled();
    view.rerender(<WorkspaceNotificationDelivery companyId="workspace-b" />);
    await waitFor(() => expect(apiMocks.getWorkspaceNotificationDeliveryStatus).toHaveBeenCalledTimes(2));
  });

  it("prevents duplicate submissions while processing and shows controlled errors", async () => {
    let resolveProcess!: (value: unknown) => void;
    apiMocks.processWorkspaceNotificationDeliveries.mockReturnValue(new Promise((resolve) => { resolveProcess = resolve; }));
    render(<WorkspaceNotificationDelivery companyId="workspace-a" />);
    await screen.findByLabelText("Fresh queued: 4");
    await userEvent.click(screen.getByRole("button", { name: /process queued notifications/i }));
    const action = await screen.findByRole("button", { name: "Process queue" });
    await userEvent.click(action);
    expect(screen.getByRole("button", { name: /processing/i })).toBeDisabled();
    expect(apiMocks.processWorkspaceNotificationDeliveries).toHaveBeenCalledTimes(1);
    resolveProcess({ status: "success", data: { summary: { selected: 0, sent: 0, failed: 0, retrying: 0, expired: 0 } } });
    await waitFor(() => expect(apiMocks.getWorkspaceNotificationDeliveryStatus).toHaveBeenCalledTimes(2));
  });
});
