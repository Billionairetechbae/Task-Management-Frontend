import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ getNotificationPreferences: vi.fn(), updateNotificationPreferences: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { NotificationPreferencesMatrix } from "@/components/notifications/NotificationPreferencesMatrix";

const matrix = [
  { category: "assignments", inAppEnabled: true, emailEnabled: true, whatsAppEnabled: true },
  { category: "workspace_commercial", inAppEnabled: true, emailEnabled: false, whatsAppEnabled: false },
];

describe("notification preferences partial save", () => {
  beforeEach(() => {
    apiMock.getNotificationPreferences.mockResolvedValue({ status: "success", data: { preferences: matrix, whatsApp: { linked: true, globallyEnabled: true } } });
    apiMock.updateNotificationPreferences.mockReset().mockResolvedValue({ status: "success", data: { preferences: matrix } });
  });

  it("sends only the toggled channel of the toggled category, never untouched defaults", async () => {
    render(<MemoryRouter><NotificationPreferencesMatrix /></MemoryRouter>);
    fireEvent.click(await screen.findByRole("switch", { name: "Workspace & commercial in-app" }));
    fireEvent.click(screen.getByRole("button", { name: /Save notification preferences/i }));
    await waitFor(() => expect(apiMock.updateNotificationPreferences).toHaveBeenCalledTimes(1));
    expect(apiMock.updateNotificationPreferences).toHaveBeenCalledWith([{ category: "workspace_commercial", inAppEnabled: false }]);
  });

  it("an explicit email opt-out and a later toggle are both sent as explicit booleans; a second save sends nothing stale", async () => {
    render(<MemoryRouter><NotificationPreferencesMatrix /></MemoryRouter>);
    const email = await screen.findByRole("switch", { name: "Workspace & commercial email" });
    fireEvent.click(email); fireEvent.click(email);
    fireEvent.click(screen.getByRole("button", { name: /Save notification preferences/i }));
    await waitFor(() => expect(apiMock.updateNotificationPreferences).toHaveBeenCalledWith([{ category: "workspace_commercial", emailEnabled: false }]));
    fireEvent.click(await screen.findByRole("button", { name: /Save notification preferences/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: /Save notification preferences/i })).not.toBeDisabled());
    expect(apiMock.updateNotificationPreferences).toHaveBeenCalledTimes(1);
  });
});
