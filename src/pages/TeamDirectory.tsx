// src/pages/TeamDirectory.tsx
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, User, Mail, Search } from "lucide-react";

import { api, User as AppUser } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

const TeamDirectory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<AppUser[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "executive" | "manager" | "assistant">(
    "all"
  );

  useEffect(() => {
    loadTeam();
  }, []);

  const loadTeam = async () => {
    try {
      setLoading(true);
      const res = await api.getCompanyTeam();
      setTeam(res.data.team || []);
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
      case "admin":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getDashboardRoute = () => {
    switch (user?.role) {
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

  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      if (roleFilter !== "all" && member.role !== roleFilter) return false;

      if (!search.trim()) return true;

      const q = search.toLowerCase();
      return (
        member.firstName.toLowerCase().includes(q) ||
        member.lastName.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q)
      );
    });
  }, [team, roleFilter, search]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate(getDashboardRoute())}
            >
              <Users className="w-4 h-4" />
              Back to Dashboard
            </Button>

            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" /> Profile
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <main className="px-6 py-8 max-w-6xl mx-auto">
        {/* Heading */}
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Company Directory</h1>
            <p className="text-muted-foreground">
              Browse all executives, managers, and assistants in{" "}
              <span className="font-semibold">
                {user?.company?.name || "your company"}
              </span>
              .
            </p>
          </div>
        </div>

        {/* Filters + Search */}
        <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Role filter */}
          <div className="flex gap-2 border-b border-border md:border-none">
            {[
              { key: "all", label: "All" },
              { key: "executive", label: "Executives" },
              { key: "manager", label: "Managers" },
              { key: "assistant", label: "Assistants" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setRoleFilter(r.key as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-md md:rounded-full ${
                  roleFilter === r.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or email..."
              className="pl-9"
            />
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="text-center text-muted-foreground py-12">
            Loading team members...
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredTeam.length === 0 && (
          <div className="bg-card border border-border rounded-xl p-10 text-center">
            <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
            <h2 className="text-lg font-semibold mb-1">No team members found</h2>
            <p className="text-muted-foreground text-sm">
              Try adjusting your filters or search term.
            </p>
          </div>
        )}

        {/* Team Grid */}
        {!loading && filteredTeam.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTeam.map((member) => (
              <Link
                key={member.id}
                to={`/team-member/${member.id}`}
                className="bg-card border border-border rounded-xl shadow-sm p-3 hover:shadow-md hover:border-primary/50 transition cursor-pointer flex flex-col items-center text-center"
              >
                {/* Avatar */}
                {member.profilePictureUrl ? (
                  <img
                    src={member.profilePictureUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-full object-cover mb-4 border"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-4 border">
                    {member.firstName.charAt(0)}
                    {member.lastName.charAt(0)}
                  </div>
                )}

                {/* Name */}
                <h3 className="text-lg font-semibold">
                  {member.firstName} {member.lastName}
                </h3>

                {/* Role */}
                <Badge className={`mt-2 ${getRoleColor(member.role)}`}>
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </Badge>

                {/* Specialization (if assistant/manager) */}
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

                {/* Joined date */}
                <p className="text-[11px] text-muted-foreground mt-2">
                  Joined{" "}
                  {member.createdAt
                    ? new Date(member.createdAt).toLocaleDateString()
                    : "—"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamDirectory;
