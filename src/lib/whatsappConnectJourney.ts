const STORAGE_KEY = "pending_whatsapp_connect_challenge";

export function preserveWhatsAppConnectChallenge(token: string) {
  if (!/^[a-f0-9]{64}$/i.test(token)) return false;
  sessionStorage.setItem(STORAGE_KEY, token);
  return true;
}

export function consumeWhatsAppConnectReturn(): string | null {
  const token = sessionStorage.getItem(STORAGE_KEY);
  sessionStorage.removeItem(STORAGE_KEY);
  return token && /^[a-f0-9]{64}$/i.test(token)
    ? `/whatsapp/connect?t=${encodeURIComponent(token)}`
    : null;
}

export function clearWhatsAppConnectChallenge() {
  sessionStorage.removeItem(STORAGE_KEY);
}
