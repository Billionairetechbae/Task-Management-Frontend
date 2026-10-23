import { render, screen, waitFor, fireEvent, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "ab".repeat(32);
const state = vi.hoisted(() => ({
  auth: {} as Record<string, unknown>,
  inspect: vi.fn(), activate: vi.fn(), accept: vi.fn(), toast: vi.fn(),
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => state.auth }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: state.toast }) }));
vi.mock("@/components/GoogleAuthButton", () => ({ GoogleAuthButton: () => <button type="button">Google</button> }));
vi.mock("@/lib/api", () => ({ api: { inspectOrgInvitation: state.inspect, activateOrgAccount: state.activate, acceptOrgInvitation: state.accept } }));

import ActivateAccount from "@/pages/ActivateAccount";
import ClaimOwnership from "@/pages/ClaimOwnership";
import Login from "@/pages/Login";
import { checkPassword, clearPendingInvitation, passwordProblem, PENDING_KEY, peekPendingInvitation, savePendingInvitation, takeInvitationToken, takePendingInvitation } from "@/lib/orgActivation";
import { consumeAuthReturnPath } from "@/lib/authReturnPath";

const info = (extra: Record<string, unknown> = {}) => ({
  purpose: "employee_activation", ownership: false, organizationName: "Acme Ltd", workspaceRole: "manager", unitNames: ["Finance"], email: "ada@acme.test",
  firstName: "Ada", lastName: "Okoro", existingAccount: false, recoveryRequired: false, expiresAt: "2026-10-25T10:00:00Z", ...extra,
});
const ok = (extra = {}) => state.inspect.mockResolvedValue({ status: "success", data: { invitation: info(extra) } });
const apiError = (code: string, message = "nope", statusCode = 409) => Object.assign(new Error(message), { statusCode, body: { code } });

const Where = () => { const l = useLocation(); return <div data-testid="where">{l.pathname}</div>; };
const mount = (path = "/activate-account", hash = `#token=${SECRET}`) => {
  window.history.replaceState(null, "", `${path}${hash}`);
  const element = path.startsWith("/claim") ? <ClaimOwnership /> : <ActivateAccount />;
  return render(<MemoryRouter initialEntries={[path]}><Routes><Route path={path} element={<>{element}<Where /></>} /><Route path="/dashboard" element={<div>Dashboard destination</div>} /><Route path="/" element={<div>Login destination</div>} /><Route path="/forgot-password" element={<div>Forgot destination</div>} /></Routes></MemoryRouter>);
};
const field = (label: RegExp | string) => screen.getByLabelText(label) as HTMLInputElement;
const fill = async (u: ReturnType<typeof userEvent.setup>, label: RegExp | string, value: string) => { const el = field(label); await u.clear(el); await u.type(el, value); };

beforeEach(() => {
  sessionStorage.clear(); localStorage.clear();
  state.inspect.mockReset(); state.activate.mockReset(); state.accept.mockReset(); state.toast.mockReset();
  state.auth = { user: null, loading: false, refreshUser: vi.fn().mockResolvedValue(undefined), setActiveCompanyId: vi.fn(), logout: vi.fn(), login: vi.fn(), loginWithGoogleToken: vi.fn(), workspaces: [], activeCompanyId: null, setUser: vi.fn() };
});
afterEach(() => { cleanup(); window.history.replaceState(null, "", "/"); });

describe("invitation helpers", () => {
  it("reads the secret from the URL fragment once, removes it from the address bar, and rejects malformed values", () => {
    window.history.replaceState(null, "", `/activate-account#token=${SECRET}`);
    expect(takeInvitationToken()).toBe(SECRET);
    expect(window.location.hash).toBe(""); expect(window.location.href).not.toContain(SECRET);
    window.history.replaceState(null, "", "/activate-account#token=not-a-secret");
    expect(takeInvitationToken()).toBe("");
    window.history.replaceState(null, "", `/activate-account?token=${SECRET}`); // a query string is never accepted
    expect(takeInvitationToken()).toBe("");
  });

  it("a parked secret is used once, only for this browser tab's session, and expires", () => {
    savePendingInvitation(SECRET); expect(peekPendingInvitation()).toBe(true);
    expect(takePendingInvitation()).toBe(SECRET); expect(takePendingInvitation()).toBeNull(); expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
    savePendingInvitation("zz"); expect(takePendingInvitation()).toBeNull(); // malformed value is refused
    vi.useFakeTimers();
    try { savePendingInvitation(SECRET); vi.advanceTimersByTime(31 * 60 * 1000); expect(takePendingInvitation()).toBeNull(); } finally { vi.useRealTimers(); }
    savePendingInvitation(SECRET); clearPendingInvitation(); expect(peekPendingInvitation()).toBe(false);
  });

  it("password rules match the server policy (8-100, letter + number, not email-derived)", () => {
    expect(passwordProblem("", "a@x.test")).toMatch(/Enter a password/);
    expect(passwordProblem("abc1234", "a@x.test")).toMatch(/at least 8/);
    expect(passwordProblem("abcd1234", "a@x.test")).toBeNull();
    expect(passwordProblem("abcdefgh", "a@x.test")).toMatch(/letter and one number/);
    expect(passwordProblem("12345678", "a@x.test")).toMatch(/letter and one number/);
    expect(passwordProblem("Xadaokoro9", "adaokoro@x.test")).toMatch(/email name/);
    expect(passwordProblem("x1".repeat(51), "a@x.test")).toMatch(/at most 100/);
    expect(checkPassword("abcd1234", "a@x.test")).toEqual({ length: true, letterAndNumber: true, notEmailDerived: true, withinMax: true });
  });
});

describe("new employee activation", () => {
  it("greets by organization, shows the fixed email read-only, prefills names, and removes the secret from the URL", async () => {
    ok(); mount();
    expect(await screen.findByText("Welcome to Admiino")).toBeInTheDocument();
    expect(screen.getByText("Your workspace at Acme Ltd is ready.")).toBeInTheDocument();
    expect(screen.getByText(/invited as Manager in Finance/)).toBeInTheDocument();
    const email = field(/Email address/);
    expect(email.value).toBe("ada@acme.test"); expect(email.readOnly).toBe(true); expect(email.getAttribute("aria-readonly")).toBe("true");
    expect(field("First name").value).toBe("Ada"); expect(field("Last name").value).toBe("Okoro");
    expect(field("New password").value).toBe(""); expect(field("Confirm password").value).toBe("");
    expect(state.inspect).toHaveBeenCalledWith(SECRET);
    expect(window.location.href).not.toContain(SECRET);
  });

  it("typing in the email field cannot change it, and the request never carries an email", async () => {
    ok(); const u = userEvent.setup(); mount();
    await screen.findByText("Welcome to Admiino");
    await u.type(field(/Email address/), "attacker@evil.test");
    fireEvent.change(field(/Email address/), { target: { value: "attacker@evil.test" } });
    state.activate.mockResolvedValue({ status: "success", token: "jwt", data: { workspaces: [], companyId: "c1", role: "manager" } });
    await fill(u, "New password", "Chosen1pass"); await fill(u, "Confirm password", "Chosen1pass");
    await u.click(screen.getByRole("button", { name: "Activate Account & Continue" }));
    await waitFor(() => expect(state.activate).toHaveBeenCalled());
    const body = state.activate.mock.calls[0][0];
    expect(Object.keys(body).sort()).toEqual(["confirmPassword", "firstName", "lastName", "ownership", "password", "token"].filter((k) => k in body).sort());
    expect(body).not.toHaveProperty("email"); expect(body).toMatchObject({ token: SECRET, firstName: "Ada", lastName: "Okoro", password: "Chosen1pass", confirmPassword: "Chosen1pass" });
  });

  it("validates password strength live, supports show/hide, blocks mismatches, and only then enables the button", async () => {
    ok({ email: "adaokoro@acme.test" }); const u = userEvent.setup(); mount();
    await screen.findByText("Welcome to Admiino");
    const button = screen.getByRole("button", { name: "Activate Account & Continue" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await fill(u, "New password", "short1");
    expect(screen.getByText(/At least 8 characters/).textContent).toContain("not met yet");
    await fill(u, "New password", "lettersonly");
    expect(screen.getByText(/A letter and a number/).textContent).toContain("not met yet");
    await fill(u, "New password", "adaokoro-pw1");
    expect(field("New password").getAttribute("aria-invalid")).toBe("true");
    await fill(u, "New password", "Chosen1pass");
    await fill(u, "Confirm password", "Different1pass");
    expect(await screen.findByText("The passwords don't match.")).toBeInTheDocument(); expect(button.disabled).toBe(true);
    expect(field("New password").type).toBe("password");
    await u.click(screen.getByRole("button", { name: "Show passwords" }));
    expect(field("New password").type).toBe("text"); expect(field("Confirm password").type).toBe("text");
    await u.click(screen.getByRole("button", { name: "Hide passwords" })); expect(field("New password").type).toBe("password");
    await fill(u, "Confirm password", "Chosen1pass"); expect(button.disabled).toBe(false);
    await u.clear(field("First name")); expect(button.disabled).toBe(true); // a name is required
  });

  it("activates, signs the person in through the existing session mechanism and opens their workspace", async () => {
    ok(); const u = userEvent.setup(); mount();
    await screen.findByText("Welcome to Admiino");
    state.activate.mockResolvedValue({ status: "success", token: "jwt", data: { workspaces: [], companyId: "company-9", role: "manager" } });
    await fill(u, "First name", "Adaeze"); await fill(u, "New password", "Chosen1pass"); await fill(u, "Confirm password", "Chosen1pass");
    await u.click(screen.getByRole("button", { name: "Activate Account & Continue" }));
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
    expect(state.activate).toHaveBeenCalledWith(expect.objectContaining({ firstName: "Adaeze", token: SECRET }));
    expect(state.auth.refreshUser).toHaveBeenCalled(); expect(state.auth.setActiveCompanyId).toHaveBeenCalledWith("company-9");
    expect(localStorage.getItem("activeCompanyId")).toBe("company-9");
    expect(sessionStorage.getItem(PENDING_KEY)).toBeNull();
  });

  it("a double click submits once", async () => {
    ok(); const u = userEvent.setup(); mount();
    await screen.findByText("Welcome to Admiino");
    let release: (v: unknown) => void = () => {};
    state.activate.mockReturnValue(new Promise((resolve) => { release = resolve; }));
    await fill(u, "New password", "Chosen1pass"); await fill(u, "Confirm password", "Chosen1pass");
    const button = screen.getByRole("button", { name: "Activate Account & Continue" });
    await u.dblClick(button);
    expect(state.activate).toHaveBeenCalledTimes(1);
    release({ status: "success", token: "jwt", data: { workspaces: [], companyId: "c1", role: "member" } });
    await screen.findByText("Dashboard destination");
  });

  it("shows the server's password message and keeps the form so the person can correct it", async () => {
    ok(); const u = userEvent.setup(); mount();
    await screen.findByText("Welcome to Admiino");
    state.activate.mockRejectedValue(apiError("PASSWORD_POLICY", "Password must not contain your email name.", 422));
    await fill(u, "New password", "Chosen1pass"); await fill(u, "Confirm password", "Chosen1pass");
    await u.click(screen.getByRole("button", { name: "Activate Account & Continue" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Password must not contain your email name.");
    expect(screen.getByRole("button", { name: "Activate Account & Continue" })).toBeEnabled();
  });

  it("if an account appeared meanwhile the page switches to sign-in instead of overwriting anything", async () => {
    ok(); const u = userEvent.setup(); mount();
    await screen.findByText("Welcome to Admiino");
    state.activate.mockRejectedValue(apiError("LOGIN_REQUIRED"));
    await fill(u, "New password", "Chosen1pass"); await fill(u, "Confirm password", "Chosen1pass");
    await u.click(screen.getByRole("button", { name: "Activate Account & Continue" }));
    expect(await screen.findByRole("button", { name: "Sign in to continue" })).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).toBeNull();
  });

  it("an account that needs recovery gets a safe explanation and a reset link, not a form", async () => {
    ok({ recoveryRequired: true }); mount();
    expect(await screen.findByText("We need to recover your account first")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Reset my password" })).toHaveAttribute("href", "/forgot-password");
    expect(screen.queryByLabelText("New password")).toBeNull();
  });
});

describe("expired, revoked, replayed or missing links", () => {
  it.each([
    ["no secret in the address", () => { /* nothing inspected */ }, ""],
    ["the server refuses the secret", () => state.inspect.mockRejectedValue(apiError("INVITATION_UNAVAILABLE", "x", 404)), `#token=${SECRET}`],
  ])("%s => one neutral recovery page (no reason is revealed)", async (_name, arrange, hash) => {
    arrange(); mount("/activate-account", hash as string);
    expect(await screen.findByText("This invitation link can't be used")).toBeInTheDocument();
    expect(screen.getByText(/Forgot password/)).toBeInTheDocument(); expect(screen.getByText(/newest email/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Go to sign in" })).toHaveAttribute("href", "/");
    expect(document.body.textContent).not.toMatch(/revoked by|expired at|used on/i);
  });

  it("a rejection during activation also lands on the neutral page", async () => {
    ok(); const u = userEvent.setup(); mount();
    await screen.findByText("Welcome to Admiino");
    state.activate.mockRejectedValue(apiError("INVITATION_UNAVAILABLE", "x", 404));
    await fill(u, "New password", "Chosen1pass"); await fill(u, "Confirm password", "Chosen1pass");
    await u.click(screen.getByRole("button", { name: "Activate Account & Continue" }));
    expect(await screen.findByText("This invitation link can't be used")).toBeInTheDocument();
  });
});

describe("existing Admiino account", () => {
  it("must sign in first: the secret is parked for this tab and the person returns here after sign-in", async () => {
    ok({ existingAccount: true, purpose: "existing_user_join" }); const u = userEvent.setup(); mount();
    expect(await screen.findByText(/already has an Admiino account/)).toBeInTheDocument();
    expect(screen.getByText(/Your password, profile and other workspaces stay exactly as they are/)).toBeInTheDocument();
    expect(screen.queryByLabelText("New password")).toBeNull(); // no password is collected for an existing account
    await u.click(screen.getByRole("button", { name: "Sign in to continue" }));
    expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(takePendingInvitation()).toBe(SECRET);
  });

  it("the matching signed-in account accepts, keeping its session and opening the new workspace", async () => {
    ok({ existingAccount: true }); state.auth.user = { id: "u1", email: "Ada@Acme.test" }; const u = userEvent.setup(); mount();
    state.accept.mockResolvedValue({ status: "success", data: { workspaces: [], companyId: "c7", role: "manager" } });
    await u.click(await screen.findByRole("button", { name: "Accept & continue" }));
    expect(await screen.findByText("Dashboard destination")).toBeInTheDocument();
    expect(state.accept).toHaveBeenCalledWith(SECRET, false); expect(state.activate).not.toHaveBeenCalled();
    expect(state.auth.setActiveCompanyId).toHaveBeenCalledWith("c7");
  });

  it("a different signed-in account cannot accept; it is offered a sign-out and the secret stays parked", async () => {
    ok({ existingAccount: true }); state.auth.user = { id: "u2", email: "someone.else@acme.test" }; const u = userEvent.setup(); mount();
    expect(await screen.findByRole("alert")).toHaveTextContent(/different account/);
    expect(screen.queryByRole("button", { name: "Accept & continue" })).toBeNull();
    await u.click(screen.getByRole("button", { name: /Sign out and sign in as ada@acme.test/ }));
    expect(state.auth.logout).toHaveBeenCalled(); expect(await screen.findByText("Login destination")).toBeInTheDocument();
    expect(takePendingInvitation()).toBe(SECRET);
  });

  it("Login resumes a parked invitation before onboarding, so an existing account with no workspace is not diverted", async () => {
    savePendingInvitation(SECRET);
    state.auth = { ...state.auth, user: { id: "u1", role: "executive", email: "ada@acme.test" }, workspaces: [], login: vi.fn() };
    render(<MemoryRouter initialEntries={["/"]}><Routes><Route path="/" element={<Login />} /><Route path="/activate-account" element={<div>Activation destination</div>} /><Route path="/onboarding/workspace" element={<div>Onboarding destination</div>} /></Routes></MemoryRouter>);
    expect(await screen.findByText("Activation destination")).toBeInTheDocument();
    expect(consumeAuthReturnPath()).toBeNull();
  });
});

describe("owner claim", () => {
  const owner = (extra = {}) => ok({ ownership: true, purpose: "owner_claim", workspaceRole: "owner", unitNames: [], ...extra });

  it("requires an explicit acceptance before the account can be created, and sends it", async () => {
    owner(); const u = userEvent.setup(); mount("/claim-ownership");
    expect(await screen.findByText("Accept ownership of Acme Ltd")).toBeInTheDocument();
    expect(screen.getByText("You have been nominated as the Owner of this workspace.")).toBeInTheDocument();
    await fill(u, "New password", "Chosen1pass"); await fill(u, "Confirm password", "Chosen1pass");
    const button = screen.getByRole("button", { name: "Accept ownership & continue" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    await u.click(screen.getByRole("checkbox", { name: /I accept ownership of Acme Ltd/ }));
    expect(button.disabled).toBe(false);
    state.activate.mockResolvedValue({ status: "success", token: "jwt", data: { workspaces: [], companyId: "c1", role: "owner" } });
    await u.click(button);
    await screen.findByText("Dashboard destination");
    expect(state.activate).toHaveBeenCalledWith(expect.objectContaining({ ownership: true, token: SECRET }));
  });

  it("an existing account must be the matching signed-in account and must tick the acceptance", async () => {
    owner({ existingAccount: true }); state.auth.user = { id: "u1", email: "ada@acme.test" }; const u = userEvent.setup(); mount("/claim-ownership");
    const accept = await screen.findByRole("button", { name: "Accept ownership & continue" }) as HTMLButtonElement;
    expect(accept.disabled).toBe(true);
    await u.click(screen.getByRole("checkbox", { name: /I accept ownership/ }));
    state.accept.mockResolvedValue({ status: "success", data: { workspaces: [], companyId: "c1", role: "owner" } });
    await u.click(accept);
    await screen.findByText("Dashboard destination");
    expect(state.accept).toHaveBeenCalledWith(SECRET, true);
  });
});
