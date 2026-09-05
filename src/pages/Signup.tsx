import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, ArrowRight, MailCheck, RefreshCw, AlertCircle } from "lucide-react";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { Checkbox } from "@/components/ui/checkbox";
import LegalLinks, { TERMS_URL, PRIVACY_URL } from "@/components/LegalLinks";

const Signup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("You must agree to the Terms and Privacy Policy to create an account.");
      return;
    }
    if (form.password.length < 8) {
      setError("Your password must be at least 8 characters long.");
      return;
    }
    setLoading(true);
    try {
      await api.signupUser(form);
      setSubmitted(true);
    } catch (err: any) {
      const statusCode = err?.statusCode ?? err?.status;
      const message =
        statusCode === 429
          ? "Too many attempts. Please wait a moment and try again."
          : statusCode === 409
          ? "An account with this email already exists. Try signing in instead."
          : err?.message || "We couldn't create your account. Please try again.";
      setError(message);
      toast({
        title: "Signup failed",
        description: message,
        variant: "destructive" as any,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    try {
      await api.resendVerificationEmail(form.email);
      setResent(true);
      toast({ title: "Verification email sent", description: `We sent a new link to ${form.email}.` });
    } catch (err: any) {
      toast({
        title: "Couldn't resend",
        description: err?.message || "Please try again in a moment.",
        variant: "destructive" as any,
      });
    } finally {
      setResending(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="mb-8 flex justify-center">
            <Logo className="h-8" />
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-8 shadow-soft">
            <div className="relative mx-auto mb-6 h-20 w-20">
              <span className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 animate-scale-in">
                <MailCheck className="h-9 w-9 text-primary" />
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight mb-2">Account created</h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              We sent a verification link to{" "}
              <span className="font-medium text-foreground break-all">{form.email}</span>. Open it to
              activate your account, then sign in.
            </p>

            <div className="mt-6 rounded-lg border border-border/60 bg-muted/30 p-3 text-left text-xs text-muted-foreground leading-relaxed">
              Didn&apos;t get it? Check your spam folder, or resend the link below. Links expire after
              a short while.
            </div>

            <div className="mt-6 space-y-3">
              <Button className="w-full h-10 gap-2 group" onClick={() => navigate("/")}>
                Go to Login
                <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
              </Button>
              <Button
                variant="outline"
                className="w-full h-10 gap-2"
                onClick={handleResend}
                disabled={resending || resent}
              >
                {resent ? (
                  <>
                    <Check className="w-4 h-4" /> Verification email sent
                  </>
                ) : (
                  <>
                    <RefreshCw className={`w-4 h-4 ${resending ? "animate-spin" : ""}`} />
                    {resending ? "Sending..." : "Resend verification email"}
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-8">
            <LegalLinks />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* LEFT SIDE - Hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-center px-12 xl:px-20 py-12 bg-primary/[0.03]">
        <div className="mb-16 animate-fade-in">
          <Logo className="h-8" />
        </div>

        <div className="max-w-md animate-fade-in" style={{ animationDelay: "100ms" }}>
          <h2 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
            Create your Admiino account
          </h2>
          <p className="text-muted-foreground text-lg mb-14 leading-relaxed">
            Join thousands of executives and teams using Admiino to streamline
            task delegation, automate workflows, and collaborate seamlessly.
          </p>

          <div className="space-y-8">
            <Feature
              title="Smart Task Delegation"
              description="Assign tasks effortlessly and track progress across your team."
              delay={200}
            />
            <Feature
              title="AI-Assisted Workflow"
              description="Let AI help you optimize workloads and automate repetitive tasks."
              delay={300}
            />
            <Feature
              title="Centralized Team Management"
              description="Oversee your team, manage access, and streamline operations."
              delay={400}
            />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="flex items-center justify-center px-6 sm:px-8 py-12 min-h-screen lg:min-h-0">
        <div className="w-full max-w-sm animate-fade-in">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-10 flex justify-center">
            <Logo className="h-9" />
          </div>

          <div>
            <h2 className="text-2xl font-bold mb-1 tracking-tight">Sign up</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Enter your details to create your account
            </p>

            {error && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive animate-fade-in"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form className="space-y-5" onSubmit={onSubmit}>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">First name</Label>
                  <Input
                    type="text"
                    placeholder="John"
                    className="h-10 transition-all duration-200 focus:shadow-soft"
                    value={form.firstName}
                    onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Last name</Label>
                  <Input
                    type="text"
                    placeholder="Doe"
                    className="h-10 transition-all duration-200 focus:shadow-soft"
                    value={form.lastName}
                    onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="you@business.com"
                  className="h-10 transition-all duration-200 focus:shadow-soft"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Password</Label>
                <div className="relative">
                  <Input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-10 pr-10 transition-all duration-200 focus:shadow-soft"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors duration-150"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border/70 bg-muted/30 p-3">
                <Checkbox
                  id="consent"
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="consent" className="text-xs leading-relaxed font-normal text-muted-foreground cursor-pointer">
                  I agree to Admiino&apos;s{" "}
                  <a href={TERMS_URL} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="text-foreground underline">
                    Privacy Policy
                  </a>
                  .
                </Label>
              </div>

              <Button className="w-full h-10 gap-2 group" type="submit" disabled={loading || !consent}>
                {loading ? "Creating..." : "Create account"}
                {!loading && <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-3 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <GoogleAuthButton disabled={!consent} />
            </form>

            <div className="mt-10 space-y-6">
              <Divider text="Already have an account?" />

              <Button variant="outline" className="w-full h-10" asChild>
                <Link to="/">Sign in instead</Link>
              </Button>
              <LegalLinks className="pt-2" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Feature = ({
  title,
  description,
  delay = 0,
}: {
  title: string;
  description: string;
  delay?: number;
}) => (
  <div className="flex gap-4 animate-fade-in" style={{ animationDelay: `${delay}ms` }}>
    <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow-soft">
      <Check className="w-5 h-5 text-primary-foreground" />
    </div>
    <div>
      <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
      <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
    </div>
  </div>
);

const Divider = ({ text }: { text: string }) => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-background px-3 text-muted-foreground">{text}</span>
    </div>
  </div>
);

export default Signup;
