import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Building2,
  Award,
  DollarSign,
  Briefcase,
  CheckCircle2,
  Upload,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

const Profile = () => {
  const { user, refreshUser, logout, setUser } = useAuth();
  const { toast } = useToast();

  if (!user) return null;

  /* ========================================================
     EDITABLE FIELDS
  ========================================================= */
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [specialization, setSpecialization] = useState(user.specialization || "");
  const [experience, setExperience] = useState(user.experience || 0);
  const [hourlyRate, setHourlyRate] = useState(user.hourlyRate || 0);

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ========================================================
     GET DASHBOARD ROUTE
  ========================================================= */
  const getDashboardRoute = () => {
    switch (user.role) {
      case "executive": return "/dashboard-executive";
      case "manager": return "/dashboard-manager";
      case "assistant": return "/dashboard-assistant";
      case "admin": return "/dashboard-admin";
      default: return "/";
    }
  };

  /* ========================================================
     UPLOAD PROFILE PICTURE
  ========================================================= */
  // const handleUploadPicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
  //   const file = event.target.files?.[0];
  //   if (!file) return;

  //   // Optional size validation (2MB)
  //   if (file.size > 2 * 1024 * 1024) {
  //     toast({
  //       title: "Image too large",
  //       description: "Please upload an image under 2MB",
  //       variant: "destructive",
  //     });
  //     return;
  //   }

  //   try {
  //     setUploading(true);

  //     await api.uploadProfilePicture(file);

  //     toast({ title: "Profile picture updated!" });
  //     await refreshUser();
  //   } catch (err: any) {
  //     toast({
  //       title: "Upload failed",
  //       description: err.message,
  //       variant: "destructive",
  //     });
  //   } finally {
  //     setUploading(false);
  //   }
  // };

  const handleUploadPicture = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Image too large",
        description: "Please upload an image under 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);

      // --- NEW: capture the response
      const result = await api.uploadProfilePicture(file);

      // --- NEW: update user immediately
      if (result?.data?.user) {
        setUser(result.data.user);   // 👈 requires import from useAuth()
      }

      toast({ title: "Profile picture updated!" });

      // optional but recommended to sync with backend
      await refreshUser();
    } catch (err: any) {
      toast({
        title: "Upload failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  /* ========================================================
     SAVE PROFILE CHANGES
  ========================================================= */
  const handleSave = async () => {
    const payload: any = {
      firstName,
      lastName,
      bio,
    };

    if (user.role !== "executive") {
      if (specialization) payload.specialization = specialization;
      if (experience !== null ) payload.experience = Number(experience);
      if (hourlyRate !== null ) payload.hourlyRate = Number(hourlyRate);
    }

    try {
      await api.updateUserProfile(payload);
      toast({ title: "Profile updated!" });
      await refreshUser();
    } catch (err: any) {
      toast({
        title: "Failed to update",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  /* ========================================================
     ROLE BADGE COLOR
  ========================================================= */
  const roleBadgeColor = {
    executive: "bg-primary text-primary-foreground",
    manager: "bg-accent text-accent-foreground",
    assistant: "bg-muted text-muted-foreground",
    admin: "bg-destructive text-destructive-foreground",
  }[user.role];

  /* ========================================================
     UI
  ========================================================= */
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">

        {/* Back Button */}
        <Link
          to={getDashboardRoute()}
          className="inline-flex items-center gap-2 text-foreground hover:text-primary mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        {/* MAIN CARD */}
        <div className="bg-card border border-border rounded-2xl p-8">

          {/* HEADER */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-6">

              {/* PROFILE PICTURE */}
              <div className="flex flex-col items-center">
                {user.profilePictureUrl ? (
                  <img
                    src={user.profilePictureUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border"
                  />
                ) : (
                  <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center border">
                    <span className="text-3xl font-bold text-primary">
                      {user.firstName[0]}
                      {user.lastName[0]}
                    </span>
                  </div>
                )}

                {/* Visible upload button */}
                <label
                  htmlFor="profile-file-input"
                  className="mt-4 flex items-center gap-2 px-4 py-2 border rounded-lg cursor-pointer hover:bg-muted"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Choose Picture"}
                </label>

                {/* Hidden file input */}
                <input
                  id="profile-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadPicture}
                />
              </div>

              {/* NAME + ROLE */}
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <Input
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="font-bold text-xl w-40"
                  />
                  <Input
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="font-bold text-xl w-40"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <Badge className={roleBadgeColor}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>

                  <Badge variant={user.isVerified ? "default" : "secondary"} className="gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {user.isVerified ? "Verified" : "Pending"}
                  </Badge>

                  <Badge variant="outline">{user.subscriptionTier}</Badge>
                </div>
              </div>
            </div>

            {/* LOGOUT BUTTON */}
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>

          {/* GRID INFO */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{user.email}</p>
              </div>

              {user.company && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="font-medium">{user.company.name}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{user.company.industry}</p>
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Company Size</p>
                    <p className="font-medium">{user.company.size}</p>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT COLUMN (only assistant/manager editable) */}
            <div className="space-y-4">
              {user.role !== "executive" && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground">Specialization</p>
                    <Input
                      value={specialization || ""}
                      onChange={(e) => setSpecialization(e.target.value)}
                    />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Experience</p>
                    <Input
                      type="number"
                      value={experience}
                      onChange={(e) => setExperience(Number(e.target.value))}
                    />
                  </div>

                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate ($)</p>
                    <Input
                      type="number"
                      value={hourlyRate}
                      onChange={(e) => setHourlyRate(Number(e.target.value))}
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* BIO */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm text-muted-foreground mb-2">Bio</p>
            <Textarea
              rows={4}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
            />
          </div>

          {/* SAVE BUTTON */}
          <div className="mt-6">
            <Button onClick={handleSave} disabled={saving} className="w-full h-12">
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>

          {/* TIMESTAMPS */}
          <div className="mt-6 pt-6 border-t text-sm text-muted-foreground grid grid-cols-2 gap-4">
            <div>
              <p>Account Created</p>
              <p className="font-medium text-foreground">
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p>Last Updated</p>
              <p className="font-medium text-foreground">
                {new Date(user.updatedAt).toLocaleDateString()}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Profile;
