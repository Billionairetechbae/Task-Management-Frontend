import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  ArrowLeft,
  Users,
  Building2,
  CheckCircle2,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const SignupManager = () => {
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
    specialization: "",
    experience: 0,
    hourlyRate: 0,
    bio: "",
    skills: [] as string[],
  });

  const [skillInput, setSkillInput] = useState("");

  const addSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData((prev) => ({
        ...prev,
        skills: [...prev.skills, skillInput.trim()],
      }));
      setSkillInput("");
    }
  };

  const removeSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.filter((s) => s !== skill),
    }));
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);

    try {
        await api.signupManager(formData);


      toast({
        title: "Welcome aboard!",
        description: "You’ve successfully joined the company as a manager.",
      });

      setStep(2);
    } catch (error: any) {
      toast({
        title: "Signup failed",
        description: error.message || "Could not complete registration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Step 2 success screen
  if (step === 2) {
    return (
      <div className="min-h-screen py-10 px-4 bg-background flex justify-center">
        <div className="max-w-lg w-full text-center">
          <Logo className="h-10 mb-4 mx-auto" />

          <CheckCircle2 className="w-16 h-16 text-success mx-auto mb-4" />

          <h2 className="text-3xl font-bold mb-2">
            Manager Account Created
          </h2>
          <p className="text-muted-foreground mb-6">
            You’re now part of the company. You can access management tools after logging in.
          </p>

          <Button
            className="w-full h-12 font-semibold"
            onClick={() => navigate("/")}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Step 1 form
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
          <Users className="w-10 h-10 text-primary mx-auto mb-3" />
          <h2 className="text-3xl font-bold">Join as a Manager</h2>
          <p className="text-muted-foreground">
            Provide the company code to join the team
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* First + Last Name */}
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

            {/* Email */}
            <div>
              <Label>Email Address</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => handleChange("email", e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={formData.password}
                onChange={(e) => handleChange("password", e.target.value)}
                required
              />
            </div>

            {/* Company Code */}
            <div>
              <Label>Company Code</Label>
              <Input
                value={formData.companyCode}
                onChange={(e) => handleChange("companyCode", e.target.value)}
                placeholder="NATEP-8HF2KF"
                required
              />
            </div>

            {/* Optional manager details */}
            <div>
              <Label>Specialization</Label>
              <Input
                value={formData.specialization}
                onChange={(e) => handleChange("specialization", e.target.value)}
                placeholder="Operations, HR, Finance..."
              />
            </div>

            <div>
              <Label>Years of Experience</Label>
              <Input
                type="number"
                value={formData.experience}
                onChange={(e) =>
                  handleChange("experience", parseInt(e.target.value) || 0)
                }
              />
            </div>

            <div>
              <Label>Bio</Label>
              <Textarea
                value={formData.bio}
                onChange={(e) => handleChange("bio", e.target.value)}
                rows={3}
              />
            </div>

            {/* Skills */}
            <div>
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                />
                <Button type="button" variant="outline" onClick={addSkill}>
                  Add
                </Button>
              </div>

              <div className="flex flex-wrap gap-2 mt-3">
                {formData.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm flex items-center gap-2"
                  >
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <Button
              className="w-full h-12"
              disabled={loading}
              type="submit"
            >
              {loading ? "Creating Manager..." : "Join as Manager"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default SignupManager;
