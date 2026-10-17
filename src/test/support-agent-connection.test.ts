import { describe, expect, it } from "vitest";
import { connectSupportSocket } from "@/components/support/useSupportAgent";

describe("browser support agent connection", () => {
  it("rejects a failed WebSocket handshake so the caller can use the fallback", async () => {
    const socket: Partial<WebSocket> = { close: () => {}, onerror: null };
    const failed = connectSupportSocket("wss://signed.invalid", undefined, () => socket as WebSocket);
    queueMicrotask(() => socket.onerror?.(new Event("error")));
    await expect(failed).rejects.toThrow("Support agent unavailable");
  });

  it("resolves only after the signed WebSocket opens", async () => {
    const socket: Partial<WebSocket> = { close: () => {}, onopen: null, onerror: null };
    const opening = connectSupportSocket("wss://signed.invalid", undefined, () => socket as WebSocket);
    queueMicrotask(() => socket.onopen?.(new Event("open")));
    await expect(opening).resolves.toBe(socket);
  });
});
