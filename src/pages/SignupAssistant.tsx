import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Users, CheckCircle2, Clock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const SignupAssistant = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Registration, 2: Pending approval
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    companyCode: "", // Changed from company name to company code
    specialization: "",
    experience: 0,
    hourlyRate: 0,
    bio: "",
    skills: [] as string[],
  });
  const [skillInput, setSkillInput] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.signupAssistant(formData);
      toast({
        title: "Application submitted!",
        description: "Your account is pending verification from the company executive",
      });
      setStep(2); // Show pending approval step
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Please check your company code and try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData(prev => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()]
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(s => s !== skill)
    }));
  };

  const handleBackToLogin = () => {
    navigate("/");
  };

  // Step 2: Pending approval screen
  if (step === 2) {
    return (
      <div className="min-h-screen bg-background py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <Logo className="h-8 mb-2" />
            <div className="flex items-center justify-center gap-2 mb-4">
              <Clock className="w-12 h-12 text-warning" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Application Submitted</h2>
            <p className="text-muted-foreground">Your account is pending executive approval</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="space-y-4 text-left max-w-md mx-auto mb-6">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-success mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Profile Created</h4>
                  <p className="text-sm text-muted-foreground">Your assistant profile has been created successfully</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-warning mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold">Pending Verification</h4>
                  <p className="text-sm text-muted-foreground">The company executive will review and approve your application</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="font-semibold text-muted-foreground">Access Granted</h4>
                  <p className="text-sm text-muted-foreground">You'll receive access once verified by the executive</p>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
              <p className="text-sm text-warning">
                <strong>Note:</strong> You will not be able to access the dashboard until your account is verified by the company executive.
              </p>
            </div>

            <Button 
              onClick={handleBackToLogin}
              variant="outline"
              className="w-full h-12 text-base font-semibold"
            >
              Back to Login
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
            <Users className="w-8 h-8 text-accent" />
          </div>
          <h2 className="text-3xl font-bold mb-2">Join a Company as Assistant</h2>
          <p className="text-muted-foreground">Get verified and start working with executives</p>
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
                  placeholder="Maria"
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
                  placeholder="Gonzalez"
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
                placeholder="maria@admiino.com"
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
              <Label htmlFor="companyCode">Company Code</Label>
              <Input
                id="companyCode"
                value={formData.companyCode}
                onChange={(e) => handleChange("companyCode", e.target.value)}
                placeholder="Enter company code provided by executive"
                required
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Get this code from the company executive to join their team
              </p>
            </div>

            <div>
              <Label htmlFor="specialization">Specialization</Label>
              <Select value={formData.specialization} onValueChange={(value) => handleChange("specialization", value)}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Select specialization" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="operations">Operations</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                  <SelectItem value="finance">Finance</SelectItem>
                  <SelectItem value="hr">Human Resources</SelectItem>
                  <SelectItem value="general">General Administration</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Input
                  id="experience"
                  type="number"
                  value={formData.experience}
                  onChange={(e) => handleChange("experience", parseInt(e.target.value) || 0)}
                  placeholder="4"
                  min="0"
                  max="50"
                  required
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                <Input
                  id="hourlyRate"
                  type="number"
                  value={formData.hourlyRate}
                  onChange={(e) => handleChange("hourlyRate", parseInt(e.target.value) || 0)}
                  placeholder="28"
                  min="0"
                  max="500"
                  required
                  className="mt-2"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                placeholder="Tell us about your experience and expertise..."
                required
                className="mt-2"
                rows={4}
              />
            </div>

            <div>
              <Label htmlFor="skills">Skills</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="skills"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                />
                <Button type="button" onClick={addSkill} variant="outline">Add</Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-destructive"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
              {loading ? "Submitting Application..." : "Join Company as Assistant"}
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

export default SignupAssistant;