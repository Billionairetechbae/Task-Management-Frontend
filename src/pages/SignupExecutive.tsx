import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const SignupExecutive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Basic info, 2: Company created
  const [companyCode, setCompanyCode] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    company: "",
    companySize: "",
    industry: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.signupExecutive(formData);
      
      // Store company code for display
      setCompanyCode(response.data.user.company?.companyCode || "");
      
      toast({
        title: "Company created successfully!",
        description: "Your executive account has been created",
      });
      
      setStep(2); // Show success step
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleContinueToDashboard = () => {
    navigate("/dashboard-executive");
  };

  // Step 2: Success screen with company code
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Logo className="h-8 mb-2" />
            <div className="flex items-center justify-center gap-2 mb-4">
              <CheckCircle2 className="w-12 h-12 text-success" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Welcome to Your Company!</h2>
            <p className="text-muted-foreground">Your executive account has been created successfully</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="mb-6">
              <h3 className="text-xl font-bold mb-2">Your Company Code</h3>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 max-w-md mx-auto">
                <code className="text-2xl font-mono font-bold text-primary">{companyCode}</code>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Share this code with Team Members so they can join your company
              </p>
            </div>

            <div className="space-y-4 text-left max-w-md mx-auto">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Invite Team Member</h4>
                  <p className="text-sm text-muted-foreground">Share your company code with Team Members to join your team</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Verify Team Members</h4>
                  <p className="text-sm text-muted-foreground">Review and approve team members registrations in your dashboard</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Start Delegating</h4>
                  <p className="text-sm text-muted-foreground">Assign tasks to your verified assistants</p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleContinueToDashboard}
              className="w-full h-12 text-base font-semibold mt-8"
            >
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Step 1: Registration form
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-foreground hover:text-primary mb-8 font-medium">
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </Link>

        <div className="text-center mb-8">
          <Logo className="h-8 mb-2" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Create Executive Account</h2>
          <p className="text-muted-foreground">Create your company and build your team</p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  placeholder="Sarah"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  placeholder="Johnson"
                  required
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                placeholder="sarah@techcorp.com"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                placeholder="Tech Corp Inc"
                required
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                This will create a new company. Team Members will join using your company code.
              </p>
            </div>

            <div>
              <Label htmlFor="companySize">Company Size</Label>
              <Select value={formData.companySize} onValueChange={(value) => handleChange("companySize", value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="500+">500+ employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="industry">Industry</Label>
              <Select value={formData.industry} onValueChange={(value) => handleChange("industry", value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select industry" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SaaS">SaaS</SelectItem>
                  <SelectItem value="E-commerce">E-commerce</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                  <SelectItem value="Healthcare">Healthcare</SelectItem>
                  <SelectItem value="Technology">Technology</SelectItem>
                  <SelectItem value="Real Estate">Real Estate</SelectItem>
                  <SelectItem value="Consulting">Consulting</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? "Creating Company..." : "Create Executive Account"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/" className="text-primary hover:underline font-medium">
              Already have an account? Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupExecutive;