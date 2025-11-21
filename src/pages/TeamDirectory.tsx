import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Users, User, ShieldCheck, Briefcase, Mail } from "lucide-react";

import { api, User as AppUser } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const TeamDirectory = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<AppUser[]>([]);

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);

      const res = await api.getCompanyTeam();
      setTeam(res.data.team);

    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load team members",
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
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" /> Profile
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="px-6 py-8">

        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Company Directory</h1>
          <p className="text-muted-foreground">
            View executives, managers, and assistants in your company.
          </p>
        </div>

        {/* Loading */}
        {loading && (
          <p className="text-center text-muted-foreground">Loading team members...</p>
        )}

        {/* Team Grid */}
        {!loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {team.map((member) => (
              <Link
                key={member.id}
                to={`/team-member/${member.id}`}
                className="bg-card border border-border rounded-xl shadow-sm p-6 hover:shadow-md transition cursor-pointer"
              >
                <div className="flex flex-col items-center text-center">

                  {/* Profile Picture */}
                  {member.profilePictureUrl ? (
                    <img
                      src={member.profilePictureUrl}
                      alt="Profile"
                      className="w-20 h-20 rounded-full object-cover mb-4"
                    />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-4">
                      {member.firstName.charAt(0)}
                    </div>
                  )}

                  <h3 className="text-lg font-semibold">
                    {member.firstName} {member.lastName}
                  </h3>

                  {/* Role Badge */}
                  <Badge className={`mt-2 ${getRoleColor(member.role)}`}>
                    {member.role.toUpperCase()}
                  </Badge>

                  {/* Specialization for assistants/managers */}
                  {member.specialization && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {member.specialization}
                    </p>
                  )}

                  {/* Email */}
                  <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {member.email}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamDirectory;
