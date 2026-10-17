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
