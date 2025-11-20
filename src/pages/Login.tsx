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
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  // Redirect logged-in users based on updated roles
  useEffect(() => {
    if (user) {
      const dashboardRoute =
        user.role === "executive"
          ? "/dashboard-executive"
          : user.role === "manager"
          ? "/dashboard-manager"
          : user.role === "assistant"
          ? "/dashboard-assistant"
          : "/dashboard-admin";

      navigate(dashboardRoute);
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(formData.email, formData.password);

      toast({
        title: "Login successful!",
        description: "Welcome back to Admiino",
      });
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Please check your credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      {/* LEFT SIDE */}
      <div className="flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="mb-12">
          <Logo className="h-8" />
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold text-foreground mb-6">
            Welcome to Admiino
          </h2>
          <p className="text-muted-foreground text-lg mb-12">
            Your intelligent executive management platform for task delegation,
            workflow automation, and assistant collaboration.
          </p>

          <div className="space-y-6">
            {/* Feature 1 */}
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Smart Task Management</h3>
                <p className="text-muted-foreground">
                  Delegate, track, and organize tasks efficiently.
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">AI-Assisted Workflow</h3>
                <p className="text-muted-foreground">
                  AI-powered analysis and routing for task optimization.
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="flex gap-4">
              <div className="w-14 h-14 bg-success rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Team & Company Management</h3>
                <p className="text-muted-foreground">
                  Manage assistants, executives, and managers in one place.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE LOGIN FORM */}
      <div className="flex items-center justify-center px-8 py-12 bg-card">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h2 className="text-3xl font-bold mb-2">Sign In</h2>
            <p className="text-muted-foreground mb-8">
              Continue to your dashboard
            </p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              {/* Email */}
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  placeholder="you@company.com"
                  className="mt-2"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
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
                    setFormData((prev) => ({ ...prev, password: e.target.value }))
                  }
                  required
                />
              </div>

              <Button className="w-full h-12" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            {/* SIGNUP LINKS */}
            <div className="mt-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or create an account
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button variant="outline" asChild>
                  <Link to="/signup-executive">Executive Signup</Link>
                </Button>

                <Button variant="outline" asChild>
                  <Link to="/signup-assistant">Assistant Signup</Link>
                </Button>
              </div>

              <Button variant="outline" asChild className="w-full">
                <Link to="/signup-manager">Manager Signup</Link>
              </Button>

              <Button variant="outline" asChild className="w-full">
                <Link to="/signup-executive-join">
                  Join Existing Company (Executive)
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
