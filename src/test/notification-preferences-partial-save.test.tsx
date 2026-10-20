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

describe("Workspace & commercial email explanation", () => {
  const render1 = (row: object) => {
    apiMock.getNotificationPreferences.mockResolvedValue({ status: "success", data: { preferences: [{ category: "workspace_commercial", inAppEnabled: true, emailEnabled: false, whatsAppEnabled: false, ...row }], whatsApp: { linked: true, globallyEnabled: true } } });
    return render(<MemoryRouter><NotificationPreferencesMatrix /></MemoryRouter>);
  };
  const defaults = [{ channel: "emailEnabled", types: ["workspace_join_requested", "workspace_join_decided"], defaultEnabled: true, effectiveEnabled: true }];

  it("new user (nothing chosen): explains join-request email is on by default and other emails are off", async () => {
    render1({ explicit: { inAppEnabled: false, emailEnabled: false, whatsAppEnabled: false }, eventDefaults: defaults });
    const note = await screen.findByText(/on by default for join-request alerts/i);
    expect(note).toHaveTextContent(/other workspace emails .* off until you turn email on/i);
    expect(screen.getByRole("switch", { name: "Workspace & commercial email" })).toHaveAttribute("aria-describedby", note.id);
  });

  it("migrated user with an existing false value: shown as an explicit opt-out that includes join requests", async () => {
    render1({ explicit: { inAppEnabled: true, emailEnabled: true, whatsAppEnabled: true }, eventDefaults: [{ ...defaults[0], effectiveEnabled: false }] });
    expect(await screen.findByText(/You turned email off.*including join-request alerts/i)).toBeInTheDocument();
    expect(screen.queryByText(/on by default/i)).not.toBeInTheDocument();
  });

  it("explicitly enabled: says all workspace emails, including join requests, are sent", async () => {
    render1({ emailEnabled: true, explicit: { inAppEnabled: false, emailEnabled: true, whatsAppEnabled: false }, eventDefaults: defaults });
    expect(await screen.findByText(/You turned email on/i)).toBeInTheDocument();
  });

  it("toggling email updates the explanation immediately and saves only that channel", async () => {
    apiMock.updateNotificationPreferences.mockClear();
    render1({ explicit: { inAppEnabled: false, emailEnabled: false, whatsAppEnabled: false }, eventDefaults: defaults });
    fireEvent.click(await screen.findByRole("switch", { name: "Workspace & commercial email" }));
    expect(await screen.findByText(/You turned email on/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Save notification preferences/i }));
    await waitFor(() => expect(apiMock.updateNotificationPreferences).toHaveBeenCalledWith([{ category: "workspace_commercial", emailEnabled: true }]));
  });

  it("categories without mixed defaults show no extra explanation", async () => {
    apiMock.getNotificationPreferences.mockResolvedValue({ status: "success", data: { preferences: [{ category: "assignments", inAppEnabled: true, emailEnabled: true, whatsAppEnabled: true }], whatsApp: { linked: true, globallyEnabled: true } } });
    render(<MemoryRouter><NotificationPreferencesMatrix /></MemoryRouter>);
    await screen.findByRole("switch", { name: "Assignments email" });
    expect(screen.queryByText(/by default|You turned/i)).not.toBeInTheDocument();
  });
});
