import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  HelpCircle,
  User,
  Building,
  Mail,
  Users,
  Copy,
  CheckCircle2,
  Save,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const CompanyProfile = () => {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const isExecutive = user?.role === "executive";

  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form values based on the *Company* object (NOT user object)
  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    size: "",
    bio: "",
  });

  useEffect(() => {
    if (user?.company) {
      setFormData({
        name: user.company.name,
        industry: user.company.industry || "",
        size: user.company.size || "",
        bio: user.company.bio || "",
      });
    }
  }, [user]);

  const handleSave = async () => {
    if (!user?.companyId) return;

    try {
      setSaving(true);

      await api.updateCompanyProfile(user.companyId, {
        name: formData.name,
        industry: formData.industry,
        size: formData.size,
        bio: formData.bio,
      });

      toast({
        title: "Profile updated",
        description: "Company profile updated successfully",
      });

      await refreshUser();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update company profile",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const copyCompanyCode = () => {
    if (!user?.company?.companyCode) return;

    navigator.clipboard.writeText(user.company.companyCode);
    setCopied(true);

    toast({
      title: "Copied!",
      description: "Company code has been copied to clipboard",
    });

    setTimeout(() => setCopied(false), 2000);
  };

  const handleChange = (key: string, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  /* =============================================================
     NON-EXECUTIVE ACCESS VIEW
  ============================================================= */
  if (!isExecutive) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="px-6 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">
                Company Profile (View Only)
              </h3>
              <p className="text-muted-foreground mb-4">
                Only executives can edit company information.
              </p>

              <div className="bg-muted/50 rounded-lg p-4 text-left inline-block">
                <p className="font-semibold">{user?.company?.name}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Industry: {user?.company?.industry || "Not set"}
                </p>
                <p className="text-sm text-muted-foreground">
                  Size: {user?.company?.size || "Not set"}
                </p>
              </div>

              <Button className="mt-6" asChild>
                <Link to="/dashboard-assistant">Back to Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  /* =============================================================
     EXECUTIVE VIEW
  ============================================================= */
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="px-6 py-8">
        {/* PAGE HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2">Company Profile</h2>
            <p className="text-muted-foreground">
              Manage your company’s information
            </p>
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? "Saving..." : <><Save className="w-5 h-5" /> Save Changes</>}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT SIDE – MAIN FORM */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Company Information
                </CardTitle>
                <CardDescription>
                  Update your company’s public information
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => handleChange("name", e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(v) => handleChange("industry", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Technology">Technology</SelectItem>
                      <SelectItem value="Finance">Finance</SelectItem>
                      <SelectItem value="Healthcare">Healthcare</SelectItem>
                      <SelectItem value="SaaS">SaaS</SelectItem>
                      <SelectItem value="Real Estate">Real Estate</SelectItem>
                      <SelectItem value="Consulting">Consulting</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Company Size</Label>
                  <Select
                    value={formData.size}
                    onValueChange={(v) => handleChange("size", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select company size" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1-10">1–10 employees</SelectItem>
                      <SelectItem value="11-50">11–50 employees</SelectItem>
                      <SelectItem value="51-200">51–200 employees</SelectItem>
                      <SelectItem value="201-500">201–500 employees</SelectItem>
                      <SelectItem value="500+">500+ employees</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Company Bio</Label>
                  <Textarea
                    rows={4}
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    placeholder="Tell assistants about your company vision..."
                  />
                </div>
              </CardContent>
            </Card>

            {/* TEAM MANAGEMENT */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Management
                </CardTitle>
                <CardDescription>
                  Manage assistants and pending verifications
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center p-4 bg-muted/50 rounded-lg">
                  <div>
                    <h4 className="font-semibold">Assistants</h4>
                    <p className="text-sm text-muted-foreground">
                      Approve or reject assistant applications
                    </p>
                  </div>
                  <Button asChild>
                    <Link to="/team-management">Manage Team</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDE – COMPANY CODE & STATS */}
          <div className="space-y-6">
            {/* COMPANY CODE CARD */}
            <Card>
              <CardHeader>
                <CardTitle>Company Code</CardTitle>
                <CardDescription>
                  Assistants use this code to join your company
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="bg-primary/10 p-4 text-center rounded-md border border-primary/20">
                  <div className="text-2xl font-mono font-bold text-primary">
                    {user?.company?.companyCode || "Loading..."}
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={copyCompanyCode}
                >
                  {copied ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy Company Code
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* QUICK STATS */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm">Company Status</span>
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/20"
                  >
                    Active
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm">Subscription</span>
                  <Badge variant="outline">
                    {user?.subscriptionTier || "Free"}
                  </Badge>
                </div>

                <div className="flex justify-between">
                  <span className="text-sm">Member Since</span>
                  <span className="text-sm text-muted-foreground">
                    {new Date(user?.createdAt || "").toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

/* =============================================================
   HEADER COMPONENT
============================================================= */
const Header = () => {
  const { user } = useAuth();

  return (
    <header className="border-b border-border bg-card px-6 py-4">
      <div className="flex items-center justify-between">
        <Logo className="h-8" />

        <div className="flex items-center gap-4">
          <Button variant="outline" asChild className="gap-2">
            <Link
              to={
                user?.role === "executive"
                  ? "/dashboard-executive"
                  : "/dashboard-assistant"
              }
            >
              <Users className="w-5 h-5" />
              Dashboard
            </Link>
          </Button>

          <HelpCircle className="w-6 h-6 text-muted-foreground" />
          <Bell className="w-6 h-6 text-muted-foreground" />

          <Button variant="outline" asChild>
            <Link to="/profile">
              <User className="w-5 h-5 mr-2" />
              Profile
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default CompanyProfile;
