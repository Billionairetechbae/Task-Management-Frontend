import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const Login = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });

  // Redirect based on role
  useEffect(() => {
    if (user) {
      const route =
        user.role === "executive"
          ? "/dashboard-executive"
          : user.role === "manager"
          ? "/dashboard-manager"
          : user.role === "assistant"
          ? "/dashboard-assistant"
          : "/dashboard-admin";
      navigate(route);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);

      toast({
        title: "Welcome back!",
        description: "Signing you in...",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Check your credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* LEFT SIDE INFO */}
      <div className="flex flex-col justify-center px-8 lg:px-16 py-12">
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
            assistant collaboration.
          </p>

          <div className="space-y-6">
            {/* Feature */}
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
      <div className="flex items-center justify-center px-8 py-12 bg-card">
        <div className="w-full max-w-md">
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
              <div>
                <Label>Password</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  className="mt-2"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                />
              </div>

              <Button className="w-full h-12" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* SIGNUP SECTION */}
            <div className="mt-10 space-y-6">
              <Divider text="New to Admiino?" />

              {/* Executive Create Company */}
              <Button className="w-full h-12 font-semibold" asChild>
                <Link to="/signup-executive">
                  Register Your Company (Executive)
                </Link>
              </Button>

              {/* Join Existing Company */}
              {/* <div className="text-center text-muted-foreground text-sm mt-2">
                Are you an assistant or manager?
              </div>

              <Button variant="outline" className="w-full h-12" asChild>
                <Link to="/signup-executive-join">
                  Join Your Company with a Company Code
                </Link>
              </Button> */}

              {/* Additional role signups hidden but linked subtly */}
              {/* <p className="text-center text-muted-foreground text-xs mt-4">
                Team members (Assistants & Managers) must join using a{" "}
                <strong>Company Code</strong> provided by your executive.
              </p> */}
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
