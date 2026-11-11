import { describe, expect, it } from "vitest";
import { assertPreviewWebSocketTarget, buildBackendWebSocketUrl } from "@/lib/backendWebSocket";

describe("User Portal backend WebSocket destination", () => {
  it("derives secure preview sockets from the configured staging API and encodes the token", () => {
    const url = buildBackendWebSocketUrl("https://admiino-backend-staging.onrender.com/api/v1", "a+b/c");
    expect(url).toBe("wss://admiino-backend-staging.onrender.com/ws?token=a%2Bb%2Fc");
    expect(() => assertPreviewWebSocketTarget(url, "https://admiino-backend-staging.onrender.com/api/v1", "staging")).not.toThrow();
  });

  it("allows local development sockets but rejects external preview WebSocket destinations", () => {
    expect(buildBackendWebSocketUrl("http://localhost:5001/api/v1", "token")).toBe("ws://localhost:5001/ws?token=token");
    expect(() => assertPreviewWebSocketTarget("wss://api.elevenlabs.io/v1", "https://admiino-backend-staging.onrender.com/api/v1", "staging")).toThrow(/staging backend/);
    expect(() => assertPreviewWebSocketTarget("wss://api.admiino.com/ws", "https://admiino-backend-staging.onrender.com/api/v1", "staging")).toThrow(/staging backend/);
    expect(() => assertPreviewWebSocketTarget("wss://api.elevenlabs.io/v1", "https://admiino-backend-staging.onrender.com/api/v1", "production")).not.toThrow();
  });
});
