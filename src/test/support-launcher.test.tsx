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
    await waitFor(() => expect(mocks.createSupportTicket).toHaveBeenCalledWith(expect.objectContaining({ confirmed: true, aiEscalated: true, context: { sourcePath: "/tasks" } })));
    expect(await screen.findAllByText("ADM-000001")).toHaveLength(2);
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

  it("shows a human-support recovery message when both answer paths fail", async () => {
    mocks.listSupportTickets.mockResolvedValue({ data: { tickets: [] } });
    mocks.getSupportAgentSession.mockRejectedValue(new Error("agent initialization unavailable"));
    mocks.askSupportAI.mockRejectedValue(new Error("help provider unavailable"));
    renderSupport();
    fireEvent.click(screen.getByRole("button", { name: "Open Admiino AI & Support" }));
    fireEvent.click(await screen.findByRole("button", { name: /Ask Admiino AI/ }));
    fireEvent.change(screen.getByRole("textbox", { name: "Ask Admiino AI" }), { target: { value: "I need help" } });
    fireEvent.click(screen.getByRole("button", { name: "Send question" }));
    expect(await screen.findByText(/I can’t reach the help service right now/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Send to Customer Support/ })).toBeInTheDocument();
  });
});
