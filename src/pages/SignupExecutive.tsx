import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building2, CheckCircle2, MailCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const SignupExecutive = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); // Step 1 = form, Step 2 = verification message

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    company: "",
    companySize: "",
    industry: "",
  });

  const [emailForVerification, setEmailForVerification] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await api.signupExecutive(formData);

      // Store email for success screen
      setEmailForVerification(formData.email);

      toast({
        title: "Account created!",
        description: "Please check your email to verify your account.",
      });

      setStep(2);
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };


  // ============================================
  // STEP 2 — SUCCESS SCREEN (No auto login!)
  // ============================================
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background py-8 px-4 flex items-center">
        <div className="max-w-xl mx-auto text-center">
          <Logo className="h-8 mb-6 mx-auto" />

          <MailCheck className="w-16 h-16 text-primary mx-auto mb-4" />

          <h2 className="text-3xl font-bold mb-2">Verify Your Email</h2>

          <p className="text-muted-foreground max-w-md mx-auto mb-6">
            We sent a verification link to:
          </p>

          <p className="font-semibold text-lg mb-8">{emailForVerification}</p>

          <p className="text-sm text-muted-foreground mb-8 max-w-md mx-auto">
            Please verify your email before logging in.  
            If you don't see the email, check your spam folder.
          </p>

          <Button 
            onClick={() => navigate("/")}
            className="w-full h-12 text-base font-semibold"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }


  // ============================================
  // STEP 1 — REGISTRATION FORM
  // ============================================
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-2xl mx-auto">
        
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-foreground hover:text-primary mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </Link>

        <div className="text-center mb-8">
          <Logo className="h-8 mb-2 mx-auto" />
          <div className="flex items-center justify-center gap-2 mb-4">
            <Building2 className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Create Executive Account</h2>
          <p className="text-muted-foreground">
            Create your company and build your team
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  required
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
                minLength={6}
                className="mt-2"
              />
            </div>

            <div>
              <Label>Company Name</Label>
              <Input
                value={formData.company}
                onChange={(e) => handleChange("company", e.target.value)}
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label>Company Size</Label>
              <Select 
                value={formData.companySize} 
                onValueChange={(value) => handleChange("companySize", value)}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select company size" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-10">1–10 Employees</SelectItem>
                  <SelectItem value="11-50">11–50 Employees</SelectItem>
                  <SelectItem value="51-200">51–200 Employees</SelectItem>
                  <SelectItem value="201-500">201–500 Employees</SelectItem>
                  <SelectItem value="500+">500+ Employees</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Industry</Label>
              <Select 
                value={formData.industry} 
                onValueChange={(value) => handleChange("industry", value)}
              >
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

            <Button type="submit" disabled={loading} className="w-full h-12 text-base font-semibold">
              {loading ? "Creating Account..." : "Create Executive Account"}
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
