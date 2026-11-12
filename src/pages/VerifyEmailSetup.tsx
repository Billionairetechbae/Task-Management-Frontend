import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { api } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import { forgetVerificationProof, recallVerificationProof, takeVerificationToken, verificationPasswordProblem, VERIFY_MIN_PASSWORD } from "@/lib/emailVerification";

type Phase = "loading" | "invalid" | "confirming" | "ready" | "done";
type Mode = "confirm" | "reset";

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card className="w-full max-w-md shadow-xl">
      <div className="flex justify-center pt-6"><Logo /></div>
      {children}
    </Card>
  </div>
);

/**
 * Route: /verify-email/setup#token=...
 * Opening the emailed link only lands here; nothing changes until this screen completes. The link proves the MAILBOX, not who chose the
 * password, so a password typed by whoever first registered an address can never silently become the account's credential:
 *   1. same browser that registered  -> confirmed automatically with the signup proof; the password they chose is kept (no form).
 *   2. anywhere else                 -> "confirm your password": the registrant knows the one they chose; nobody else does.
 *   3. "I don't remember it / not me" -> set a NEW password (the original behaviour).
 */
const VerifyEmailSetup = () => {
  const tokenRef = useRef<string>("");
  if (tokenRef.current === "" && typeof window !== "undefined") tokenRef.current = takeVerificationToken();
  const [phase, setPhase] = useState<Phase>(tokenRef.current ? "loading" : "invalid");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [mode, setMode] = useState<Mode>("confirm");
  const [current, setCurrent] = useState("");
  const [preserved, setPreserved] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const autoStarted = useRef(false);

  useEffect(() => { document.title = "Confirm your email – Admiino"; }, []);
  useEffect(() => {
    if (!tokenRef.current) return;
    let cancelled = false;
    api.inspectEmailVerification(tokenRef.current)
      .then(async (res) => {
        if (cancelled) return;
        const address = res.data.email; setEmail(address);
        const proof = recallVerificationProof(address);
        if (!proof || autoStarted.current) { setPhase("ready"); return; }
        autoStarted.current = true; setPhase("confirming");
        try {
          const done = await api.completeEmailVerification({ token: tokenRef.current, proof });
          forgetVerificationProof(address); tokenRef.current = ""; setPreserved(!!done.data.passwordPreserved); setPhase("done");
        } catch (err) {
          const code = (err as ApiError)?.body?.code as string | undefined;
          if (code === "VERIFICATION_LINK_UNAVAILABLE") setPhase("invalid");
          else { if (code === "REGISTRATION_PROOF_INVALID") forgetVerificationProof(address); setPhase("ready"); }
        }
      })
      .catch(() => { if (!cancelled) setPhase("invalid"); });
    return () => { cancelled = true; };
  }, []);

  if (phase === "loading") return <Shell><CardContent className="py-10 text-center text-sm text-muted-foreground" role="status">Checking your link…</CardContent></Shell>;

  if (phase === "confirming") return <Shell><CardContent className="py-10 text-center text-sm text-muted-foreground" role="status">Confirming your email…</CardContent></Shell>;

  if (phase === "invalid") return (
    <Shell>
      <CardHeader className="text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
        <CardTitle>This confirmation link can't be used</CardTitle>
        <CardDescription>It may have expired, been replaced by a newer email, or already been used. Nothing has been changed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ul className="list-disc pl-5 text-muted-foreground">
          <li>If you already confirmed your email, sign in with the password you chose.</li>
          <li>If you can't remember it, use “Forgot password” on the sign-in page.</li>
          <li>Otherwise sign up again or request a new confirmation email from the sign-in page, and use only the newest email.</li>
        </ul>
        <Button asChild className="w-full"><Link to="/">Go to sign in</Link></Button>
      </CardContent>
    </Shell>
  );

  if (phase === "done") return (
    <Shell>
      <CardHeader className="text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" aria-hidden />
        <CardTitle>Email confirmed</CardTitle>
        <CardDescription>{preserved ? <>Your email address is confirmed. Sign in with {email} and the password you chose when you signed up.</> : <>Your password is set. Sign in with {email} and the password you just chose.</>}</CardDescription>
      </CardHeader>
      <CardContent><Button asChild className="w-full"><Link to="/">Sign in</Link></Button></CardContent>
    </Shell>
  );

  const problem = password ? verificationPasswordProblem(password) : null;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = mode === "confirm" ? current.length > 0 && !busy : !verificationPasswordProblem(password) && password === confirm && !busy;
  const fail = (err: unknown, fallback: string) => {
    const code = (err as ApiError)?.body?.code as string | undefined;
    if (code === "VERIFICATION_LINK_UNAVAILABLE") setPhase("invalid");
    else setError(err instanceof Error && err.message ? err.message : fallback);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const done = mode === "confirm"
        ? await api.completeEmailVerification({ token: tokenRef.current, currentPassword: current })
        : await api.completeEmailVerification({ token: tokenRef.current, password, confirmPassword: confirm });
      forgetVerificationProof(email); tokenRef.current = ""; setPassword(""); setConfirm(""); setCurrent(""); setPreserved(!!done.data.passwordPreserved); setPhase("done");
    } catch (err) { fail(err, "We couldn't confirm your email. Please try again."); }
    finally { submitting.current = false; setBusy(false); }
  };
  const switchMode = (next: Mode) => { setMode(next); setError(null); };

  const emailField = (
    <div className="space-y-1.5">
      <Label htmlFor="ve-email" className="flex items-center gap-1.5">Email address <Lock className="h-3.5 w-3.5" aria-hidden /></Label>
      <Input id="ve-email" type="email" value={email} readOnly aria-readonly="true" tabIndex={-1} className="cursor-not-allowed bg-muted text-muted-foreground" />
      <p className="text-xs text-muted-foreground">This is the address your confirmation email was sent to. It can't be changed here.</p>
    </div>
  );
  const toggle = (
    <button type="button" className="mx-auto block text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground" aria-label={show ? "Hide passwords" : "Show passwords"} aria-pressed={show} onClick={() => setShow((v) => !v)}>
      {show ? <><EyeOff className="mr-1 inline h-3.5 w-3.5" aria-hidden />Hide password</> : <><Eye className="mr-1 inline h-3.5 w-3.5" aria-hidden />Show password</>}
    </button>
  );

  if (mode === "confirm") return (
    <Shell>
      <CardHeader className="text-center"><CardTitle>Confirm your email</CardTitle><CardDescription>Enter the password you chose when you signed up to finish confirming {email || "your email"}.</CardDescription></CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit} noValidate>
          {emailField}
          <div className="space-y-1.5">
            <Label htmlFor="ve-current">Your password</Label>
            <Input id="ve-current" type={show ? "text" : "password"} autoComplete="current-password" value={current} autoFocus onChange={(e) => setCurrent(e.target.value)} />
            <p className="text-xs text-muted-foreground">Nothing changes: this is the password you already set. We only check it.</p>
          </div>
          {toggle}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!canSubmit}>{busy ? "Working…" : "Confirm email"}</Button>
        </form>
        <div className="mt-4 border-t pt-4 text-center text-xs text-muted-foreground">
          Don't remember it, or didn't create this account?{" "}
          <button type="button" className="font-medium text-foreground underline underline-offset-2" onClick={() => switchMode("reset")}>Set a new password instead</button>
        </div>
      </CardContent>
    </Shell>
  );

  return (
    <Shell>
      <CardHeader className="text-center"><CardTitle>Set a new password</CardTitle><CardDescription>Choose the password you will use to sign in to Admiino. It replaces any password entered during sign-up.</CardDescription></CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit} noValidate>
          {emailField}
          <div className="space-y-1.5">
            <Label htmlFor="ve-password">New password</Label>
            <Input id="ve-password" type={show ? "text" : "password"} autoComplete="new-password" value={password} aria-describedby="ve-rules" aria-invalid={!!problem} onChange={(e) => setPassword(e.target.value)} />
            <p id="ve-rules" className={`text-xs ${problem ? "text-destructive" : "text-muted-foreground"}`}>{problem || `At least ${VERIFY_MIN_PASSWORD} characters.`}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ve-confirm">Confirm password</Label>
            <Input id="ve-confirm" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} aria-invalid={mismatch} onChange={(e) => setConfirm(e.target.value)} />
            {mismatch && <p role="alert" className="text-xs text-destructive">The passwords don't match.</p>}
          </div>
          {toggle}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!canSubmit}>{busy ? "Working…" : "Confirm email & set password"}</Button>
        </form>
        <div className="mt-4 border-t pt-4 text-center text-xs text-muted-foreground">
          <button type="button" className="font-medium text-foreground underline underline-offset-2" onClick={() => switchMode("confirm")}>I remember my password</button>
        </div>
      </CardContent>
    </Shell>
  );
};

export default VerifyEmailSetup;
