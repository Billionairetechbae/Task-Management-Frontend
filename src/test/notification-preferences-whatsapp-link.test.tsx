import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const apiMock = vi.hoisted(() => ({ getNotificationPreferences: vi.fn(), updateNotificationPreferences: vi.fn() }));
vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { NotificationPreferencesMatrix } from "@/components/notifications/NotificationPreferencesMatrix";

describe("WhatsApp preference link eligibility", () => {
  beforeEach(() => {
    apiMock.getNotificationPreferences.mockResolvedValue({ status: "success", data: {
      preferences: [{ category: "assignments", inAppEnabled: true, emailEnabled: true, whatsAppEnabled: true }],
      whatsApp: { linked: false, globallyEnabled: true },
    } });
  });

  it("explains an unlinked account and links to the existing WhatsApp setup page", async () => {
    render(<MemoryRouter><NotificationPreferencesMatrix /></MemoryRouter>);
    expect(await screen.findByText(/your WhatsApp account is not linked/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Open WhatsApp setup" })).toHaveAttribute("href", "/settings/integrations");
    expect(screen.getByRole("switch", { name: "Assignments WhatsApp" })).toBeDisabled();
  });
});
