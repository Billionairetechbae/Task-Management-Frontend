import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Users, Mail, Search } from "lucide-react";

import { api, CompanyMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const TeamDirectory = () => {
  const { user, activeWorkspace } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<CompanyMember[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "executive" | "manager" | "team_member"
  >("all");

  useEffect(() => {
    loadTeam();
  }, [activeWorkspace?.id]);

  const loadTeam = async () => {
    try {
      setLoading(true);

      const res = await api.getCompanyTeam();
      const data: any = res.data || {};

      let members: CompanyMember[] = [];

      if (Array.isArray(data.members)) {
        members = data.members as CompanyMember[];
      } else if (Array.isArray(data.team)) {
        // legacy shape fallback
        members = (data.team as any[]).map((legacyUser) => {
          const role =
            legacyUser.role === "executive"
              ? "owner"
              : legacyUser.role === "manager"
              ? "manager"
              : "member";

          const status =
            legacyUser.invitationStatus === "removed" ? "removed" : "active";

          const isVerified =
            typeof legacyUser.isVerified === "boolean" ? legacyUser.isVerified : true;

          return {
            id: legacyUser.companyMemberId, // membership id
            userId: legacyUser.id, // ✅ user id
            companyId: legacyUser.companyId ?? null,
            role,
            status,
            isVerified,
            user: legacyUser,
            company: legacyUser.company,
          } as CompanyMember;
        });
      }

      setTeam(members);
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
      case "team_member":
        return "bg-green-100 text-green-800";
      case "admin":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      // hide removed/inactive
      if (
        member.status === "removed" ||
        member.user?.isActive === false ||
        member.user?.invitationStatus === "removed"
      ) {
        return false;
      }

      if (roleFilter !== "all" && member.user?.role !== roleFilter) return false;

      if (search.trim()) {
        const q = search.toLowerCase();
        const first = member.user?.firstName?.toLowerCase() || "";
        const last = member.user?.lastName?.toLowerCase() || "";
        const email = member.user?.email?.toLowerCase() || "";
        if (!first.includes(q) && !last.includes(q) && !email.includes(q)) return false;
      }

      return true;
    });
  }, [team, roleFilter, search]);

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <div className="mb-6 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-1">Company Directory</h1>
            <p className="text-muted-foreground">
              Browse executives, managers, and team members in{" "}
              <span className="font-semibold">
                {activeWorkspace?.name || "your company"}
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
              { key: "team_member", label: "Team Members" },
            ].map((r) => (
              <button
                key={r.key}
                onClick={() => setRoleFilter(r.key as any)}
                className={`px-3 py-1.5 text-sm font-medium rounded-t-md md:rounded-full transition ${
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

        {/* Loading */}
        {loading && (
          <div className="text-center text-muted-foreground py-12">
            Loading team members...
          </div>
        )}

        {/* Empty */}
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
                // ✅ best key is userId (stable)
                key={member.userId}
                // ✅ FIX: use userId in the route
                to={`/team-member/${member.userId}`}
                className="bg-card border border-border rounded-xl shadow-sm p-5 hover:shadow-md hover:border-primary/50 transition cursor-pointer flex flex-col items-center text-center"
              >
                {/* Avatar */}
                {member.user?.profilePictureUrl ? (
                  <img
                    src={member.user.profilePictureUrl}
                    alt="Profile"
                    className="w-28 h-28 rounded-full object-cover mb-4 border shadow-sm"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary mb-4 border shadow-sm">
                    {(member.user?.firstName?.charAt(0) || "?") +
                      (member.user?.lastName?.charAt(0) || "?")}
                  </div>
                )}

                {/* Name */}
                <h3 className="text-xl font-semibold">
                  {member.user?.firstName} {member.user?.lastName}
                </h3>

                {/* Role Badge */}
                <Badge className={`mt-2 ${getRoleColor(member.user?.role || "")}`}>
                  {member.user?.role
                    ? member.user.role.charAt(0).toUpperCase() + member.user.role.slice(1)
                    : "Member"}
                </Badge>

                {/* Specialization */}
                {member.user?.specialization && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {member.user.specialization}
                  </p>
                )}

                {/* Email */}
                <p className="text-xs text-muted-foreground mt-3 flex items-center justify-center gap-1">
                  <Mail className="w-3 h-3" />
                  {member.user?.email}
                </p>

                {/* Joined */}
                <p className="text-[11px] text-muted-foreground mt-2">
                  Joined{" "}
                  {member.user?.createdAt
                    ? new Date(member.user.createdAt).toLocaleDateString()
                    : "—"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default TeamDirectory;
