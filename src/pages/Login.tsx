import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";
import { api } from "@/lib/api";

const Login = () => {
  const navigate = useNavigate();
  const { login, user, activeCompanyId, setActiveCompanyId, workspaces } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (!user) return;
    const ws = Array.isArray(workspaces) ? workspaces : [];
    if (ws.length === 0) {
      navigate("/onboarding/workspace");
      return;
    }
    const validIds = ws.map((w: any) => w.id);
    if (!activeCompanyId || (validIds.length > 0 && !validIds.includes(activeCompanyId))) {
      const resolved = ws[0]?.id;
      if (resolved) {
        setActiveCompanyId(resolved);
        window.location.reload();
        return;
      }
    }
    navigate("/dashboard");
  }, [user, workspaces, activeCompanyId, setActiveCompanyId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);
      toast({
        title: "Welcome back!",
        description: "Signing you in...",
      });
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Login failed. Try again.";

      if (errorMessage.toLowerCase().includes("verify")) {
        toast({
          title: "Email Not Verified",
          description: (
            <span>
              Please check your inbox. <br />
              <button
                onClick={async () => {
                  try {
                    await api.resendVerificationEmail(formData.email);
                    toast({
                      title: "Verification Sent!",
                      description: "A new verification email has been sent to your inbox.",
                    });
                  } catch (err: any) {
                    toast({
                      title: "Failed to resend email",
                      description: err.message,
                      variant: "destructive",
                    });
                  }
                }}
                className="underline text-primary font-semibold mt-2"
              >
                Resend verification email
              </button>
            </span>
          ),
          variant: "destructive",
        });
        setLoading(false);
        return;
      } else {
        toast({
          title: "Login failed",
          description: errorMessage || "Incorrect credentials",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* LEFT SIDE - Hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-center px-12 xl:px-20 py-12 bg-primary/[0.03]">
        <div className="mb-16 animate-fade-in">
          <Logo className="h-8" />
        </div>

        <div className="max-w-md animate-fade-in" style={{ animationDelay: "100ms" }}>
          <h2 className="text-4xl font-bold text-foreground mb-4 tracking-tight">
            Welcome to Admiino
          </h2>
          <p className="text-muted-foreground text-lg mb-14 leading-relaxed">
            The intelligent platform built for executives and their teams—
            enabling seamless task delegation, workflow automation, and
            team collaboration.
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
            <h2 className="text-2xl font-bold mb-1 tracking-tight">Sign in</h2>
            <p className="text-muted-foreground text-sm mb-8">
              Enter your credentials to continue
            </p>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Email</Label>
                <Input
                  type="email"
                  placeholder="you@business.com"
                  className="h-10 transition-all duration-200 focus:shadow-soft"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
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
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
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

              <div className="flex justify-end">
                <Link
                  to="/forgot-password"
                  className="text-xs text-primary hover:underline transition-colors duration-150"
                >
                  Forgot password?
                </Link>
              </div>

              <Button className="w-full h-10 gap-2 group" disabled={loading}>
                {loading ? "Signing in..." : "Sign in"}
                {!loading && <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />}
              </Button>
            </form>

            <div className="mt-10 space-y-6">
              <Divider text="New to Admiino?" />

              <Button variant="outline" className="w-full h-10" asChild>
                <Link to="/signup">Create your account</Link>
              </Button>
              <div className="text-xs text-center">
                <Link to="/signup-executive" className="text-muted-foreground hover:text-foreground underline transition-colors duration-150">
                  Legacy signup options
                </Link>
              </div>
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

export default Login;
