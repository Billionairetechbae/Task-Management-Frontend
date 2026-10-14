import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  signupUser: vi.fn(),
  signupExecutive: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: { signupUser: h.signupUser, signupExecutive: h.signupExecutive, resendVerificationEmail: vi.fn() } }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/components/Logo", () => ({ default: () => null }));
vi.mock("@/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => null }));

// A controllable stand-in for Cloudflare's global.
let widgetCallback: ((t: string) => void) | undefined;
let widgetExpired: (() => void) | undefined;
const turnstile = { render: vi.fn(), reset: vi.fn(), remove: vi.fn() };

async function loadPages(siteKey: string | undefined) {
  vi.resetModules();
  if (siteKey) vi.stubEnv("VITE_TURNSTILE_SITE_KEY", siteKey); else vi.stubEnv("VITE_TURNSTILE_SITE_KEY", "");
  const Signup = (await import("../pages/Signup")).default;
  const SignupExecutive = (await import("../pages/SignupExecutive")).default;
  const widget = await import("../components/TurnstileWidget");
  return { Signup, SignupExecutive, widget };
}

beforeEach(() => {
  h.signupUser.mockReset(); h.signupExecutive.mockReset(); h.toast.mockReset();
  turnstile.render.mockReset().mockImplementation((_el: HTMLElement, opts: any) => { widgetCallback = opts.callback; widgetExpired = opts["expired-callback"]; return "w1"; });
  turnstile.reset.mockReset(); turnstile.remove.mockReset();
  (window as any).turnstile = turnstile;
});
afterEach(() => { vi.unstubAllEnvs(); delete (window as any).turnstile; });

async function fillSignup() {
  await userEvent.type(screen.getByPlaceholderText("John"), "Ada");
  await userEvent.type(screen.getByPlaceholderText("Doe"), "Obi");
  await userEvent.type(screen.getByPlaceholderText("you@business.com"), "ada@example.com");
  await userEvent.type(screen.getByPlaceholderText("••••••••"), "password123");
  await userEvent.click(document.getElementById("consent")!);
}
const submitBtn = () => screen.getAllByRole("button").find((b) => (b as HTMLButtonElement).type === "submit") as HTMLButtonElement;

describe("signup Turnstile (frontend)", () => {
  it("renders the challenge, keeps submit disabled until a token exists, then sends the token", async () => {
    const { Signup } = await loadPages("site-key-123");
    h.signupUser.mockResolvedValue({ status: "success", message: "ok" });
    render(<MemoryRouter><Signup /></MemoryRouter>);
    await waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    expect(turnstile.render.mock.calls[0][1].sitekey).toBe("site-key-123");
    await fillSignup();
    expect(submitBtn()).toBeDisabled();
    widgetCallback!("tok-1");
    await waitFor(() => expect(submitBtn()).not.toBeDisabled());
    await userEvent.click(submitBtn());
    await waitFor(() => expect(h.signupUser).toHaveBeenCalled());
    expect(h.signupUser.mock.calls[0][0]).toMatchObject({ email: "ada@example.com", turnstileToken: "tok-1" });
  });

  it("an expired token disables submit again", async () => {
    const { Signup } = await loadPages("k");
    render(<MemoryRouter><Signup /></MemoryRouter>);
    await waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    await fillSignup();
    widgetCallback!("tok");
    await waitFor(() => expect(submitBtn()).not.toBeDisabled());
    widgetExpired!();
    await waitFor(() => expect(submitBtn()).toBeDisabled());
  });

  it.each([
    [{ statusCode: 400, message: "Please complete the security check and try again." }, "Please complete the security check and try again."],
    [{ statusCode: 429, message: "anything" }, "Too many signup attempts. Please try again later."],
    [{ statusCode: 502, message: "We couldn't send your verification email. Please try again." }, "We couldn't send your verification email. Please try again."],
  ])("failure resets the single-use challenge and shows the right message (%#)", async (apiError, expected) => {
    const { Signup } = await loadPages("k");
    h.signupUser.mockRejectedValue(Object.assign(new Error(apiError.message), apiError));
    render(<MemoryRouter><Signup /></MemoryRouter>);
    await waitFor(() => expect(turnstile.render).toHaveBeenCalled());
    await fillSignup();
    widgetCallback!("tok");
    await waitFor(() => expect(submitBtn()).not.toBeDisabled());
    await userEvent.click(submitBtn());
    expect(await screen.findAllByText(expected)).not.toHaveLength(0);
    expect(turnstile.reset).toHaveBeenCalledWith("w1");
    expect(submitBtn()).toBeDisabled(); // token cleared by reset; user must complete a new challenge
  });

  it("does not call the API without a token when a site key is configured", async () => {
    const { Signup } = await loadPages("k");
    render(<MemoryRouter><Signup /></MemoryRouter>);
    await fillSignup();
    await userEvent.click(submitBtn());
    expect(h.signupUser).not.toHaveBeenCalled();
  });

  it("without a site key (local dev) the widget is absent and signup is not blocked client-side", async () => {
    const { Signup } = await loadPages(undefined);
    h.signupUser.mockResolvedValue({ status: "success", message: "ok" });
    render(<MemoryRouter><Signup /></MemoryRouter>);
    expect(screen.queryByTestId("turnstile-widget")).toBeNull();
    await fillSignup();
    await userEvent.click(submitBtn());
    await waitFor(() => expect(h.signupUser).toHaveBeenCalled());
    expect(h.signupUser.mock.calls[0][0].turnstileToken).toBeUndefined();
  });
});

describe("signupSecurityMessage", () => {
  it("maps API failures to the approved copy and ignores unrelated errors", async () => {
    const { SIGNUP_MESSAGES, signupSecurityMessage } = await import("../lib/signupErrors");
    expect(signupSecurityMessage({ statusCode: 429, message: "x" })).toBe(SIGNUP_MESSAGES.rateLimited);
    expect(signupSecurityMessage({ statusCode: 502, message: "We couldn't send your verification email." })).toBe(SIGNUP_MESSAGES.verificationEmail);
    expect(signupSecurityMessage({ statusCode: 503, message: "We couldn't complete the security check. Please try again." })).toBe(SIGNUP_MESSAGES.turnstile);
    expect(signupSecurityMessage({ statusCode: 400, message: "Email already exists" })).toBeNull();
    expect(signupSecurityMessage(new Error("boom"))).toBeNull();
  });
});
