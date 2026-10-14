/** User-facing signup error text. Deliberately generic: no anti-abuse rules are revealed. */
export const SIGNUP_MESSAGES = {
  turnstile: "Please complete the security check and try again.",
  rateLimited: "Too many signup attempts. Please try again later.",
  verificationEmail: "We couldn't send your verification email. Please try again.",
} as const;

/** Maps an API failure to the signup message. Returns null for errors the page should word itself. */
export function signupSecurityMessage(err: unknown): string | null {
  const status = (err as { statusCode?: number; status?: number })?.statusCode ?? (err as { status?: number })?.status;
  const message = (err as { message?: string })?.message ?? "";
  if (status === 429) return SIGNUP_MESSAGES.rateLimited;
  if (status === 502 && /verification email/i.test(message)) return SIGNUP_MESSAGES.verificationEmail;
  if ((status === 400 || status === 503) && /security check/i.test(message)) return SIGNUP_MESSAGES.turnstile;
  return null;
}
