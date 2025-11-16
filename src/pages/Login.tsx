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

  useEffect(() => {
    if (user) {
      const dashboardRoute = user.role === 'executive' 
        ? '/dashboard-executive' 
        : user.role === 'assistant' 
        ? '/dashboard-assistant' 
        : '/dashboard-admin';
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
      <div className="flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="mb-12">
          <Logo className="h-8" />
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold text-foreground mb-6">Welcome to Admiino</h2>
          <p className="text-muted-foreground text-lg mb-12">
            Your intelligent executive assistant platform that combines human expertise with AI-powered task routing for maximum productivity.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Smart Task Management</h3>
                <p className="text-muted-foreground">
                  Delegate and track tasks with ease across your entire organization.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">AI-Powered Routing</h3>
                <p className="text-muted-foreground">
                  Automatically assign tasks to specialized AI agents for optimal results.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-success rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Real-Time Collaboration</h3>
                <p className="text-muted-foreground">
                  Communicate seamlessly with your assistants and track progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-12 bg-card">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h2 className="text-3xl font-bold mb-2">Sign In</h2>
            <p className="text-muted-foreground mb-8">Your Dedicated Executive Assistant</p>

            <form className="space-y-6" onSubmit={handleSubmit}>
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="executive@company.com"
                  className="mt-2"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••" 
                  className="mt-2"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  required
                />
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </form>

            <div className="mt-8 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Or create an account</span>
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
