/**
 * Comment delivery policy. A comment is "delivered" only after the server confirms persistence:
 *   1. WebSocket path: resolves on the server's acknowledgement carrying our clientMessageId;
 *   2. otherwise (socket closed, ack timeout, connection lost, retryable server error) fall back to HTTP using the SAME
 *      clientMessageId, so a comment the server already saved over the socket is returned, not created twice;
 *   3. if HTTP fails too, reject: the caller keeps the user's text and reports "not sent". Nothing is ever reported as sent early.
 */
export interface DeliveredComment { comment: any; via: "websocket" | "http" }

export async function deliverComment(args: {
  clientMessageId: string;
  /** Present only when the socket is open and the comment is a plain text comment (no files/mentions/replies). */
  viaSocket: (() => Promise<any>) | null;
  viaHttp: () => Promise<any>;
}): Promise<DeliveredComment> {
  if (args.viaSocket) {
    try {
      return { comment: await args.viaSocket(), via: "websocket" };
    } catch (error) {
      // A definitive rejection (e.g. access denied) will not succeed over HTTP either.
      if ((error as { retryable?: boolean })?.retryable === false) throw error;
    }
  }
  return { comment: await args.viaHttp(), via: "http" };
}

export const newClientMessageId = (): string =>
  `msg-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 6)}`;

/** The text restored to the composer, and a user-facing reason, when delivery failed. */
export function describeCommentFailure(error: unknown): string {
  const e = error as { statusCode?: number; name?: string; body?: { code?: string }; message?: string } | null;
  if (e?.name === "NetworkError") return "You appear to be offline. Your comment was not sent and has been kept so you can try again.";
  if (e?.statusCode === 503 || e?.body?.code === "DATABASE_UNAVAILABLE") return "The service is temporarily unavailable. Your comment was not sent and has been kept so you can try again.";
  return e?.message || "Your comment was not sent and has been kept so you can try again.";
}

/**
 * A failed attempt may nevertheless have been saved (the acknowledgement or response was lost). When the user sends the SAME text
 * again, reuse the failed attempt's client id so the server returns the saved comment instead of creating a second one.
 * Different text, a different task or a reply gets a fresh id.
 */
export interface FailedAttempt { taskId: string; content: string; id: string }
export function messageIdForAttempt(previous: FailedAttempt | null, taskId: string, content: string, isReply: boolean, make: () => string = newClientMessageId): string {
  return previous && !isReply && previous.taskId === taskId && previous.content === content ? previous.id : make();
}
