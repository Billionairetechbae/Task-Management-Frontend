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
import { takeVerificationToken, verificationPasswordProblem, VERIFY_MIN_PASSWORD } from "@/lib/emailVerification";

type Phase = "loading" | "invalid" | "ready" | "done";

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
 * Opening the emailed link only lands here. Nothing is verified and no password changes until the person submits a password they choose now,
 * so a password typed by whoever first registered the address can never become the account's credential.
 */
const VerifyEmailSetup = () => {
  const tokenRef = useRef<string>("");
  if (tokenRef.current === "" && typeof window !== "undefined") tokenRef.current = takeVerificationToken();
  const [phase, setPhase] = useState<Phase>(tokenRef.current ? "loading" : "invalid");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);

  useEffect(() => { document.title = "Confirm your email – Admiino"; }, []);
  useEffect(() => {
    if (!tokenRef.current) return;
    let cancelled = false;
    api.inspectEmailVerification(tokenRef.current)
      .then((res) => { if (!cancelled) { setEmail(res.data.email); setPhase("ready"); } })
      .catch(() => { if (!cancelled) setPhase("invalid"); });
    return () => { cancelled = true; };
  }, []);

  if (phase === "loading") return <Shell><CardContent className="py-10 text-center text-sm text-muted-foreground" role="status">Checking your link…</CardContent></Shell>;

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
        <CardDescription>Your password is set. Sign in with {email} and the password you just chose.</CardDescription>
      </CardHeader>
      <CardContent><Button asChild className="w-full"><Link to="/">Sign in</Link></Button></CardContent>
    </Shell>
  );

  const problem = password ? verificationPasswordProblem(password) : null;
  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = !verificationPasswordProblem(password) && password === confirm && !busy;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      await api.completeEmailVerification({ token: tokenRef.current, password, confirmPassword: confirm });
      tokenRef.current = ""; setPassword(""); setConfirm(""); setPhase("done");
    } catch (err) {
      const code = (err as ApiError)?.body?.code as string | undefined;
      if (code === "VERIFICATION_LINK_UNAVAILABLE") setPhase("invalid");
      else setError(err instanceof Error && err.message ? err.message : "We couldn't confirm your email. Please try again.");
    } finally { submitting.current = false; setBusy(false); }
  };

  return (
    <Shell>
      <CardHeader className="text-center"><CardTitle>Confirm your email</CardTitle><CardDescription>Choose the password you will use to sign in to Admiino.</CardDescription></CardHeader>
      <CardContent>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="space-y-1.5">
            <Label htmlFor="ve-email" className="flex items-center gap-1.5">Email address <Lock className="h-3.5 w-3.5" aria-hidden /></Label>
            <Input id="ve-email" type="email" value={email} readOnly aria-readonly="true" tabIndex={-1} className="cursor-not-allowed bg-muted text-muted-foreground" />
            <p className="text-xs text-muted-foreground">This is the address your confirmation email was sent to. It can't be changed here.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ve-password">New password</Label>
            <div className="relative">
              <Input id="ve-password" type={show ? "text" : "password"} autoComplete="new-password" value={password} className="pr-10" aria-describedby="ve-rules" aria-invalid={!!problem} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground" aria-label={show ? "Hide passwords" : "Show passwords"} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            <p id="ve-rules" className={`text-xs ${problem ? "text-destructive" : "text-muted-foreground"}`}>{problem || `At least ${VERIFY_MIN_PASSWORD} characters. Any password you typed when signing up is replaced by this one.`}</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ve-confirm">Confirm password</Label>
            <Input id="ve-confirm" type={show ? "text" : "password"} autoComplete="new-password" value={confirm} aria-invalid={mismatch} onChange={(e) => setConfirm(e.target.value)} />
            {mismatch && <p role="alert" className="text-xs text-destructive">The passwords don't match.</p>}
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!canSubmit}>{busy ? "Working…" : "Confirm email & set password"}</Button>
        </form>
      </CardContent>
    </Shell>
  );
};

export default VerifyEmailSetup;
