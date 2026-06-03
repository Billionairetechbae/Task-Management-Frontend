import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Mail, Search, X, ArrowUpRight, Briefcase, CalendarDays, ShieldCheck } from "lucide-react";

import { api, CompanyMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { cn } from "@/lib/utils";

const TeamDirectory = () => {
  const { activeWorkspace } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [team, setTeam] = useState<CompanyMember[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "executive" | "manager" | "team_member"
  >("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
        members = (data.team as any[]).map((u) => ({
          id: u.companyMemberId,
          userId: u.id,
          companyId: u.companyId ?? null,
          role: u.role === "executive" ? "owner" : u.role === "manager" ? "manager" : "member",
          status: u.invitationStatus === "removed" ? "removed" : "active",
          isVerified: typeof u.isVerified === "boolean" ? u.isVerified : true,
          user: u,
          company: u.company,
        } as CompanyMember));
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
      case "owner":
        return "bg-primary/15 text-primary border-primary/30";
      case "admin":
        return "bg-destructive/10 text-destructive border-destructive/30";
      case "manager":
        return "bg-info/15 text-info border-info/30";
      case "member":
        return "bg-success/15 text-success border-success/30";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getRoleLabel = (role: string) =>
    role === "owner" ? "Owner" :
    role === "admin" ? "Admin" :
    role === "manager" ? "Manager" :
    role === "member" ? "Member" : "Member";

  const filteredTeam = useMemo(() => {
    return team.filter((member) => {
      if (
        member.status === "removed" ||
        member.user?.isActive === false ||
        member.user?.invitationStatus === "removed"
      ) return false;

      if (roleFilter !== "all") {
        const r = member.role;
        if (roleFilter === "executive" && r !== "owner") return false;
        if (roleFilter === "manager" && r !== "manager") return false;
        if (roleFilter === "team_member" && r !== "member") return false;
      }

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

  const selected = useMemo(
    () => filteredTeam.find((m) => m.userId === selectedId) || null,
    [filteredTeam, selectedId]
  );

  return (
    <DashboardLayout>
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between animate-fade-in">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1">Company Directory</h1>
          <p className="text-sm text-muted-foreground">
            Browse executives, managers, and team members in{" "}
            <span className="font-semibold text-foreground">
              {activeWorkspace?.name || "your workspace"}
            </span>.
          </p>
        </div>
      </div>

      {/* Filters + Search */}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1.5 overflow-x-auto">
          {[
            { key: "all", label: "All" },
            { key: "executive", label: "Executives" },
            { key: "manager", label: "Managers" },
            { key: "team_member", label: "Members" },
          ].map((r) => (
            <button
              key={r.key}
              onClick={() => setRoleFilter(r.key as any)}
              className={cn(
                "shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-all duration-200",
                roleFilter === r.key
                  ? "bg-primary text-primary-foreground shadow-sm scale-105"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {r.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-9 h-9"
          />
        </div>
      </div>

      {loading && (
        <div className="text-center text-muted-foreground py-12">Loading team members...</div>
      )}

      {!loading && filteredTeam.length === 0 && (
        <div className="bg-card border border-border rounded-xl p-10 text-center animate-fade-in">
          <Users className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
          <h2 className="text-lg font-semibold mb-1">No team members found</h2>
          <p className="text-muted-foreground text-sm">Try adjusting your filters or search term.</p>
        </div>
      )}

      {!loading && filteredTeam.length > 0 && (
        <div
          className={cn(
            "grid gap-4 transition-all duration-300",
            selected ? "lg:grid-cols-[1fr_420px]" : "grid-cols-1"
          )}
        >
          {/* Grid of compact cards */}
          <div
            className={cn(
              "grid gap-3 content-start",
              selected
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
            )}
          >
            {filteredTeam.map((member) => {
              const active = member.userId === selectedId;
              return (
                <button
                  key={member.userId}
                  onClick={() => setSelectedId(member.userId)}
                  className={cn(
                    "group text-left bg-card border rounded-xl p-3 transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40",
                    active
                      ? "border-primary ring-2 ring-primary/20 shadow-md"
                      : "border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    {member.user?.profilePictureUrl ? (
                      <img
                        src={member.user.profilePictureUrl}
                        alt=""
                        className="w-11 h-11 rounded-full object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center text-sm font-bold text-primary border border-primary/20 shrink-0">
                        {(member.user?.firstName?.[0] || "?") + (member.user?.lastName?.[0] || "")}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold truncate">
                        {member.user?.firstName} {member.user?.lastName}
                      </p>
                      <Badge
                        variant="outline"
                        className={cn("mt-0.5 text-[10px] px-1.5 py-0 h-4", getRoleColor(member.role || ""))}
                      >
                        {getRoleLabel(member.role || "")}
                      </Badge>
                    </div>
                  </div>

                  {member.user?.email && (
                    <p className="mt-2 text-[11px] text-muted-foreground truncate flex items-center gap-1">
                      <Mail className="w-3 h-3 shrink-0" />
                      {member.user.email}
                    </p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Slide-in details panel */}
          {selected && (
            <aside
              key={selected.userId}
              className="bg-card border border-border rounded-2xl shadow-lg overflow-hidden animate-slide-in-right lg:sticky lg:top-4 self-start max-h-[calc(100vh-100px)] flex flex-col"
            >
              <div className="relative bg-gradient-to-br from-primary/15 via-primary/5 to-accent/10 px-5 pt-5 pb-12">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7"
                  onClick={() => setSelectedId(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
                <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                  Member Profile
                </p>
              </div>

              <div className="px-5 -mt-10 flex flex-col items-center pb-5 overflow-y-auto">
                {selected.user?.profilePictureUrl ? (
                  <img
                    src={selected.user.profilePictureUrl}
                    alt=""
                    className="w-20 h-20 rounded-full object-cover border-4 border-card shadow-md"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-2xl font-bold text-primary-foreground border-4 border-card shadow-md">
                    {(selected.user?.firstName?.[0] || "?") + (selected.user?.lastName?.[0] || "")}
                  </div>
                )}

                <h2 className="mt-3 text-xl font-bold text-center">
                  {selected.user?.firstName} {selected.user?.lastName}
                </h2>

                <Badge
                  variant="outline"
                  className={cn("mt-1.5", getRoleColor(selected.role || ""))}
                >
                  <ShieldCheck className="w-3 h-3 mr-1" />
                  {getRoleLabel(selected.role || "")}
                </Badge>

                {selected.user?.specialization && (
                  <p className="mt-2 text-sm text-muted-foreground text-center">
                    {selected.user.specialization}
                  </p>
                )}

                <div className="w-full mt-5 space-y-2">
                  <DetailRow icon={Mail} label="Email" value={selected.user?.email || "—"} />
                  {(selected.user as any)?.specialization && (
                    <DetailRow
                      icon={Briefcase}
                      label="Specialization"
                      value={(selected.user as any).specialization}
                    />
                  )}
                  <DetailRow
                    icon={CalendarDays}
                    label="Joined"
                    value={selected.user?.createdAt
                      ? new Date(selected.user.createdAt).toLocaleDateString(undefined, {
                          year: "numeric", month: "long", day: "numeric"
                        })
                      : "—"}
                  />
                </div>

                <Button
                  className="mt-5 w-full gap-2"
                  onClick={() => navigate(`/team-member/${selected.userId}`)}
                >
                  View Full Profile
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </aside>
          )}
        </div>
      )}
    </DashboardLayout>
  );
};

const DetailRow = ({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) => (
  <div className="flex items-start gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted/60 transition-colors">
    <div className="w-7 h-7 rounded-md bg-card border border-border flex items-center justify-center shrink-0">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground break-words">{value}</p>
    </div>
  </div>
);

export default TeamDirectory;
