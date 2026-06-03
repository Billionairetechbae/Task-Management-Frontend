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
import { Switch } from "@/components/ui/switch";
import {
  Building,
  Building2,
  Mail,
  Users,
  Copy,
  CheckCircle2,
  Save,
  HelpCircle,
  ShieldCheck,
  Sparkles,
  Info,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { api } from "@/lib/api";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import type { RoleOperationPermissions } from "@/lib/api";

const CompanyProfile = () => {
  const { user, refreshUser, activeCompanyId, activeWorkspace, workspaceRole } = useAuth();
  const { toast } = useToast();
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    size: "",
    industry: "",
    bio: "",
  });
  const [permissionSettings, setPermissionSettings] = useState({
    invitePermissionMode: "restricted" as "restricted" | "free",
    assistancePermissionMode: "restricted" as "restricted" | "free",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [roleOperationPermissions, setRoleOperationPermissions] = useState<RoleOperationPermissions | null>(null);
  const {
    settings: workspaceSettings,
    permissionKeys,
    updateSettings,
    isUpdating: isUpdatingWorkspaceSettings,
    refetch: refetchWorkspaceSettings,
  } = useWorkspaceSettings();

  const isExecutive = user?.role === "executive";
  // Only the actual workspace owner (or platform admin) can edit workspace settings/permissions per backend `requireWorkspaceOwner`.
  const isWorkspaceOwner = workspaceRole === "owner" || user?.role === "admin";
  // Backend `updateActiveCompany` allows membership role of "owner" or "admin".
  const canEditCompanyInfo =
    workspaceRole === "owner" || workspaceRole === "admin" || user?.role === "admin";

  const fetchCompany = async () => {
    if (!activeCompanyId) return;
    try {
      setLoading(true);
      const res = await api.getActiveCompany();
      const company = res.data.company;
      setFormData({
        name: company.name || "",
        size: company.size || "",
        industry: company.industry || "",
        bio: company.bio || "",
      });
    } catch (error) {
      console.error("Failed to fetch company details:", error);
      if (activeWorkspace?.company) {
        setFormData({
          name: activeWorkspace.company.name || "",
          size: (activeWorkspace.company as any).size || "",
          industry: activeWorkspace.company.industry || "",
          bio: "",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspaceSettings = async () => {
    if (!activeCompanyId || !isWorkspaceOwner) return;
    try {
      setSettingsLoading(true);
      const res = await api.getWorkspaceSettings(activeCompanyId);
      const settings = (res.data as any)?.settings || res.data;
      setPermissionSettings({
        invitePermissionMode: settings.invitePermissionMode || "restricted",
        assistancePermissionMode: settings.assistancePermissionMode || "restricted",
      });
    } catch (error) {
      console.error("Failed to fetch workspace settings:", error);
    } finally {
      setSettingsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompany();
    fetchWorkspaceSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, isWorkspaceOwner]);

  useEffect(() => {
    if (workspaceSettings?.roleOperationPermissions) {
      setRoleOperationPermissions(workspaceSettings.roleOperationPermissions);
    }
  }, [workspaceSettings?.roleOperationPermissions]);

  const handleSaveProfile = async () => {
    if (!canEditCompanyInfo) {
      toast({
        title: "Not allowed",
        description: "Only workspace owners and admins can update company information.",
        variant: "destructive",
      });
      return;
    }

    // Build payload with only set / non-empty fields to avoid backend enum validation issues.
    const payload: { name?: string; size?: string; industry?: string; bio?: string } = {};
    if (formData.name.trim()) payload.name = formData.name.trim();
    if (formData.size) payload.size = formData.size;
    if (formData.industry) payload.industry = formData.industry;
    if (formData.bio !== undefined) payload.bio = formData.bio;

    if (!Object.keys(payload).length) {
      toast({ title: "Nothing to save", description: "Please update at least one field.", variant: "destructive" });
      return;
    }

    try {
      setSavingProfile(true);
      await api.updateActiveCompany(payload);
      toast({
        title: "Company profile saved",
        description: "Your company information has been updated.",
      });
      await Promise.all([fetchCompany(), refreshUser()]);
    } catch (error: any) {
      console.error("Failed to update company profile:", error);
      toast({
        title: "Failed to save company info",
        description: error?.message || "Could not update company profile.",
        variant: "destructive",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePermissions = async () => {
    if (!isWorkspaceOwner) {
      toast({
        title: "Not allowed",
        description: "Only the workspace owner can update permissions.",
        variant: "destructive",
      });
      return;
    }
    if (!activeCompanyId) return;

    try {
      setSavingPermissions(true);
      await updateSettings({
        invitePermissionMode: permissionSettings.invitePermissionMode,
        assistancePermissionMode: permissionSettings.assistancePermissionMode,
        roleOperationPermissions: roleOperationPermissions || undefined,
      });
      await refetchWorkspaceSettings();
      toast({
        title: "Permissions updated",
        description: "Workspace permission settings have been saved.",
      });
    } catch (error: any) {
      console.error("Failed to update workspace settings:", error);
      toast({
        title: "Failed to save permissions",
        description: error?.message || "Could not update workspace settings.",
        variant: "destructive",
      });
    } finally {
      setSavingPermissions(false);
    }
  };

  const copyCompanyCode = () => {
    const code = activeWorkspace?.company?.companyCode;
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Company code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!isExecutive) {
    return (
      <DashboardLayout>
        <Card>
          <CardContent className="p-8">
            <div className="max-w-md mx-auto text-center">
              <Building className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Company Profile</h3>
              <p className="text-muted-foreground mb-6">
                Company profile management is only available for executives.
              </p>
              <Button asChild>
                <Link to="/dashboard-team_member">Back to Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={150}>
        {/* Hero header */}
        <div className="relative mb-6 overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 animate-fade-in">
          <div className="absolute -top-16 -right-16 w-64 h-64 bg-primary/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-56 h-56 bg-accent/15 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shrink-0">
                <Building2 className="w-7 h-7 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] uppercase tracking-wider font-bold text-primary">Workspace</span>
                </div>
                <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
                  {formData.name || "Company Profile"}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Manage your company information, branding, and permissions.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile || !canEditCompanyInfo}
              className="gap-2 hover-scale shadow-sm"
              size="lg"
            >
              {savingProfile ? <>Saving...</> : (<><Save className="w-4 h-4" />Save Company Info</>)}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Left Column - Company Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information Card */}
            <Card className="overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/30">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Building className="w-4 h-4 text-primary" />
                  </div>
                  Company Information
                </CardTitle>
                <CardDescription>
                  Basic details about your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={formData.name}
                      onChange={(e) =>
                        handleChange("name", e.target.value)
                      }
                      placeholder="Your company name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="companySize">Company Size</Label>
                    <Select
                      value={formData.size}
                      onValueChange={(value) =>
                        handleChange("size", value)
                      }
                    >
                      <SelectTrigger>
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
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select
                    value={formData.industry}
                    onValueChange={(value) => handleChange("industry", value)}
                  >
                    <SelectTrigger>
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

                <div className="space-y-2">
                  <Label htmlFor="bio">Company Bio</Label>
                  <Textarea
                    id="bio"
                    value={formData.bio}
                    onChange={(e) => handleChange("bio", e.target.value)}
                    placeholder="Tell us about your company..."
                    rows={4}
                  />
                  <p className="text-sm text-muted-foreground">
                    This helps team_members understand your company culture and
                    work environment.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Role Permissions</CardTitle>
                <CardDescription>
                    Configure default permissions for each workspace role. Individual approvals can still grant access to specific users.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!isWorkspaceOwner && (
                  <div className="text-sm text-muted-foreground border rounded-lg p-3 bg-muted/30">
                    Only workspace owners can edit role permissions.
                  </div>
                )}
                <div className="border rounded-lg overflow-x-auto">
                  <table className="w-full min-w-[900px]">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left p-3">Role</th>
                        {permissionKeys.map((key) => (
                          <th key={key} className="text-left p-3 text-xs uppercase tracking-wide text-muted-foreground">
                            {key.split("_").join(" ")}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { key: "admin" as const, label: "Executive" },
                        { key: "manager" as const, label: "Manager" },
                        { key: "member" as const, label: "Team Member" },
                      ].map((role) => (
                        <tr key={role.key} className="border-b last:border-b-0">
                          <td className="p-3 font-medium">{role.label}</td>
                          {permissionKeys.map((key) => (
                            <td key={`${role.key}-${key}`} className="p-3">
                              <Switch
                                checked={!!roleOperationPermissions?.[role.key]?.[key]}
                                onCheckedChange={(checked) => {
                                  if (!isWorkspaceOwner || !roleOperationPermissions) return;
                                  setRoleOperationPermissions((prev) => {
                                    if (!prev) return prev;
                                    return {
                                      ...prev,
                                      [role.key]: {
                                        ...prev[role.key],
                                        [key]: checked,
                                      },
                                    };
                                  });
                                }}
                                disabled={!isWorkspaceOwner || isUpdatingWorkspaceSettings}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isWorkspaceOwner && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSavePermissions}
                      disabled={savingPermissions || isUpdatingWorkspaceSettings}
                      className="gap-2"
                    >
                      {savingPermissions || isUpdatingWorkspaceSettings ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Permissions
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Team Management Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Team Management
                </CardTitle>
                <CardDescription>
                  Manage your team_members and team settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-semibold">TeamMember Team</h4>
                      <p className="text-sm text-muted-foreground">
                        Manage your company team_members and verifications
                      </p>
                    </div>
                    <Button asChild>
                      <Link to="/team-management">Manage Team</Link>
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <h4 className="font-semibold text-sm">
                        Invitation Settings
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Control how team_members join your company
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className="bg-success/10 text-success border-success/20"
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Manual Approval
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        All team_members require executive approval
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Workspace Permissions</CardTitle>
                <CardDescription>
                  Control who can invite and hire talent in this workspace
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <h4 className="font-semibold">Invite Permission</h4>
                    <p className="text-sm text-muted-foreground">
                      {permissionSettings.invitePermissionMode === "free"
                        ? "All members can invite and hire talent."
                        : "Only owner/admin/manager can invite or hire talent."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Restricted</span>
                    <Switch
                      checked={permissionSettings.invitePermissionMode === "free"}
                      onCheckedChange={(checked) =>
                        setPermissionSettings((prev) => ({
                          ...prev,
                          invitePermissionMode: checked ? "free" : "restricted",
                        }))
                      }
                      disabled={settingsLoading}
                    />
                    <span className="text-xs text-muted-foreground">Free</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border rounded-lg p-4">
                  <div>
                    <h4 className="font-semibold">Hire Talent Permission</h4>
                    <p className="text-sm text-muted-foreground">
                      {permissionSettings.assistancePermissionMode === "free"
                        ? "All members can invite and hire talent."
                        : "Only owner/admin/manager can invite or hire talent."}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">Restricted</span>
                    <Switch
                      checked={permissionSettings.assistancePermissionMode === "free"}
                      onCheckedChange={(checked) =>
                        setPermissionSettings((prev) => ({
                          ...prev,
                          assistancePermissionMode: checked ? "free" : "restricted",
                        }))
                      }
                      disabled={settingsLoading}
                    />
                    <span className="text-xs text-muted-foreground">Free</span>
                  </div>
                </div>

                {isWorkspaceOwner && (
                  <div className="flex justify-end">
                    <Button
                      onClick={handleSavePermissions}
                      disabled={savingPermissions || isUpdatingWorkspaceSettings}
                      className="gap-2"
                    >
                      {savingPermissions || isUpdatingWorkspaceSettings ? (
                        <>Saving...</>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Workspace Permissions
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Company Code & Quick Actions */}
          <div className="space-y-6">
            {/* Company Code Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Company Code
                </CardTitle>
                <CardDescription>
                  Share this code with team_members to join your company
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="text-center">
                    <div className="text-2xl font-mono font-bold text-primary mb-2">
                      {activeWorkspace?.company?.companyCode || "Loading..."}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Unique company identifier
                    </p>
                  </div>
                </div>

                <Button
                  onClick={copyCompanyCode}
                  variant="outline"
                  className="w-full gap-2"
                  disabled={!activeWorkspace?.company?.companyCode}
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

                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">How to use:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Share this code with potential team_members</li>
                    <li>• TeamMembers use it to join your company</li>
                    <li>• You'll need to approve their applications</li>
                    <li>• Keep this code secure</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats Card */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
                <CardDescription>Your company at a glance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Company Status</span>
                  <Badge
                    variant="outline"
                    className="bg-success/10 text-success border-success/20"
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Subscription</span>
                  <Badge variant="outline">
                    {user?.subscriptionTier === "premium"
                      ? "Premium"
                      : "Free"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Member Since</span>
                  <span className="text-sm text-muted-foreground">
                    {user?.createdAt
                      ? new Date(user.createdAt).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Support Card */}
            <Card>
              <CardHeader>
                <CardTitle>Need Help?</CardTitle>
                <CardDescription>
                  Get support for your company account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <HelpCircle className="w-4 h-4" />
                  Help Center
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start gap-2"
                >
                  <Mail className="w-4 h-4" />
                  Contact Support
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default CompanyProfile;
