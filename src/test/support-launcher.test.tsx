import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  getSupportAgentSession: vi.fn(), askSupportAI: vi.fn(), createSupportTicket: vi.fn(), listSupportTickets: vi.fn(), getSupportTicket: vi.fn(), replySupportTicket: vi.fn(), downloadSupportAttachment: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api: mocks }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "user-1", firstName: "Maya" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock("@/contexts/WebSocketContext", () => ({ useWebSocket: () => ({ on: vi.fn(), off: vi.fn() }) }));
import SupportLauncher from "@/components/support/SupportLauncher";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.clearAllMocks(); mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } }); });
const renderSupport = () => render(<MemoryRouter initialEntries={["/tasks"]}><SupportLauncher /></MemoryRouter>);

describe("Admiino AI & Support launcher", () => {
  it("opens an accessible native support drawer with AI, report, help and request actions", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    expect(await screen.findByText("How can I help?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Ask Admiino AI/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Report a problem/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /My support requests/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse Help Center/ })).toHaveAttribute("href", "https://www.admiino.com/guide");
  });

  it("does not create a ticket until the user confirms the reviewed handoff", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    mocks.askSupportAI.mockResolvedValue({ data: { answer: "I could not confirm this from the guide.", uncertain: true, recommendHuman: true, reason: "uncertain" } });
    mocks.createSupportTicket.mockResolvedValue({ data: { ticket: { id: "ticket-1", ticketNumber: "ADM-000001", subject: "Google Drive fails", category: "general_help", status: "received", priority: "normal", aiEscalated: true, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } });
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    fireEvent.click(await screen.findByRole("button", { name: /Ask Admiino AI/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ask Admiino AI" }), { target: { value: "Google Drive fails" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    fireEvent.click(await screen.findByRole("button", { name: "Send to Customer Support" }));
    expect(mocks.createSupportTicket).not.toHaveBeenCalled();
    const confirm = screen.getByRole("checkbox", { name: /I reviewed this request/ });
    fireEvent.click(confirm);
    fireEvent.click(screen.getByRole("button", { name: /Send to Customer Support/ }));
    await waitFor(() => expect(mocks.createSupportTicket).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, aiEscalated: true, transcript: expect.arrayContaining([expect.objectContaining({ role: "user", content: "Google Drive fails" })]), context: { sourcePath: "/tasks" } })));
    expect(await screen.findAllByText("ADM-000001")).toHaveLength(2);
  });

  it("requires confirmation and sends a manually prepared support request after it is checked", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    mocks.createSupportTicket.mockResolvedValue({ data: { ticket: { id: "ticket-manual", ticketNumber: "ADM-000002", subject: "Invite question", category: "bug", status: "received", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } });
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    fireEvent.click(await screen.findByRole("button", { name: /Report a problem/ }));

    const consent = screen.getByRole("checkbox", { name: /I reviewed this request/ });
    const send = screen.getByRole("button", { name: /Send to Customer Support/ });
    expect(send).toBeDisabled();
    expect(mocks.createSupportTicket).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText("What do you need help with?"), { target: { value: "Invite question" } });
    fireEvent.change(screen.getByPlaceholderText("Tell us what happened and what you already tried."), { target: { value: "I cannot invite a teammate." } });
    fireEvent.click(consent);
    expect(consent).toBeChecked();
    fireEvent.click(send);

    await waitFor(() => expect(mocks.createSupportTicket).toHaveBeenCalledWith(expect.objectContaining({
      subject: "Invite question",
      message: "I cannot invite a teammate.",
      confirmed: true,
      aiEscalated: false,
      transcript: [],
    })));
    expect(await screen.findAllByText("ADM-000002")).toHaveLength(2);
  });

  it("preserves confirmation on a failed request and resets it after a successful send", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    mocks.createSupportTicket
      .mockRejectedValueOnce(new Error("Temporary network error"))
      .mockResolvedValueOnce({ data: { ticket: { id: "ticket-retry", ticketNumber: "ADM-000003", subject: "Access question", category: "general_help", status: "received", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } });
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    fireEvent.click(await screen.findByRole("button", { name: /Report a problem/ }));
    fireEvent.change(screen.getByPlaceholderText("What do you need help with?"), { target: { value: "Access question" } });
    fireEvent.change(screen.getByPlaceholderText("Tell us what happened and what you already tried."), { target: { value: "Please help me." } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed this request/ }));

    fireEvent.click(screen.getByRole("button", { name: /Send to Customer Support/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Request not sent" })));
    expect(screen.getByRole("checkbox", { name: /I reviewed this request/ })).toBeChecked();
    expect(screen.getByDisplayValue("Access question")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Please help me.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Send to Customer Support/ }));
    expect(await screen.findAllByText("ADM-000003")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Back to support" }));
    fireEvent.click(screen.getByRole("button", { name: "Back to support" }));
    fireEvent.click(screen.getByRole("button", { name: /Report a problem/ }));
    expect(screen.getByRole("checkbox", { name: /I reviewed this request/ })).not.toBeChecked();
  });

  it("prevents duplicate ticket creation when submit is double-clicked", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    let resolveRequest!: (value: any) => void;
    mocks.createSupportTicket.mockImplementation(() => new Promise((resolve) => { resolveRequest = resolve; }));
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    fireEvent.click(await screen.findByRole("button", { name: /Report a problem/ }));
    fireEvent.change(screen.getByPlaceholderText("What do you need help with?"), { target: { value: "One request" } });
    fireEvent.change(screen.getByPlaceholderText("Tell us what happened and what you already tried."), { target: { value: "Please investigate." } });
    fireEvent.click(screen.getByRole("checkbox", { name: /I reviewed this request/ }));
    const submit = screen.getByRole("button", { name: /Send to Customer Support/ });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(mocks.createSupportTicket).toHaveBeenCalledTimes(1));
    resolveRequest({ data: { ticket: { id: "ticket-one", ticketNumber: "ADM-000004", subject: "One request", category: "general_help", status: "received", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() } } });
    expect(await screen.findAllByText("ADM-000004")).toHaveLength(2);
    expect(mocks.createSupportTicket).toHaveBeenCalledTimes(1);
  });

  it("falls back to the grounded responder when signed agent initialization is unavailable", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    mocks.getSupportAgentSession.mockRejectedValue(new Error("signed session unavailable"));
    mocks.askSupportAI.mockResolvedValue({ data: { answer: "From the Admiino guide, connect Drive in Integrations.", uncertain: false, recommendHuman: false, guide: { title: "Google Drive", href: "https://www.admiino.com/guide#google" } } });
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    fireEvent.click(await screen.findByRole("button", { name: /Ask Admiino AI/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ask Admiino AI" }), { target: { value: "How do I connect Drive?" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    await waitFor(() => expect(mocks.askSupportAI).toHaveBeenCalledWith("How do I connect Drive?"));
    expect(await screen.findByText("From the Admiino guide, connect Drive in Integrations.")).toBeInTheDocument();
  });

  it("shows technical recovery actions when both answer paths fail", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    mocks.getSupportAgentSession.mockRejectedValue(new Error("agent initialization unavailable"));
    mocks.askSupportAI.mockRejectedValue(new Error("help provider unavailable"));
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    fireEvent.click(await screen.findByRole("button", { name: /Ask Admiino AI/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ask Admiino AI" }), { target: { value: "I need help" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText(/I'm having trouble accessing Admiino Help right now/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse Guide" })).toHaveAttribute("href", "https://www.admiino.com/guide");
    expect(screen.getByRole("button", { name: "Contact Support" })).toBeInTheDocument();
  });
});
