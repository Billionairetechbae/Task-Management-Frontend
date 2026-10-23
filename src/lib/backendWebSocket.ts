export function buildBackendWebSocketUrl(apiBaseUrl: string, token: string): string {
  const api = new URL(apiBaseUrl);
  if (api.username || api.password || api.search || api.hash || !api.pathname.replace(/\/$/, "").endsWith("/api/v1")) {
    throw new Error("VITE_API_BASE_URL must be a clean /api/v1 URL.");
  }
  const socket = new URL("/ws", api.origin);
  socket.protocol = api.protocol === "https:" ? "wss:" : api.protocol === "http:" ? "ws:" : "";
  if (!["ws:", "wss:"].includes(socket.protocol)) throw new Error("VITE_API_BASE_URL must use HTTP or HTTPS.");
  socket.searchParams.set("token", token);
  return socket.toString();
}

export function assertPreviewWebSocketTarget(
  socketUrl: string,
  apiBaseUrl: string,
  buildTarget: string,
): void {
  if (buildTarget !== "preview") return;
  const socket = new URL(socketUrl);
  const api = new URL(apiBaseUrl);
  const expectedProtocol = api.protocol === "https:" ? "wss:" : "ws:";
  if (socket.username || socket.password || socket.protocol !== expectedProtocol || socket.origin !== `${expectedProtocol}//${api.host}` || socket.pathname !== "/ws") {
    throw new Error("Preview WebSockets must connect to the configured staging backend.");
  }
}
