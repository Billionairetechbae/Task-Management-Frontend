import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "@/lib/api";
import { clearWhatsAppConnectChallenge, preserveWhatsAppConnectChallenge } from "@/lib/whatsappConnectJourney";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from "@/components/Logo";

type ViewState = "loading" | "auth-required" | "signup" | "confirm" | "verify" | "invalid" | "done";

export default function WhatsAppConnect() {
  const [query] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading, logout } = useAuth();
  const token = query.get("t") || "";
  const [purpose, setPurpose] = useState<"login" | "signup" | null>(null);
  const [challengeValid, setChallengeValid] = useState(false);
  const [state, setState] = useState<ViewState>("loading");
  const [error, setError] = useState("");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });

  useEffect(() => {
    let active = true;
    setState("loading");
    setChallengeValid(false);
    api.validateWhatsAppChallenge(token).then((response: any) => {
      if (!active) return;
      setPurpose(response.data.purpose);
      setChallengeValid(true);
    }).catch(() => active && setState("invalid"));
    return () => { active = false; };
  }, [token]);

  useEffect(() => {
    if (!challengeValid || authLoading) return;
    if (user) setState("confirm");
    else setState(purpose === "signup" ? "signup" : "auth-required");
  }, [challengeValid, authLoading, purpose, user]);

  const signIn = () => {
    if (!preserveWhatsAppConnectChallenge(token)) return setState("invalid");
    navigate("/?continue=whatsapp-connect");
  };

  const submitSignup = async (event: React.FormEvent) => {
    event.preventDefault(); setError("");
    try {
      await api.signupUser(form);
      preserveWhatsAppConnectChallenge(token);
      setState("verify");
    } catch (caught: any) {
      setError(caught.message || "We couldn't create that account.");
    }
  };

  const connect = async () => {
    setError("");
    try {
      await api.completeWhatsAppConnection(token, true);
      clearWhatsAppConnectChallenge();
      setState("done");
    } catch (caught: any) {
      const status = caught?.statusCode ?? caught?.status;
      if (status === 401) {
        preserveWhatsAppConnectChallenge(token);
        logout();
        setState("auth-required");
        setError("Your session has expired. Please sign in again.");
      } else if (status === 400) setState("invalid");
      else setError(caught.message || "Connection failed");
    }
  };

  const cancel = async () => {
    clearWhatsAppConnectChallenge();
    await api.cancelWhatsAppConnection(token).catch(() => {});
    navigate("/");
  };
  const maskedEmail = user?.email?.replace(/^(.{2}).*(@.*)$/, "$1***$2");

  return <main className="min-h-screen bg-background flex items-center justify-center p-4"><section className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-lg"><Logo className="h-8 mb-6" />
    {state === "loading" && <p>Checking secure connection…</p>}
    {state === "invalid" && <><h1 className="text-xl font-bold">Link unavailable</h1><p className="text-muted-foreground mt-2">This WhatsApp connection link has expired or is no longer available. Return to WhatsApp and request a new connection link.</p></>}
    {state === "auth-required" && <div className="space-y-4"><h1 className="text-2xl font-bold">Sign in to connect WhatsApp</h1><p className="text-muted-foreground">You need to sign in to your Admiino account before connecting WhatsApp.</p>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" onClick={signIn}>Sign in</Button><Button variant="ghost" className="w-full" onClick={cancel}>Cancel</Button></div>}
    {state === "signup" && <form onSubmit={submitSignup} className="space-y-4"><h1 className="text-2xl font-bold">Create your Admiino account</h1><Label>First name</Label><Input value={form.firstName} onChange={event => setForm({ ...form, firstName: event.target.value })} required /><Label>Last name</Label><Input value={form.lastName} onChange={event => setForm({ ...form, lastName: event.target.value })} required /><Label>Email</Label><Input type="email" value={form.email} onChange={event => setForm({ ...form, email: event.target.value })} required /><Label>Password</Label><Input type="password" value={form.password} onChange={event => setForm({ ...form, password: event.target.value })} required />{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full">Continue securely</Button><Button type="button" variant="ghost" className="w-full" onClick={cancel}>Cancel</Button></form>}
    {state === "confirm" && user && <div className="space-y-4"><h1 className="text-2xl font-bold">Connect WhatsApp to Admiino?</h1><p>WhatsApp: ••••</p><p>Admiino account: {user.firstName || "Authenticated user"}</p><p className="text-sm text-muted-foreground">{maskedEmail}</p>{error && <p className="text-sm text-destructive">{error}</p>}<Button className="w-full" onClick={connect}>Connect account</Button><Button variant="outline" className="w-full" onClick={cancel}>Cancel</Button></div>}
    {state === "verify" && <><h1 className="text-xl font-bold">Verify your email</h1><p className="mt-2 text-muted-foreground">Your account was created. Verify your email, then sign in to finish connecting WhatsApp.</p><Button className="w-full mt-5" onClick={signIn}>I've verified my email — sign in</Button></>}
    {state === "done" && <><h1 className="text-2xl font-bold">WhatsApp connected ✅</h1><p className="mt-2 text-muted-foreground">You can return to WhatsApp or continue to Admiino.</p><Button className="w-full mt-5" onClick={() => navigate("/dashboard")}>Continue to Admiino</Button></>}
  </section></main>;
}
