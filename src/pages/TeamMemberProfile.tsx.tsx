// src/pages/TeamMemberProfile.tsx
import { useParams, Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { api, User } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
} from "lucide-react";

const TeamMemberProfile = () => {
  const { id } = useParams();
  const { toast } = useToast();

  const [member, setMember] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMember();
  }, []);

  const loadMember = async () => {
    try {
      setLoading(true);
      const res = await api.getUserById(id!);
      setMember(res.data.user);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "executive":
        return "bg-purple-100 text-purple-800";
      case "manager":
        return "bg-blue-100 text-blue-800";
      case "assistant":
        return "bg-green-100 text-green-800";
      case "admin":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading || !member) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card px-6 py-4 flex items-center justify-between">
        <Logo className="h-8" />
        <Button variant="outline" asChild>
          <Link to="/profile">
            <UserIcon className="w-5 h-5 mr-2" /> My Profile
          </Link>
        </Button>
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
            {member.profilePictureUrl ? (
              <img
                src={member.profilePictureUrl}
                alt="Profile"
                className="w-32 h-32 rounded-full object-cover border mb-4"
              />
            ) : (
              <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center border text-4xl font-bold text-primary mb-4">
                {member.firstName[0]}
                {member.lastName[0]}
              </div>
            )}

            <h2 className="text-3xl font-bold mb-2">
              {member.firstName} {member.lastName}
            </h2>

            <Badge className={`${getRoleColor(member.role)} text-sm`}>
              {member.role.toUpperCase()}
            </Badge>

            {/* Verification */}
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
                  <p className="font-medium">{member.email}</p>
                </div>
              </div>

              {member.company && (
                <>
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Company</p>
                      <p className="font-medium">{member.company.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Award className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Industry</p>
                      <p className="font-medium">{member.company.industry}</p>
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="font-medium">
                    {new Date(member.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Column 2 */}
            <div className="space-y-4">
              {member.specialization && (
                <div className="flex items-center gap-3">
                  <Briefcase className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Specialization</p>
                    <p className="font-medium capitalize">{member.specialization}</p>
                  </div>
                </div>
              )}

              {member.experience !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Experience</p>
                  <p className="font-medium">{member.experience} years</p>
                </div>
              )}

              {member.hourlyRate !== null && (
                <div>
                  <p className="text-sm text-muted-foreground">Hourly Rate</p>
                  <p className="font-medium">${member.hourlyRate}/hour</p>
                </div>
              )}

              {member.rating && member.rating > 0 && (
                <div className="flex items-center gap-1">
                  <Star className="w-5 h-5 text-yellow-500" />
                  <p className="font-medium">{member.rating} / 5.0</p>
                </div>
              )}
            </div>
          </div>

          {/* BIO */}
          {member.bio && (
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-2">About</h3>
              <p className="text-muted-foreground leading-relaxed">{member.bio}</p>
            </div>
          )}

          {/* SKILLS */}
          {member.skills && member.skills.length > 0 && (
            <div className="mt-10">
              <h3 className="text-xl font-bold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {member.skills.map((skill) => (
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
          <div className="mt-10 flex justify-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/team-directory">Back to Directory</Link>
            </Button>
            <Button asChild>
              {/* <Link to={`/tasks?assigneeId=${member.id}`}>
                View Tasks Assigned
              </Link> */}
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeamMemberProfile;
