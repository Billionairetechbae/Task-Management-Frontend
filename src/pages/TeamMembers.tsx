import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Search, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { api, TeamMember, CompanyMember } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  PageHeader,
  ContentCard,
  LoadingState,
  EmptyState,
} from "@/components/dashboard/DashboardComponents";

const mapCompanyMemberToTeamCard = (m: CompanyMember): TeamMember => {
  const u = m.user;

  return {
    id: u.id,
    firstName: u.firstName || "",
    lastName: u.lastName || "",
    email: u.email || "",
    company: u.company?.name || "",
    role: u.role || "",
    subscriptionTier: u.subscriptionTier || "free",
    isVerified: m.isVerified, // IMPORTANT: membership verification
    isActive: m.status !== "removed",
    specialization: (u.specialization || "general") as string,
    experience: Number(u.experience || 0),
    hourlyRate: Number(u.hourlyRate || 0),
    bio: u.bio || "",
    skills: Array.isArray(u.skills) ? u.skills : [],
    isAvailable: Boolean(u.isAvailable),
    rating: Number(u.rating || 0),
    invitationStatus: u.invitationStatus,
    createdAt: u.createdAt,
  };
};

const TeamMembers = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await api.getCompanyAssistants();
      const members = response.data.members || [];

      // keep only active members (optional)
      const activeMembers = members.filter((m) => m.status !== "removed");

      setTeamMembers(activeMembers.map(mapCompanyMemberToTeamCard));
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      toast({
        title: "Error",
        description: "Failed to load team members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filtered = teamMembers.filter((tm) => {
    const q = searchTerm.toLowerCase();
    return (
      tm.firstName.toLowerCase().includes(q) ||
      tm.lastName.toLowerCase().includes(q) ||
      (tm.specialization || "").toLowerCase().includes(q)
    );
  });

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading team members..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Browse Team Members"
        description="Browse available team members in this workspace"
      />

      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Search by name or specialization..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={UserPlus}
            title="No team members found"
            description="No team members match your search criteria"
          />
        </ContentCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filtered.map((tm) => (
            <ContentCard key={tm.id} className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-lg">
                    {tm.firstName.charAt(0)}
                    {tm.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {tm.firstName} {tm.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {tm.specialization} Specialist
                  </p>

                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= tm.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({tm.rating.toFixed(1)})
                    </span>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className={
                    tm.isAvailable
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {tm.isAvailable ? "Available" : "Busy"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {tm.bio}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {tm.skills.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {tm.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{tm.skills.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Hourly Rate</p>
                  <p className="font-bold text-lg">${tm.hourlyRate}/hr</p>
                </div>
                <Button size="sm" disabled={!tm.isAvailable}>
                  {tm.isAvailable ? "Hire Now" : "Not Available"}
                </Button>
              </div>
            </ContentCard>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeamMembers;