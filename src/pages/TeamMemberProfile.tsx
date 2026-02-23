// src/pages/TeamMemberProfile.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";

import { api, CompanyMember } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Mail,
  User as UserIcon,
  Users,
  Briefcase,
  Building2,
  Award,
  Clock,
  Star,
  ShieldCheck,
  Trash2,
  RotateCcw,
} from "lucide-react";

type ConfirmAction = "remove" | "restore" | null;

const TeamMemberProfile = () => {
  // NOTE: this is USER ID now
  const { id: userId } = useParams();

  const { toast } = useToast();
  const { user: currentUser, workspaceRole } = useAuth();

  const [member, setMember] = useState<CompanyMember | null>(null);
  const [loading, setLoading] = useState(true);

  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadMember();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadMember = async () => {
    if (!userId) return;

    try {
      setLoading(true);

      // Pull from workspace membership (correct source of truth for status/verification)
      const m = await api.getWorkspaceMemberByUserId(userId);
      setMember(m);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load team member.",
        variant: "destructive",
      });
      setMember(null);
    } finally {
      setLoading(false);
    }
  };

  const isWorkspaceManager =
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager";

  const isGlobalAdmin = currentUser?.role === "admin";

  const canModify =
    (isWorkspaceManager || isGlobalAdmin) &&
    member &&
    member.user.role !== "executive" &&
    currentUser?.id !== member.userId;

  // IMPORTANT: removed status comes from CompanyMember.status
  const isRemoved = member?.status === "removed";

  const getRoleColor = (role: string) => {
    switch (role) {
      case "executive":
        return "bg-purple-100 text-purple-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "team_member":
        return "bg-green-100 text-green-800";
      case "admin":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const openConfirm = (action: ConfirmAction) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!member || !confirmAction) return;

    try {
      setActionLoading(true);

      if (confirmAction === "remove") {
        await api.removeTeamMember(member.userId);
        toast({
          title: "User removed",
          description: `${member.user.firstName} has been deactivated.`,
        });
      }

      if (confirmAction === "restore") {
        await api.restoreTeamMember(member.userId);
        toast({
          title: "User restored",
          description: `${member.user.firstName} has been reactivated.`,
        });
      }

      await loadMember();
      setConfirmOpen(false);
      setConfirmAction(null);
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  const u = member.user;

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <Logo className="h-8" />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/team-directory">
              <Users className="w-5 h-5 mr-2" /> Team Directory
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/profile">
              <UserIcon className="w-5 h-5 mr-2" /> My Profile
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10">
        {/* Back Button */}
        <Button variant="ghost" asChild className="mb-6">
          <Link to="/team-directory">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Directory
          </Link>
        </Button>

        {/* PROFILE CARD */}
        <div className="bg-card border border-border rounded-2xl p-8">
          {/* TOP SECTION */}
          <div className="flex flex-col items-center text-center mb-8">
            {u.profilePictureUrl ? (
              <img
                src={u.profilePictureUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border mb-4"
              />
            ) : (
              <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center border text-4xl font-bold text-primary mb-4">
                {(u.firstName?.[0] || "").toUpperCase()}
                {(u.lastName?.[0] || "").toUpperCase()}
              </div>
            )}

            <h2 className="text-3xl font-bold mb-2">
              {u.firstName} {u.lastName}
            </h2>

            <div className="flex flex-wrap items-center gap-2 justify-center mb-2">
              <Badge className={`${getRoleColor(u.role)} text-sm`}>
                {u.role.toUpperCase()}
              </Badge>

              {isRemoved ? (
                <Badge
                  variant="outline"
                  className="border-destructive/50 text-destructive"
                >
                  Removed / Inactive
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="border-emerald-500/40 text-emerald-500"
                >
                  Active
                </Badge>
              )}
            </div>

            {/* Verification (use membership) */}
            <p className="text-xs mt-2 flex items-center gap-1 text-muted-foreground">
              <ShieldCheck className="w-4 h-4" />
              {member.isVerified ? "Verified Account" : "Not Verified"}
            </p>
          </div>

          {/* BASIC DETAILS */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Column 1 */}
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">{u.email}</p>
                </div>
              </div>

              {(u.company || member.company) && (
                <>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium">
                        {(u.company || member.company)?.name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">
                        {(u.company || member.company)?.industry || "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              {(u.specialization || "").trim() && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Specialization</p>
                    <p className="font-medium capitalize">{u.specialization}</p>
                  </div>
                </div>
              )}

              {u.experience !== null && u.experience !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="font-medium">{u.experience} years</p>
                </div>
              )}

              {u.hourlyRate !== null && u.hourlyRate !== undefined && (
                <div>
                  <p className="text-sm text-muted-foreground">Hourly Rate</p>
                  <p className="font-medium">${u.hourlyRate}/hour</p>
                </div>
              )}

              {typeof u.rating === "number" && u.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <p className="font-medium">{u.rating} / 5.0</p>
                </div>
              )}
            </div>
          </div>

          {/* BIO */}
          {u.bio && (
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-2">About</h3>
              <p className="text-muted-foreground leading-relaxed">{u.bio}</p>
            </div>
          )}

          {/* SKILLS */}
          {u.skills && u.skills.length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {u.skills.map((skill) => (
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

          {/* BUTTONS */}
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/team-directory">Back to Directory</Link>
            </Button>

            {canModify && !isRemoved && (
              <Button
                variant="destructive"
                className="gap-2"
                onClick={() => openConfirm("remove")}
              >
                <Trash2 className="w-4 h-4" />
                Remove From Company
              </Button>
            )}

            {canModify && isRemoved && (
              <Button
                variant="outline"
                className="gap-2"
                onClick={() => openConfirm("restore")}
              >
                <RotateCcw className="w-4 h-4" />
                Restore Account
              </Button>
            )}
          </div>
        </div>
      </main>

      {/* CONFIRMATION MODAL */}
      {confirmOpen && confirmAction && member && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">
              {confirmAction === "remove"
                ? "Remove team member?"
                : "Restore team member?"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {confirmAction === "remove" ? (
                <>
                  This will deactivate <strong>{u.firstName}</strong>’s account.
                  They won’t be able to log in again unless restored. Historical
                  data will be preserved.
                </>
              ) : (
                <>
                  This will reactivate <strong>{u.firstName}</strong>’s account
                  and allow them to log in again.
                </>
              )}
            </p>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (!actionLoading) {
                    setConfirmOpen(false);
                    setConfirmAction(null);
                  }
                }}
              >
                Cancel
              </Button>
              <Button
                variant={confirmAction === "remove" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Please wait..."
                  : confirmAction === "remove"
                  ? "Remove"
                  : "Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamMemberProfile;