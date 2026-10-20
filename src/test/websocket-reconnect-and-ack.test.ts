import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/use-toast", () => ({ toast: vi.fn() }));

import { WebSocketService, reconnectDecision, reconnectDelay, CommentSendError } from "@/lib/websocket";
import { toast } from "@/hooks/use-toast";

class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1; static CLOSED = 3; static CONNECTING = 0; static CLOSING = 2;
  readyState = 0; sent: any[] = [];
  onopen: (() => void) | null = null; onclose: ((e: { code: number; reason: string }) => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null; onerror: (() => void) | null = null;
  constructor(public url: string) { FakeSocket.instances.push(this); }
  send(data: string) { if (this.readyState !== 1) throw new Error("not open"); this.sent.push(JSON.parse(data)); }
  close(code = 1000, reason = "") { this.readyState = 3; this.onclose?.({ code, reason }); }
  // helpers
  open() { this.readyState = 1; this.onopen?.(); }
  serverClose(code: number) { this.readyState = 3; this.onclose?.({ code, reason: "" }); }
  serverSend(message: object) { this.onmessage?.({ data: JSON.stringify(message) }); }
}
const last = () => FakeSocket.instances[FakeSocket.instances.length - 1];

describe("WebSocket reconnection policy", () => {
  beforeEach(() => { FakeSocket.instances = []; vi.useFakeTimers(); vi.stubGlobal("WebSocket", FakeSocket); vi.mocked(toast).mockClear(); vi.spyOn(Math, "random").mockReturnValue(0); });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("decides per close code: normal -> none, 1008 (auth/session) -> auth, 1006/1013/1001/1011 -> retry", () => {
    expect(reconnectDecision(1000)).toBe("none");
    expect(reconnectDecision(1008)).toBe("auth");
    for (const code of [1006, 1013, 1001, 1011, 1012, 1005]) expect(reconnectDecision(code)).toBe("retry");
    expect(reconnectDelay(1, 1000, () => 0)).toBe(1000);
    expect(reconnectDelay(40, 1000, () => 0)).toBe(30000); // capped
  });

  it("reports every transition and never gives up: 12 consecutive failures are still followed by another attempt", async () => {
    const service = new WebSocketService();
    const states: boolean[] = []; service.onStatusChange((c) => states.push(c));
    const first = service.connect("tok"); last().open(); await first;
    expect(states).toEqual([true]);
    last().serverClose(1006);
    expect(states).toEqual([true, false]);
    for (let attempt = 1; attempt <= 12; attempt++) {
      await vi.advanceTimersByTimeAsync(31000);
      expect(FakeSocket.instances.length).toBe(attempt + 1);
      last().serverClose(1006); // the backend is still down
    }
    await vi.advanceTimersByTimeAsync(31000);
    expect(FakeSocket.instances.length).toBe(14);
    last().open();
    expect(states[states.length - 1]).toBe(true);
    expect(toast).toHaveBeenCalledTimes(1); // one calm notice, not an alarm per attempt
    expect(vi.mocked(toast).mock.calls[0][0]).not.toMatchObject({ variant: "destructive" });
  });

  it("does not reconnect after a normal close or an authentication/session close (1008)", async () => {
    const service = new WebSocketService();
    const p = service.connect("tok"); last().open(); await p;
    last().serverClose(1008);
    await vi.advanceTimersByTimeAsync(120000);
    expect(FakeSocket.instances.length).toBe(1);
    const p2 = service.connect("tok2"); last().open(); await p2;
    last().serverClose(1000);
    await vi.advanceTimersByTimeAsync(120000);
    expect(FakeSocket.instances.length).toBe(2);
  });

  it("an explicit disconnect (logout) cancels pending reconnects and does not reconnect", async () => {
    const service = new WebSocketService();
    const p = service.connect("tok"); last().open(); await p;
    last().serverClose(1006);
    service.disconnect();
    await vi.advanceTimersByTimeAsync(120000);
    expect(FakeSocket.instances.length).toBe(1);
  });

  it("connect() is idempotent: concurrent calls while connecting or open reuse the same socket", async () => {
    const service = new WebSocketService();
    const a = service.connect("tok"); const b = service.connect("tok");
    expect(FakeSocket.instances.length).toBe(1);
    last().open(); await Promise.all([a, b]);
    await service.connect("tok");
    expect(FakeSocket.instances.length).toBe(1);
  });

  it("after a reconnect, every task room the client still has open is joined again (the server forgets rooms)", async () => {
    const service = new WebSocketService();
    const p = service.connect("tok"); last().open(); await p;
    service.joinTaskRoom("task-1"); service.joinTaskRoom("task-2");
    last().serverClose(1013);
    await vi.advanceTimersByTimeAsync(31000);
    last().open();
    expect(last().sent.filter((m) => m.type === "join_task").map((m) => m.taskId).sort()).toEqual(["task-1", "task-2"]);
  });
});

describe("acknowledged comment sending", () => {
  let service: WebSocketService;
  beforeEach(async () => {
    FakeSocket.instances = []; vi.useFakeTimers(); vi.stubGlobal("WebSocket", FakeSocket); vi.spyOn(Math, "random").mockReturnValue(0);
    service = new WebSocketService(); const p = service.connect("tok"); last().open(); await p;
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

  it("resolves only on the server acknowledgement carrying the same client message id", async () => {
    const promise = service.sendCommentWithAck("t1", "hello", "msg-A");
    expect(last().sent[0]).toMatchObject({ type: "new_comment", taskId: "t1", messageId: "msg-A", comment: { content: "hello" } });
    let settled = false; promise.then(() => { settled = true; });
    last().serverSend({ type: "new_comment", comment: { id: "c-other" }, userId: "someone" }); // a broadcast: not an ack
    last().serverSend({ type: "new_comment", ack: true, messageId: "msg-OTHER", comment: { id: "c-x" } });
    await Promise.resolve(); expect(settled).toBe(false);
    last().serverSend({ type: "new_comment", ack: true, messageId: "msg-A", comment: { id: "c-1", content: "hello" } });
    await expect(promise).resolves.toMatchObject({ id: "c-1" });
  });

  it("rejects (never 'delivered') on timeout, with a retryable error", async () => {
    const promise = service.sendCommentWithAck("t1", "hello", "msg-B", 8000);
    const assertion = expect(promise).rejects.toMatchObject({ name: "CommentSendError", code: "ACK_TIMEOUT", retryable: true });
    await vi.advanceTimersByTimeAsync(8001); await assertion;
  });

  it("rejects when the connection is lost before the acknowledgement", async () => {
    const promise = service.sendCommentWithAck("t1", "hello", "msg-C");
    const assertion = expect(promise).rejects.toMatchObject({ code: "CONNECTION_LOST", retryable: true });
    last().serverClose(1006); await assertion;
  });

  it("rejects with the server's retryable flag for a correlated comment_error (outage vs permission)", async () => {
    const outage = service.sendCommentWithAck("t1", "a", "msg-D");
    last().serverSend({ type: "comment_error", messageId: "msg-D", code: "DATABASE_UNAVAILABLE", retryable: true, message: "Service temporarily unavailable" });
    await expect(outage).rejects.toMatchObject({ code: "DATABASE_UNAVAILABLE", retryable: true });
    const denied = service.sendCommentWithAck("t1", "b", "msg-E");
    last().serverSend({ type: "comment_error", messageId: "msg-E", message: "Access denied", retryable: false });
    await expect(denied).rejects.toMatchObject({ retryable: false });
  });

  it("rejects immediately when the socket is not open", async () => {
    last().serverClose(1000);
    await expect(service.sendCommentWithAck("t1", "x", "msg-F")).rejects.toBeInstanceOf(CommentSendError);
  });

  it("timers are cleared once settled (no stale rejection after an ack)", async () => {
    const promise = service.sendCommentWithAck("t1", "x", "msg-G", 1000);
    last().serverSend({ type: "new_comment", ack: true, messageId: "msg-G", comment: { id: "c" } });
    await promise;
    await vi.advanceTimersByTimeAsync(5000); // would throw an unhandled rejection if the timer still fired
  });
});
