import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Star, Search, UserPlus } from "lucide-react";
import { useState, useEffect } from "react";
import { api, TeamMember } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  PageHeader,
  ContentCard,
  LoadingState,
  EmptyState,
} from "@/components/dashboard/DashboardComponents";

const TeamMembers = () => {
  const [team_members, setAssistants] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAssistants();
  }, []);

  const fetchAssistants = async () => {
    try {
      setLoading(true);
      const response = await api.getTeamMembers();
      setAssistants(response.data.team_members);
    } catch (error) {
      console.error('Failed to fetch team_members:', error);
      toast({
        title: "Error",
        description: "Failed to load team_members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredAssistants = team_members.filter(
    (team_member) =>
      team_member.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team_member.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      team_member.specialization.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading team_members..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Browse TeamMembers"
        description="Find the perfect team_member for your tasks"
      />

      {/* Search */}
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

      {filteredAssistants.length === 0 ? (
        <ContentCard>
          <EmptyState
            icon={UserPlus}
            title="No team_members found"
            description="No team_members match your search criteria"
          />
        </ContentCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredAssistants.map((team_member) => (
            <ContentCard key={team_member.id} className="p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-primary font-bold text-lg">
                    {team_member.firstName.charAt(0)}
                    {team_member.lastName.charAt(0)}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base truncate">
                    {team_member.firstName} {team_member.lastName}
                  </h3>
                  <p className="text-sm text-muted-foreground capitalize">
                    {team_member.specialization} Specialist
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3.5 h-3.5 ${
                          star <= team_member.rating
                            ? "fill-amber-400 text-amber-400"
                            : "text-muted"
                        }`}
                      />
                    ))}
                    <span className="text-xs text-muted-foreground ml-1">
                      ({team_member.rating.toFixed(1)})
                    </span>
                  </div>
                </div>
                <Badge
                  variant="secondary"
                  className={
                    team_member.isAvailable
                      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      : "bg-destructive/10 text-destructive border-destructive/20"
                  }
                >
                  {team_member.isAvailable ? "Available" : "Busy"}
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {team_member.bio}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {team_member.skills.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {team_member.skills.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{team_member.skills.length - 3}
                  </Badge>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Hourly Rate</p>
                  <p className="font-bold text-lg">${team_member.hourlyRate}/hr</p>
                </div>
                <Button size="sm" disabled={!team_member.isAvailable}>
                  {team_member.isAvailable ? "Hire Now" : "Not Available"}
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
