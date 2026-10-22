import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Eye, EyeOff, Lock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import type { ApiError } from "@/lib/api";
import { checkPassword, clearPendingInvitation, passwordProblem, roleLabel, savePendingInvitation, takeInvitationToken } from "@/lib/orgActivation";
import type { OrgInvitationInfo } from "@/lib/orgActivation";

type Phase = "loading" | "invalid" | "ready" | "done";

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
    <Card className="w-full max-w-md shadow-xl">
      <div className="flex justify-center pt-6"><Logo /></div>
      {children}
    </Card>
  </div>
);

const Requirement = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => (
  <li className={ok ? "text-emerald-700" : "text-muted-foreground"}><span aria-hidden="true">{ok ? "✓" : "•"}</span> {children}<span className="sr-only">{ok ? " (met)" : " (not met yet)"}</span></li>
);

const codeOf = (error: unknown) => ((error as ApiError)?.body?.code as string | undefined) || undefined;

/**
 * One flow for the three invitation kinds, decided by the server from the secret:
 *  - new employee: set own password, confirm name; the email is shown read-only and is never sent as a credential;
 *  - existing Admiino account: sign in first (the server requires the signed-in email to equal the invited email), nothing about the account changes;
 *  - owner claim: same two paths plus an explicit "I accept ownership" confirmation.
 */
export const OrgInvitationFlow = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, refreshUser, setActiveCompanyId, logout } = useAuth();
  const tokenRef = useRef<string>("");
  if (tokenRef.current === "" && typeof window !== "undefined") tokenRef.current = takeInvitationToken();
  const [phase, setPhase] = useState<Phase>(tokenRef.current ? "loading" : "invalid");
  const [info, setInfo] = useState<OrgInvitationInfo | null>(null);
  const [form, setForm] = useState({ firstName: "", lastName: "", password: "", confirm: "" });
  const [accepted, setAccepted] = useState(false);
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const submitting = useRef(false);

  useEffect(() => { document.title = "Activate your Admiino account"; }, []);
  useEffect(() => {
    if (!tokenRef.current) return;
    let cancelled = false;
    api.inspectOrgInvitation(tokenRef.current).then((res) => {
      if (cancelled) return;
      const inv = res.data.invitation;
      setInfo(inv); setForm((f) => ({ ...f, firstName: inv.firstName || "", lastName: inv.lastName || "" })); setNeedsLogin(inv.existingAccount); setPhase("ready");
    }).catch(() => { if (!cancelled) setPhase("invalid"); });
    return () => { cancelled = true; };
  }, []);

  const finish = async (companyId: string) => {
    clearPendingInvitation();
    tokenRef.current = "";
    setForm({ firstName: "", lastName: "", password: "", confirm: "" });
    await refreshUser();
    setActiveCompanyId(companyId);
    try { localStorage.setItem("activeCompanyId", companyId); } catch { /* ignore */ }
    setPhase("done");
    navigate("/dashboard", { replace: true });
  };

  const fail = (e: unknown, fallback: string) => {
    const code = codeOf(e);
    if (code === "LOGIN_REQUIRED") { setNeedsLogin(true); setInfo((i) => (i ? { ...i, existingAccount: true } : i)); return; }
    if (code === "ACCOUNT_RECOVERY_REQUIRED") { setInfo((i) => (i ? { ...i, recoveryRequired: true } : i)); return; }
    if (code === "INVITATION_UNAVAILABLE") { setPhase("invalid"); return; }
    const message = e instanceof Error && e.message ? e.message : fallback;
    setError(message); toast({ title: "Could not continue", description: message, variant: "destructive" });
  };

  if (phase === "loading") return <Shell><CardContent className="py-10 text-center text-sm text-muted-foreground" role="status">Checking your invitation…</CardContent></Shell>;

  if (phase === "invalid" || !info) return (
    <Shell>
      <CardHeader className="text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-500" aria-hidden />
        <CardTitle>This invitation link can't be used</CardTitle>
        <CardDescription>It may have expired, been replaced by a newer email, been withdrawn, or already been used. Nothing has been changed.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <ul className="list-disc pl-5 text-muted-foreground">
          <li>If you already activated your account, sign in with your email and password.</li>
          <li>If you can't remember your password, use “Forgot password” on the sign-in page.</li>
          <li>Otherwise ask your organization's administrator to send you a new invitation, and use only the newest email.</li>
        </ul>
        <Button asChild className="w-full"><Link to="/">Go to sign in</Link></Button>
      </CardContent>
    </Shell>
  );

  const ownership = info.ownership;
  const heading = ownership ? `Accept ownership of ${info.organizationName}` : "Welcome to Admiino";
  const sub = ownership ? "You have been nominated as the Owner of this workspace." : `Your workspace at ${info.organizationName} is ready.`;
  const where = info.unitNames.length ? ` in ${info.unitNames.join(", ")}` : "";

  if (info.recoveryRequired) return (
    <Shell>
      <CardHeader className="text-center"><ShieldAlert className="mx-auto h-10 w-10 text-amber-500" aria-hidden /><CardTitle>We need to recover your account first</CardTitle>
        <CardDescription>An Admiino account already exists for {info.email} but it can't be used to accept this invitation yet. Use “Forgot password” to regain access, or ask your administrator for help. Your invitation stays valid until it expires.</CardDescription></CardHeader>
      <CardContent><Button asChild className="w-full"><Link to="/forgot-password">Reset my password</Link></Button></CardContent>
    </Shell>
  );

  // ---- existing Admiino account: sign in, then accept. No password is collected or changed here. ----
  if (needsLogin) {
    const signedIn = !!user;
    const sameAccount = signedIn && String(user!.email).trim().toLowerCase() === info.email;
    const accept = async () => {
      if (submitting.current) return; submitting.current = true; setBusy(true); setError(null);
      try { const res = await api.acceptOrgInvitation(tokenRef.current, ownership); await finish(res.data.companyId); }
      catch (e) { fail(e, "The invitation could not be accepted."); } finally { submitting.current = false; setBusy(false); }
    };
    const goSignIn = () => { savePendingInvitation(tokenRef.current); navigate("/", { state: { returnTo: ownership ? "/claim-ownership" : "/activate-account" } }); };
    return (
      <Shell>
        <CardHeader className="text-center"><CardTitle>{heading}</CardTitle><CardDescription>{sub}</CardDescription></CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{ownership ? "Owner" : roleLabel(info.workspaceRole)}{where}. This invitation was sent to <strong>{info.email}</strong>, which already has an Admiino account.</p>
          <p className="text-sm text-muted-foreground">Sign in with your existing password. Your password, profile and other workspaces stay exactly as they are.</p>
          {ownership && signedIn && sameAccount && <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />I accept ownership of {info.organizationName} and its responsibilities as workspace Owner.</label>}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {!signedIn && <Button className="w-full" onClick={goSignIn}>Sign in to continue</Button>}
          {signedIn && sameAccount && <Button className="w-full" disabled={busy || (ownership && !accepted)} onClick={accept}>{busy ? "Working…" : ownership ? "Accept ownership & continue" : "Accept & continue"}</Button>}
          {signedIn && !sameAccount && (
            <div className="space-y-3" role="alert">
              <p className="text-sm text-destructive">You're signed in as a different account. This invitation can only be accepted by the account for {info.email}.</p>
              <Button className="w-full" variant="outline" onClick={() => { logout(); savePendingInvitation(tokenRef.current); navigate("/", { state: { returnTo: ownership ? "/claim-ownership" : "/activate-account" } }); }}>Sign out and sign in as {info.email}</Button>
            </div>
          )}
        </CardContent>
      </Shell>
    );
  }

  // ---- brand-new account ----
  const check = checkPassword(form.password, info.email);
  const problem = form.password ? passwordProblem(form.password, info.email) : null;
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;
  const namesOk = form.firstName.trim().length > 0 && form.lastName.trim().length > 0;
  const canSubmit = namesOk && !passwordProblem(form.password, info.email) && form.password === form.confirm && (!ownership || accepted) && !busy;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || submitting.current) return;
    submitting.current = true; setBusy(true); setError(null);
    try {
      const res = await api.activateOrgAccount({ token: tokenRef.current, firstName: form.firstName.trim(), lastName: form.lastName.trim(), password: form.password, confirmPassword: form.confirm, ownership });
      await finish(res.data.companyId);
    } catch (err) { fail(err, "Your account could not be activated."); } finally { submitting.current = false; setBusy(false); }
  };

  return (
    <Shell>
      <CardHeader className="text-center"><CardTitle>{heading}</CardTitle><CardDescription>{sub}</CardDescription></CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">{ownership ? "Owner" : `You've been invited as ${roleLabel(info.workspaceRole)}${where}.`} Confirm your name and choose your own password.</p>
        <form className="space-y-4" onSubmit={submit} noValidate>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label htmlFor="oa-first">First name</Label><Input id="oa-first" autoComplete="given-name" value={form.firstName} maxLength={50} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
            <div className="space-y-1.5"><Label htmlFor="oa-last">Last name</Label><Input id="oa-last" autoComplete="family-name" value={form.lastName} maxLength={50} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oa-email" className="flex items-center gap-1.5">Email address <Lock className="h-3.5 w-3.5" aria-hidden /></Label>
            <Input id="oa-email" type="email" value={info.email} readOnly aria-readonly="true" tabIndex={-1} className="cursor-not-allowed bg-muted text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Provided by your organization. It can't be changed during activation.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oa-password">New password</Label>
            <div className="relative">
              <Input id="oa-password" type={show ? "text" : "password"} autoComplete="new-password" value={form.password} className="pr-10" aria-describedby="oa-rules" aria-invalid={!!problem} onChange={(e) => setForm({ ...form, password: e.target.value })} />
              <button type="button" className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground" aria-label={show ? "Hide passwords" : "Show passwords"} aria-pressed={show} onClick={() => setShow(!show)}>{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
            </div>
            <ul id="oa-rules" className="space-y-0.5 text-xs">
              <Requirement ok={check.length}>At least 8 characters</Requirement>
              <Requirement ok={check.letterAndNumber}>A letter and a number</Requirement>
              <Requirement ok={check.notEmailDerived}>Doesn't contain your email name</Requirement>
            </ul>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="oa-confirm">Confirm password</Label>
            <Input id="oa-confirm" type={show ? "text" : "password"} autoComplete="new-password" value={form.confirm} aria-invalid={mismatch} onChange={(e) => setForm({ ...form, confirm: e.target.value })} />
            {mismatch && <p role="alert" className="text-xs text-destructive">The passwords don't match.</p>}
          </div>
          {ownership && (
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />I accept ownership of {info.organizationName} and its responsibilities as workspace Owner.</label>
          )}
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="h-11 w-full" disabled={!canSubmit}>{busy ? "Activating…" : ownership ? "Accept ownership & continue" : "Activate Account & Continue"}</Button>
          {phase === "done" && <p role="status" className="flex items-center gap-2 text-sm text-emerald-700"><CheckCircle2 className="h-4 w-4" aria-hidden />Done</p>}
        </form>
      </CardContent>
    </Shell>
  );
};

export default OrgInvitationFlow;
