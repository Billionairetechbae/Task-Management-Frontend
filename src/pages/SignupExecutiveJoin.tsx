import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Crown, CheckCircle2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const SignupExecutiveJoin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyCode: "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
      await api.signupExecutiveJoin(formData);

      toast({
        title: "Executive account created!",
        description: "You have successfully joined the company.",
      });

      setStep(2);
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Invalid company code or email already exists.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (step === 2) {
    return (
      <div className="min-h-screen py-10 px-4 bg-background flex justify-center">
        <div className="max-w-lg text-center">
          <Logo className="h-10 mx-auto mb-4" />
          <CheckCircle2 className="w-14 h-14 text-success mx-auto mb-4" />
          <h2 className="text-3xl font-bold mb-2">Welcome Executive!</h2>
          <p className="text-muted-foreground mb-6">
            You have successfully joined the company.
          </p>
          <Button className="w-full h-12" onClick={() => navigate("/")}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-foreground hover:text-primary mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Login
        </Link>

        <div className="text-center mb-6">
          <Logo className="h-8 mx-auto mb-2" />
          <Crown className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="text-3xl font-bold">Join as Executive</h2>
          <p className="text-muted-foreground">
            Use the company code to join an existing organization
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>First Name</Label>
                <Input
                  value={formData.firstName}
                  onChange={(e) => handleChange("firstName", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label>Last Name</Label>
                <Input
                  value={formData.lastName}
                  onChange={(e) => handleChange("lastName", e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Company Code</Label>
              <Input
                value={formData.companyCode}
                onChange={(e) => handleChange("companyCode", e.target.value)}
                placeholder="NATEP-4JF82K"
                required
              />
            </div>

            <Button type="submit" className="w-full h-12" disabled={loading}>
              {loading ? "Joining..." : "Join as Executive"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupExecutiveJoin;
