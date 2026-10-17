import { describe, expect, it, vi } from "vitest";
import { handleSupportClientTool } from "@/components/support/useSupportAgent";

describe("Admiino support client-tool ticket identifiers", () => {
  const listedTicket = { id: "ticket-owner-uuid", ticketNumber: "ADM-1042", subject: "Drive picker fails", status: "in_progress" };

  it("includes the private conversation-context id in list results", async () => {
    const complete = vi.fn();
    const supportApi = { listSupportTickets: vi.fn().mockResolvedValue({ data: { tickets: [listedTicket] } }) } as any;

    handleSupportClientTool("list_my_support_tickets", {}, complete, vi.fn(), supportApi);

    await vi.waitFor(() => expect(complete).toHaveBeenCalledWith([listedTicket]));
  });

  it("passes a listed ticket id to status lookup", async () => {
    const complete = vi.fn();
    const getSupportTicket = vi.fn().mockResolvedValue({ data: { ticket: listedTicket } });
    const supportApi = { getSupportTicket } as any;
    const listedId = listedTicket.id;

    handleSupportClientTool("get_support_ticket_status", { ticketId: listedId }, complete, vi.fn(), supportApi);

    await vi.waitFor(() => expect(getSupportTicket).toHaveBeenCalledWith(listedId));
    expect(complete).toHaveBeenCalledWith({ ticketNumber: "ADM-1042", status: "in_progress", subject: "Drive picker fails" });
  });

  it("passes a listed ticket id to the user-confirmed reply handoff", () => {
    const onToolHandoff = vi.fn();
    const complete = vi.fn();
    const listedId = listedTicket.id;

    handleSupportClientTool("add_support_ticket_message", { ticketId: listedId, message: "I retried the picker." }, complete, onToolHandoff, {} as any);

    expect(onToolHandoff).toHaveBeenCalledWith("add_support_ticket_message", { ticketId: listedId, message: "I retried the picker." }, complete);
  });

  it("does not reveal another user's ticket when the backend rejects its id", async () => {
    const complete = vi.fn();
    const otherUsersTicketId = "ticket-other-user-uuid";
    const supportApi = { getSupportTicket: vi.fn().mockRejectedValue(new Error("Not found")) } as any;

    handleSupportClientTool("get_support_ticket_status", { ticketId: otherUsersTicketId }, complete, vi.fn(), supportApi);

    await vi.waitFor(() => expect(complete).toHaveBeenCalledWith({ error: "Support request not found." }));
    expect(supportApi.getSupportTicket).toHaveBeenCalledWith(otherUsersTicketId);
  });
});

describe("grounded help tool fallback", () => {
  it("uses the grounded answer API when help search returns no exact matches", async () => {
    const complete = vi.fn();
    const supportApi = {
      searchSupportHelp: vi.fn().mockResolvedValue({ data: { results: [] } }),
      askSupportAI: vi.fn().mockResolvedValue({ data: { answer: "To create a task, open Task Workbench.", guide: { title: "Tasks", href: "https://www.admiino.com/guide/tasks" } } }),
    } as any;
    handleSupportClientTool("search_admiino_help", { query: "make new task" }, complete, vi.fn(), supportApi);
    await vi.waitFor(() => expect(complete).toHaveBeenCalledWith([{ title: "Tasks", href: "https://www.admiino.com/guide/tasks", excerpt: "To create a task, open Task Workbench." }]));
    expect(supportApi.askSupportAI).toHaveBeenCalledWith("make new task");
  });

  it("reports a technical retrieval failure only when both approved help paths fail", async () => {
    const complete = vi.fn();
    const supportApi = { searchSupportHelp: vi.fn().mockRejectedValue(new Error("search unavailable")), askSupportAI: vi.fn().mockRejectedValue(new Error("answer unavailable")) } as any;
    handleSupportClientTool("search_admiino_help", { query: "custom fields" }, complete, vi.fn(), supportApi);
    await vi.waitFor(() => expect(complete).toHaveBeenCalledWith(expect.objectContaining({ error: expect.stringMatching(/Do not treat this as an undocumented question/) })));
  });
});
