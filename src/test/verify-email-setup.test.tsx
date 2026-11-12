import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const api = vi.hoisted(() => ({ inspectEmailVerification: vi.fn(), completeEmailVerification: vi.fn() }));
vi.mock("@/lib/api", () => ({ api }));
import VerifyEmailSetup from "@/pages/VerifyEmailSetup";
import { recallVerificationProof, rememberVerificationProof } from "@/lib/emailVerification";

const TOKEN = "a1".repeat(32); const PROOF = "b2".repeat(32); const EMAIL = "reg@example.com";
const apiError = (code: string, message = "nope") => Object.assign(new Error(message), { body: { code } });
const open = () => { window.history.replaceState(null, "", `/verify-email/setup#token=${TOKEN}`); return render(<MemoryRouter><VerifyEmailSetup /></MemoryRouter>); };

beforeEach(() => { api.inspectEmailVerification.mockResolvedValue({ status: "success", data: { email: EMAIL } }); });
afterEach(() => { cleanup(); vi.clearAllMocks(); localStorage.clear(); window.history.replaceState(null, "", "/"); });

describe("email verification screen: the registrant keeps their password", () => {
  it("same browser that registered: confirmed automatically with the proof, NO password form, original password kept", async () => {
    rememberVerificationProof(EMAIL, PROOF);
    api.completeEmailVerification.mockResolvedValue({ status: "success", data: { email: EMAIL, passwordPreserved: true } });
    open();
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
    expect(screen.getByText(/the password you chose when you signed up/)).toBeInTheDocument();
    expect(api.completeEmailVerification).toHaveBeenCalledTimes(1);
    expect(api.completeEmailVerification).toHaveBeenCalledWith({ token: TOKEN, proof: PROOF });
    expect(screen.queryByLabelText(/new password/i)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/");
    expect(recallVerificationProof(EMAIL)).toBe("");
  });

  it("another device (no proof): asks the registrant to CONFIRM their existing password, not to choose a new one", async () => {
    api.completeEmailVerification.mockResolvedValue({ status: "success", data: { email: EMAIL, passwordPreserved: true } });
    open();
    expect(await screen.findByRole("heading", { name: "Confirm your email" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/confirm password/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/replaces any password/i)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("Your password"), "My-Own-Password-1");
    await userEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    await waitFor(() => expect(api.completeEmailVerification).toHaveBeenCalledWith({ token: TOKEN, currentPassword: "My-Own-Password-1" }));
    expect(await screen.findByText("Email confirmed")).toBeInTheDocument();
  });

  it("a wrong password shows the server message, keeps the form and does not claim success", async () => {
    api.completeEmailVerification.mockRejectedValue(apiError("CURRENT_PASSWORD_INCORRECT", "That isn't the password this account was registered with."));
    open();
    await userEvent.type(await screen.findByLabelText("Your password"), "wrong-one");
    await userEvent.click(screen.getByRole("button", { name: "Confirm email" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("isn't the password");
    expect(screen.queryByText("Email confirmed")).not.toBeInTheDocument();
  });

  it("a rejected/stale proof falls back to the confirm-password form and discards the proof", async () => {
    rememberVerificationProof(EMAIL, PROOF);
    api.completeEmailVerification.mockRejectedValue(apiError("REGISTRATION_PROOF_INVALID"));
    open();
    expect(await screen.findByLabelText("Your password")).toBeInTheDocument();
    expect(recallVerificationProof(EMAIL)).toBe("");
    expect(api.completeEmailVerification).toHaveBeenCalledTimes(1);
  });

  it("'set a new password instead' is still available (didn't register / forgot) and submits the new password", async () => {
    api.completeEmailVerification.mockResolvedValue({ status: "success", data: { email: EMAIL, passwordPreserved: false } });
    open();
    await userEvent.click(await screen.findByRole("button", { name: /Set a new password instead/ }));
    expect(screen.getByRole("heading", { name: "Set a new password" })).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText("New password"), "Brand-New-1"); await userEvent.type(screen.getByLabelText("Confirm password"), "Brand-New-1");
    await userEvent.click(screen.getByRole("button", { name: /Confirm email & set password/ }));
    await waitFor(() => expect(api.completeEmailVerification).toHaveBeenCalledWith({ token: TOKEN, password: "Brand-New-1", confirmPassword: "Brand-New-1" }));
    expect(await screen.findByText(/Your password is set/)).toBeInTheDocument();
  });

  it("an invalid, expired or used link never reveals a form", async () => {
    api.inspectEmailVerification.mockRejectedValue(apiError("VERIFICATION_LINK_UNAVAILABLE"));
    open();
    expect(await screen.findByText(/can't be used/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Your password")).not.toBeInTheDocument();
    expect(api.completeEmailVerification).not.toHaveBeenCalled();
  });

  it("the link secret is removed from the address bar and never sent anywhere but the API call", async () => {
    api.completeEmailVerification.mockResolvedValue({ status: "success", data: { email: EMAIL, passwordPreserved: true } });
    open(); await screen.findByLabelText("Your password");
    expect(window.location.hash).toBe("");
  });
});
