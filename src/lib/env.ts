export function getEnv(name: string): string | undefined {
  const v = (import.meta as any)?.env?.[name];
  return typeof v === "string" && v.trim().length > 0 ? v : undefined;
}

export function requireEnv(name: string): string {
  const v = getEnv(name);
  if (!v) {
    throw new Error(
      `Missing environment variable ${name}. ` +
        `Create a .env file (not committed) or set it in your hosting provider.`
    );
  }
  return v;
}

export function envOr(name: string, fallback: string): string {
  return getEnv(name) ?? fallback;
}

