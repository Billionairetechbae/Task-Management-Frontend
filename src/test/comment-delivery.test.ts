import { describe, expect, it, vi } from "vitest";
import { deliverComment, describeCommentFailure, newClientMessageId, messageIdForAttempt } from "@/lib/commentDelivery";

const retryable = (code: string) => Object.assign(new Error(code), { name: "CommentSendError", code, retryable: true });

describe("comment delivery policy", () => {
  it("socket acknowledgement is the only success signal on the socket path; HTTP is not used", async () => {
    const http = vi.fn();
    const result = await deliverComment({ clientMessageId: "msg-1", viaSocket: async () => ({ id: "c1" }), viaHttp: http });
    expect(result).toEqual({ comment: { id: "c1" }, via: "websocket" });
    expect(http).not.toHaveBeenCalled();
  });

  it("ack timeout / lost connection / retryable server error fall back to HTTP (same client id) and report it", async () => {
    for (const code of ["ACK_TIMEOUT", "CONNECTION_LOST", "DATABASE_UNAVAILABLE", "NOT_CONNECTED"]) {
      const http = vi.fn().mockResolvedValue({ id: "saved" });
      const result = await deliverComment({ clientMessageId: "msg-2", viaSocket: async () => { throw retryable(code); }, viaHttp: http });
      expect(result.via).toBe("http"); expect(http).toHaveBeenCalledTimes(1);
    }
  });

  it("a definitive rejection (e.g. access denied) is not retried over HTTP", async () => {
    const http = vi.fn();
    await expect(deliverComment({ clientMessageId: "msg-3", viaSocket: async () => { throw Object.assign(new Error("Access denied"), { retryable: false }); }, viaHttp: http })).rejects.toThrow("Access denied");
    expect(http).not.toHaveBeenCalled();
  });

  it("no open socket goes straight to HTTP", async () => {
    const http = vi.fn().mockResolvedValue({ id: "c" });
    expect((await deliverComment({ clientMessageId: "msg-4", viaSocket: null, viaHttp: http })).via).toBe("http");
  });

  it("when both paths fail the promise rejects: the caller must keep the text and must NOT report success", async () => {
    const failure = Object.assign(new Error("Service unavailable"), { name: "ApiError", statusCode: 503, body: { code: "DATABASE_UNAVAILABLE" } });
    await expect(deliverComment({ clientMessageId: "msg-5", viaSocket: async () => { throw retryable("ACK_TIMEOUT"); }, viaHttp: async () => { throw failure; } })).rejects.toBe(failure);
  });

  it("a retry after a failure reuses the same client id, so the server can de-duplicate", async () => {
    const seen: string[] = [];
    const http = async () => { seen.push("msg-6"); return { id: "c" }; };
    await deliverComment({ clientMessageId: "msg-6", viaSocket: async () => { throw retryable("ACK_TIMEOUT"); }, viaHttp: http });
    await deliverComment({ clientMessageId: "msg-6", viaSocket: null, viaHttp: http });
    expect(new Set(seen).size).toBe(1);
  });

  it("generates ids the server accepts (8-100 chars of [A-Za-z0-9_-]) and unique per comment", () => {
    const ids = Array.from({ length: 200 }, () => newClientMessageId());
    expect(new Set(ids).size).toBe(200);
    for (const id of ids) expect(id).toMatch(/^[A-Za-z0-9_-]{8,100}$/);
  });

  it("user-facing failure text distinguishes offline, outage and other errors and says the comment was kept", () => {
    expect(describeCommentFailure(Object.assign(new Error("x"), { name: "NetworkError" }))).toMatch(/offline.*kept/i);
    expect(describeCommentFailure(Object.assign(new Error("x"), { name: "ApiError", statusCode: 503 }))).toMatch(/temporarily unavailable.*kept/i);
    expect(describeCommentFailure(Object.assign(new Error("Read-only access"), { name: "ApiError", statusCode: 403 }))).toBe("Read-only access");
  });

  it("resending the SAME text after a failed attempt reuses its client id (the failed attempt may have been saved); anything else gets a fresh id", () => {
    const failed = { taskId: "t1", content: "hello", id: "msg-failed-0001" };
    const make = vi.fn(() => "msg-fresh-0002");
    expect(messageIdForAttempt(failed, "t1", "hello", false, make)).toBe("msg-failed-0001");
    expect(make).not.toHaveBeenCalled();
    expect(messageIdForAttempt(failed, "t1", "hello edited", false, make)).toBe("msg-fresh-0002");
    expect(messageIdForAttempt(failed, "t2", "hello", false, make)).toBe("msg-fresh-0002");
    expect(messageIdForAttempt(failed, "t1", "hello", true, make)).toBe("msg-fresh-0002"); // a reply is a different comment
    expect(messageIdForAttempt(null, "t1", "hello", false, make)).toBe("msg-fresh-0002");
  });

  it("scenario: WS persisted but the ack was lost and HTTP also failed; the user presses send again => same id => server returns the saved comment", async () => {
    const serverRows = new Map<string, string>();
    const http = async (id: string, text: string) => { if (!serverRows.has(id)) serverRows.set(id, text); return { id: `c-${id}`, duplicate: serverRows.has(id) }; };
    let failed: { taskId: string; content: string; id: string } | null = null;
    const first = messageIdForAttempt(failed, "t1", "hello", false);
    serverRows.set(first, "hello"); // the socket write did reach the database
    await expect(deliverComment({ clientMessageId: first, viaSocket: async () => { throw Object.assign(new Error("x"), { retryable: true }); }, viaHttp: async () => { throw Object.assign(new Error("offline"), { name: "NetworkError" }); } })).rejects.toBeTruthy();
    failed = { taskId: "t1", content: "hello", id: first };
    const second = messageIdForAttempt(failed, "t1", "hello", false);
    await deliverComment({ clientMessageId: second, viaSocket: null, viaHttp: () => http(second, "hello") });
    expect(second).toBe(first); expect(serverRows.size).toBe(1);
  });
});
