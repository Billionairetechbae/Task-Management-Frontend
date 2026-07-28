import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Check, ArrowRight } from "lucide-react";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

const Signup = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.signupUser(form);
      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Signup failed", description: err?.message || "Try again", variant: "destructive" as any });
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-10 h-10 text-primary"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                ></path>
              </svg>
            </div>
            <h1 className="text-3xl font-bold mb-4">Verify your email</h1>
            <p className="text-muted-foreground text-lg mb-8">
              We sent a verification link to your email. Please verify to continue.
            </p>
          </div>

          <div className="space-y-3">
            <Button
              className="w-full h-10"
              onClick={() => navigate("/")}
            >
              Go to Login
            </Button>
            <Button
              variant="outline"
              className="w-full h-10"
              onClick={() => navigate("/")}
            >
              Back to Login
            </Button>
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

              <Button className="w-full h-10 gap-2 group" type="submit" disabled={loading}>
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

              <GoogleAuthButton />
            </form>

            <div className="mt-10 space-y-6">
              <Divider text="Already have an account?" />

              <Button variant="outline" className="w-full h-10" asChild>
                <Link to="/">Sign in instead</Link>
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

export default Signup;
