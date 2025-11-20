import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  Building2,
  Award,
  DollarSign,
  Briefcase,
  UserCircle,
  UserCog,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Profile = () => {
  const { user, logout } = useAuth();

  if (!user) return null;

  const getDashboardRoute = () => {
    switch (user.role) {
      case "executive":
        return "/dashboard-executive";
      case "manager":
        return "/dashboard-manager";
      case "assistant":
        return "/dashboard-assistant";
      case "admin":
        return "/dashboard-admin";
      default:
        return "/";
    }
  };

  const roleBadgeColor = {
    executive: "bg-primary text-primary-foreground",
    manager: "bg-accent text-accent-foreground",
    assistant: "bg-muted text-muted-foreground",
    admin: "bg-destructive text-destructive-foreground",
  }[user.role];

  return (
    // <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          to={getDashboardRoute()}
          className="inline-flex items-center gap-2 text-foreground hover:text-primary mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>

        {/* Profile Card */}
        <div className="bg-card border border-border rounded-2xl p-8">
          {/* Header Section */}
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-start gap-6">
              {/* Profile Picture or Initials */}
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


              {/* Name & Badges */}
              <div>
                <h1 className="text-3xl font-bold mb-2">
                  {user.firstName} {user.lastName}
                </h1>

                <div className="flex items-center gap-3 mb-3">
                  <Badge className={roleBadgeColor}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>

                  <Badge
                    variant={user.isVerified ? "default" : "secondary"}
                    className="gap-1"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    {user.isVerified ? "Verified" : "Not Verified"}
                  </Badge>

                  {user.subscriptionTier && (
                    <Badge variant="outline">{user.subscriptionTier}</Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Logout */}
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </div>

          {/* Information Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* LEFT COLUMN */}
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{user.email}</p>
                </div>
              </div>

              {/* Company */}
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{user.company?.name || "No company"}</p>
                </div>
              </div>

              {/* Company Code */}
              {user.company?.companyCode && (
                <div className="flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company Code</p>
                    <p className="font-medium">{user.company.companyCode}</p>
                  </div>
                </div>
              )}

              {/* Company Size */}
              {user.company?.size && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Company Size</p>
                    <p className="font-medium">{user.company.size}</p>
                  </div>
                </div>
              )}

              {/* Industry */}
              {user.company?.industry && (
                <div className="flex items-center gap-3">
                  <Award className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Industry</p>
                    <p className="font-medium">{user.company.industry}</p>
                  </div>
                </div>
              )}


            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* Specialization (Assistant / Manager only) */}
              {user.specialization && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Specialization
                  </p>
                  <p className="font-medium capitalize">{user.specialization}</p>
                </div>
              )}

              {/* Experience */}
              {user.experience !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Experience</p>
                  <p className="font-medium">{user.experience} years</p>
                </div>
              )}

              {/* Hourly Rate */}
              {user.hourlyRate !== undefined && (
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Hourly Rate</p>
                    <p className="font-medium">${user.hourlyRate}/hour</p>
                  </div>
                </div>
              )}

              {/* Rating */}
              {user.rating !== undefined && user.rating > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Rating</p>
                  <p className="font-medium">{user.rating} / 5.0</p>
                </div>
              )}
            </div>
          </div>

          {/* Bio */}
          {user.bio && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-2">Bio</p>
              <p className="text-foreground leading-relaxed">{user.bio}</p>
            </div>
          )}

          {/* Skills */}
          {user.skills && user.skills.length > 0 && (
            <div className="mt-6 pt-6 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">Skills</p>
              <div className="flex flex-wrap gap-2">
                {user.skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Account Timestamps */}
          <div className="mt-6 pt-6 border-t border-border grid grid-cols-2 gap-4 text-sm text-muted-foreground">
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
