import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff } from "lucide-react";
import { Check } from "lucide-react";
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

      // Special handling for email not verified
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
      {/* LEFT SIDE INFO - Hidden on mobile */}
      <div className="hidden lg:flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="mb-12">
          <Logo className="h-8" />
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Welcome to Admiino
          </h2>
          <p className="text-muted-foreground text-lg mb-12">
            The intelligent platform built for executives and their teams—
            enabling seamless task delegation, workflow automation, and
            team_member collaboration.
          </p>

          <div className="space-y-6">
            <Feature
              title="Smart Task Delegation"
              description="Assign tasks effortlessly and track progress across your team."
            />
            <Feature
              title="AI-Assisted Workflow"
              description="Let AI help you optimize workloads and automate repetitive tasks."
            />
            <Feature
              title="Centralized Team Management"
              description="Oversee your team, manage access, and streamline operations."
            />
          </div>
        </div>
      </div>

      {/* RIGHT SIDE FORM */}
      <div className="flex items-center justify-center px-8 py-12 bg-card min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden mb-8 flex justify-center">
            <Logo className="h-10" />
          </div>
          
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h2 className="text-3xl font-bold mb-2">Sign In</h2>
            <p className="text-muted-foreground mb-8">
              Enter your account credentials
            </p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="you@business.com"
                  className="mt-2"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                />
              </div>

              {/* Password */}
              <div className="relative">
                <Label>Password</Label>

                <Input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="mt-0 pr-10"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-10 transform -translate-y-1/2 text-muted-foreground hover:text-primary"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>


              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline block text-right"
              >
                Forgot Password?
              </Link>


              <Button className="w-full h-12" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* SIGNUP SECTION */}
            <div className="mt-10 space-y-6">
              <Divider text="New to Admiino?" />

              <Button className="w-full h-12 font-semibold" asChild>
                <Link to="/signup">Create your account</Link>
              </Button>
              <div className="text-xs text-center">
                <Link to="/signup-executive" className="underline text-muted-foreground">Legacy signup options</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------------------------------------
 * SMALL SUBCOMPONENTS
 * --------------------------------------------*/

const Feature = ({
  title,
  description,
}: {
  title: string;
  description: string;
}) => (
  <div className="flex gap-4">
    <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
      <Check className="w-6 h-6 text-primary-foreground" />
    </div>
    <div>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  </div>
);

const Divider = ({ text }: { text: string }) => (
  <div className="relative">
    <div className="absolute inset-0 flex items-center">
      <span className="w-full border-t border-border" />
    </div>
    <div className="relative flex justify-center text-xs uppercase">
      <span className="bg-card px-2 text-muted-foreground">{text}</span>
    </div>
  </div>
);

export default Login;
