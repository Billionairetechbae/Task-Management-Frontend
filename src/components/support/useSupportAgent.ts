import { useCallback, useRef } from "react";
import { api } from "@/lib/api";

type AgentResponse = { answer: string; uncertain: boolean; recommendHuman: boolean; guide?: { title: string; href: string } | null };
type ToolHandoff = (name: string, args: Record<string, unknown>, complete: (result: unknown) => void) => void;

export function connectSupportSocket(
  signedUrl: string,
  configure: (socket: WebSocket) => void = () => {},
  socketFactory: (url: string) => WebSocket = (url) => new WebSocket(url),
): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const socket = socketFactory(signedUrl);
    configure(socket);
    const timeout = window.setTimeout(() => { socket.close(); reject(new Error("Support agent connection timed out")); }, 12000);
    socket.onopen = () => { window.clearTimeout(timeout); resolve(socket); };
    socket.onerror = () => { window.clearTimeout(timeout); socket.close(); reject(new Error("Support agent unavailable")); };
  });
}

/** Text-only ElevenLabs browser conversation. API keys never leave the backend. */
export function useSupportAgent() {
  const socketRef = useRef<WebSocket | null>(null);
  const fallbackRef = useRef(false);
  const pendingAnswerRef = useRef<(() => void) | null>(null);

  const ask = useCallback(async (text: string, onAnswer: (answer: AgentResponse) => void, onToolHandoff: ToolHandoff) => {
    const waitForAnswer = () => new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => { pendingAnswerRef.current = null; reject(new Error("Support agent response timed out")); }, 30000);
      pendingAnswerRef.current = () => { window.clearTimeout(timeout); pendingAnswerRef.current = null; resolve(); };
    });
    const socket = socketRef.current;
    if (socket?.readyState === WebSocket.OPEN && !fallbackRef.current) {
      const pending = waitForAnswer();
      socket.send(JSON.stringify({ type: "user_message", text }));
      await pending;
      return;
    }
    if (!fallbackRef.current) {
      try {
        const { data } = await api.getSupportAgentSession();
        const ws = await connectSupportSocket(data.signedUrl, (ws) => {
          ws.onclose = () => { socketRef.current = null; fallbackRef.current = true; };
          ws.onmessage = (event) => {
            try {
              const message = JSON.parse(String(event.data));
              if (message.type === "agent_response" && typeof message.agent_response === "string") {
                onAnswer({ answer: message.agent_response, uncertain: false, recommendHuman: /contact (?:a|our) support|human support/i.test(message.agent_response) });
                pendingAnswerRef.current?.();
              }
              if (message.type === "client_tool_call") {
                const toolName = String(message.tool_name || "");
                const complete = (result: unknown) => ws.readyState === WebSocket.OPEN && ws.send(JSON.stringify({ type: "client_tool_result", tool_call_id: message.tool_call_id, result: JSON.stringify(result) }));
                if (toolName === "search_admiino_help") void api.searchSupportHelp(String(message.parameters?.query || "")).then((result) => complete(result.data.results)).catch(() => complete({ error: "Help search is unavailable." }));
                else if (toolName === "get_support_ticket_status") void api.getSupportTicket(String(message.parameters?.ticketId || "")).then((result) => complete({ ticketNumber: result.data.ticket.ticketNumber, status: result.data.ticket.status, subject: result.data.ticket.subject })).catch(() => complete({ error: "Support request not found." }));
                else if (toolName === "list_my_support_tickets") void api.listSupportTickets().then((result) => complete(result.data.tickets.map(({ ticketNumber, subject, status }) => ({ ticketNumber, subject, status })))).catch(() => complete({ error: "Could not load support requests." }));
                else if (toolName === "create_support_ticket" || toolName === "add_support_ticket_message") onToolHandoff(toolName, message.parameters || {}, complete);
                else complete({ error: "This support action is unavailable." });
              }
            } catch { /* Ignore malformed provider events; the chat can continue. */ }
          };
        });
        socketRef.current = ws;
        const pending = waitForAnswer();
        socketRef.current?.send(JSON.stringify({ type: "user_message", text }));
        await pending;
        return;
      } catch {
        fallbackRef.current = true;
        socketRef.current?.close();
      }
    }
    // Explicit resilience path only when the browser agent cannot initialize.
    onAnswer((await api.askSupportAI(text)).data);
  }, []);

  return { ask, close: useCallback(() => { socketRef.current?.close(1000); socketRef.current = null; }, []) };
}
