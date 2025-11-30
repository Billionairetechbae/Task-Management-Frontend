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
  Calendar,
  Clock,
  User,
  LogOut,
  Edit,
  X,
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
  const [showEditForm, setShowEditForm] = useState(false);

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

      const result = await api.uploadProfilePicture(file);

      if (result?.data?.user) {
        setUser(result.data.user);
      }

      toast({ title: "Profile picture updated!" });
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
      setSaving(true);
      await api.updateUserProfile(payload);
      toast({ title: "Profile updated!" });
      await refreshUser();
      setShowEditForm(false); // Close edit form after saving on mobile
    } catch (err: any) {
      toast({
        title: "Failed to update",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
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
    <div className="min-h-screen bg-background py-6 sm:py-8 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Back Button */}
        <Link
          to={getDashboardRoute()}
          className="inline-flex items-center gap-2 text-foreground hover:text-primary mb-6 sm:mb-8 font-medium text-sm sm:text-base transition-colors"
        >
          <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          Back to Dashboard
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* LEFT SIDEBAR - PROFILE CARD */}
          <div className="lg:col-span-1">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 sticky top-6">
              {/* PROFILE PICTURE */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  {user.profilePictureUrl ? (
                    <img
                      src={user.profilePictureUrl}
                      alt="Profile"
                      className="w-32 h-32 sm:w-40 sm:h-40 rounded-full object-cover border-4 border-primary/20 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gradient-to-br from-primary/20 to-primary/10 rounded-full flex items-center justify-center border-4 border-primary/20 shadow-lg">
                      <span className="text-4xl sm:text-5xl font-bold text-primary">
                        {user.firstName[0]}
                        {user.lastName[0]}
                      </span>
                    </div>
                  )}
                  
                  {/* Upload overlay */}
                  <label
                    htmlFor="profile-file-input"
                    className="absolute bottom-2 right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center cursor-pointer hover:bg-primary/90 transition-colors shadow-lg border"
                  >
                    <Upload className="w-5 h-5 text-white" />
                  </label>
                </div>

                {/* Hidden file input */}
                <input
                  id="profile-file-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleUploadPicture}
                />

                {/* Upload button */}
                <label
                  htmlFor="profile-file-input"
                  className="flex items-center gap-2 px-4 py-2 border border-border rounded-lg cursor-pointer hover:bg-muted transition-colors text-sm w-full justify-center"
                >
                  <Upload className="w-4 h-4" />
                  {uploading ? "Uploading..." : "Change Photo"}
                </label>
              </div>

              {/* USER INFO */}
              <div className="text-center mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                  {user.firstName} {user.lastName}
                </h1>
                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <Badge className={`${roleBadgeColor} text-sm`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                  <Badge variant={user.isVerified ? "default" : "secondary"} className="gap-1 text-sm">
                    <CheckCircle2 className="w-4 h-4" />
                    {user.isVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>

              {/* COMPANY INFO */}
              {user.company && (
                <div className="mb-6 p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="w-5 h-5 text-primary" />
                    <h3 className="font-semibold">Company</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="font-medium">{user.company.name}</p>
                    <p className="text-muted-foreground">{user.company.industry}</p>
                    <p className="text-muted-foreground">{user.company.size}</p>
                  </div>
                </div>
              )}

              {/* TIMESTAMPS */}
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-4 h-4" />
                  <span>Updated {new Date(user.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* EDIT PROFILE BUTTON - MOBILE ONLY */}
              <Button 
                onClick={() => setShowEditForm(true)}
                className="w-full mt-6 gap-2 lg:hidden"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </Button>

              {/* LOGOUT BUTTON */}
              <Button 
                variant="outline" 
                onClick={logout} 
                className="w-full mt-4 gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* RIGHT CONTENT - EDITABLE FIELDS */}
          {/* Desktop: Always visible, Mobile: Only when showEditForm is true */}
          <div className={`lg:col-span-2 ${showEditForm ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8">
              {/* MOBILE HEADER WITH CLOSE BUTTON */}
              <div className="flex items-center justify-between mb-6 lg:mb-6">
                <div className="flex items-center gap-2">
                  <User className="w-6 h-6 text-primary" />
                  <h2 className="text-xl sm:text-2xl font-bold">Edit Profile</h2>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEditForm(false)}
                  className="lg:hidden"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* PERSONAL INFORMATION */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        First Name
                      </label>
                      <Input
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="text-base"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground mb-2 block">
                        Last Name
                      </label>
                      <Input
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="text-base"
                      />
                    </div>
                  </div>
                </div>

                {/* PROFESSIONAL INFORMATION - For non-executives */}
                {user.role !== "executive" && (
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Professional Information</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          <Briefcase className="w-4 h-4 inline mr-2" />
                          Specialization
                        </label>
                        <Input
                          value={specialization || ""}
                          onChange={(e) => setSpecialization(e.target.value)}
                          className="text-base"
                          placeholder="Your area of expertise"
                        />
                      </div>
                      
                      {/* <div>
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          <Award className="w-4 h-4 inline mr-2" />
                          Experience (years)
                        </label>
                        <Input
                          type="number"
                          value={experience}
                          onChange={(e) => setExperience(Number(e.target.value))}
                          className="text-base"
                          min="0"
                        />
                      </div> */}

                      {/* <div className="sm:col-span-2">
                        <label className="text-sm font-medium text-muted-foreground mb-2 block">
                          <DollarSign className="w-4 h-4 inline mr-2" />
                          Hourly Rate ($)
                        </label>
                        <Input
                          type="number"
                          value={hourlyRate}
                          onChange={(e) => setHourlyRate(Number(e.target.value))}
                          className="text-base"
                          min="0"
                          step="0.01"
                        />
                      </div> */}
                    </div>
                  </div>
                )}

                {/* BIO SECTION - Commented but kept for structure */}
                {/* <div>
                  <h3 className="text-lg font-semibold mb-4">Bio</h3>
                  <Textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="text-base resize-none"
                    placeholder="Tell us about yourself..."
                  />
                </div> */}

                {/* SAVE BUTTON */}
                <div className="flex gap-3 pt-4 border-t">
                  <Button 
                    onClick={handleSave} 
                    disabled={saving} 
                    className="flex-1 h-12 text-base font-semibold"
                    size="lg"
                  >
                    {saving ? (
                      <>
                        <Clock className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowEditForm(false)}
                    className="h-12 lg:hidden"
                  >
                    Cancel
                  </Button>
                  <Button 
                    variant="outline" 
                    asChild
                    className="h-12 hidden lg:flex"
                  >
                    <Link to={getDashboardRoute()}>
                      Cancel
                    </Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;