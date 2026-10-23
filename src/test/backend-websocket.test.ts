import { describe, expect, it } from "vitest";
import { assertPreviewWebSocketTarget, buildBackendWebSocketUrl } from "@/lib/backendWebSocket";

describe("User Portal backend WebSocket destination", () => {
  it("derives secure preview sockets from the configured staging API and encodes the token", () => {
    const url = buildBackendWebSocketUrl("https://admiino-staging.onrender.com/api/v1", "a+b/c");
    expect(url).toBe("wss://admiino-staging.onrender.com/ws?token=a%2Bb%2Fc");
    expect(() => assertPreviewWebSocketTarget(url, "https://admiino-staging.onrender.com/api/v1", "preview")).not.toThrow();
  });

  it("allows local development sockets but rejects external preview WebSocket destinations", () => {
    expect(buildBackendWebSocketUrl("http://localhost:5001/api/v1", "token")).toBe("ws://localhost:5001/ws?token=token");
    expect(() => assertPreviewWebSocketTarget("wss://api.elevenlabs.io/v1", "https://admiino-staging.onrender.com/api/v1", "preview")).toThrow(/staging backend/);
    expect(() => assertPreviewWebSocketTarget("wss://admiino-backend.onrender.com/ws", "https://admiino-staging.onrender.com/api/v1", "preview")).toThrow(/staging backend/);
    expect(() => assertPreviewWebSocketTarget("wss://api.elevenlabs.io/v1", "https://admiino-staging.onrender.com/api/v1", "production")).not.toThrow();
  });
});
