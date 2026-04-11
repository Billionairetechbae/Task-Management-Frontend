import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Star, Search, UserPlus, Eye, Mail, Briefcase } from "lucide-react";
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api, TeamMember, CompanyMember } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader, LoadingState, EmptyState } from "@/components/dashboard/DashboardComponents";
import { Pagination } from "@/components/dashboard/TaskComponents";
import { cn } from "@/lib/utils";

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
    isVerified: m.isVerified,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const itemsPerPage = 12;
  const { toast } = useToast();

  useEffect(() => { fetchTeam(); }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const response = await api.getCompanyAssistants();
      const members = response.data.members || [];
      const activeMembers = members.filter((m) => m.status !== "removed");
      setTeamMembers(activeMembers.map(mapCompanyMemberToTeamCard));
    } catch (error) {
      console.error("Failed to fetch team members:", error);
      toast({ title: "Error", description: "Failed to load team members", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filtered = teamMembers.filter((tm) => {
    const q = searchTerm.toLowerCase();
    return tm.firstName.toLowerCase().includes(q) || tm.lastName.toLowerCase().includes(q) || (tm.specialization || "").toLowerCase().includes(q);
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedMembers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchTerm]);

  if (loading) {
    return <DashboardLayout><LoadingState message="Loading team members..." /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={150}>
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title="Team Directory"
            description="Browse and connect with available team members"
            actions={
              <div className="flex items-center gap-2">
                <div className="flex border border-border rounded-md overflow-hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => setViewMode("table")} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === "table" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
                        Table
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Table View</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => setViewMode("grid")} className={cn("px-3 py-1.5 text-xs font-medium transition-colors", viewMode === "grid" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted")}>
                        Cards
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Card View</TooltipContent>
                  </Tooltip>
                </div>
              </div>
            }
          />

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by name or specialization..." className="pl-9 h-9" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          {filtered.length === 0 ? (
            <div className="bg-card rounded-xl border border-border p-12">
              <EmptyState icon={UserPlus} title="No team members found" description="No team members match your search criteria" />
            </div>
          ) : viewMode === "table" ? (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-[280px]">Member</TableHead>
                    <TableHead>Specialization</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Availability</TableHead>
                    <TableHead>Skills</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedMembers.map((tm) => (
                    <TableRow key={tm.id} className="group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                              {tm.firstName.charAt(0)}{tm.lastName.charAt(0)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium text-sm truncate">{tm.firstName} {tm.lastName}</p>
                            <p className="text-xs text-muted-foreground truncate">{tm.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[10px] capitalize">{tm.specialization}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Star className={cn("w-3.5 h-3.5", tm.rating > 0 ? "fill-amber-400 text-amber-400" : "text-muted")} />
                          <span className="text-sm font-medium">{tm.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-semibold">${tm.hourlyRate}/hr</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", tm.isAvailable ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
                          {tm.isAvailable ? "Available" : "Busy"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1 flex-wrap max-w-[160px]">
                          {tm.skills.slice(0, 2).map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-[9px] h-5">{skill}</Badge>
                          ))}
                          {tm.skills.length > 2 && <Badge variant="secondary" className="text-[9px] h-5">+{tm.skills.length - 2}</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled={!tm.isAvailable}>
                              {tm.isAvailable ? "Hire" : "Busy"}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>{tm.isAvailable ? "Hire this member" : "Currently unavailable"}</TooltipContent>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="px-4 pb-4">
                <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} startIndex={(currentPage - 1) * itemsPerPage} endIndex={Math.min(currentPage * itemsPerPage, filtered.length)} onPageChange={setCurrentPage} />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {paginatedMembers.map((tm) => (
                  <div key={tm.id} className="bg-card rounded-xl border border-border p-5 hover:shadow-sm transition-shadow group">
                    <div className="flex items-start gap-3 mb-3">
                      <Avatar className="w-11 h-11">
                        <AvatarFallback className="text-sm font-bold bg-primary/10 text-primary">
                          {tm.firstName.charAt(0)}{tm.lastName.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{tm.firstName} {tm.lastName}</h3>
                        <p className="text-xs text-muted-foreground capitalize">{tm.specialization} Specialist</p>
                        <div className="flex items-center gap-1 mt-1">
                          {[1, 2, 3, 4, 5].map(star => (
                            <Star key={star} className={cn("w-3 h-3", star <= tm.rating ? "fill-amber-400 text-amber-400" : "text-muted")} />
                          ))}
                          <span className="text-[10px] text-muted-foreground ml-0.5">({tm.rating.toFixed(1)})</span>
                        </div>
                      </div>
                      <Badge variant="outline" className={cn("text-[10px] shrink-0", tm.isAvailable ? "bg-success/10 text-success border-success/20" : "bg-destructive/10 text-destructive border-destructive/20")}>
                        {tm.isAvailable ? "Available" : "Busy"}
                      </Badge>
                    </div>
                    {tm.bio && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{tm.bio}</p>}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {tm.skills.slice(0, 3).map((skill, i) => (
                        <Badge key={i} variant="secondary" className="text-[9px]">{skill}</Badge>
                      ))}
                      {tm.skills.length > 3 && <Badge variant="secondary" className="text-[9px]">+{tm.skills.length - 3}</Badge>}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <p className="text-[10px] text-muted-foreground">Hourly Rate</p>
                        <p className="font-bold text-base">${tm.hourlyRate}/hr</p>
                      </div>
                      <Button size="sm" className="h-8 text-xs" disabled={!tm.isAvailable}>
                        {tm.isAvailable ? "Hire Now" : "Not Available"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
              <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={filtered.length} startIndex={(currentPage - 1) * itemsPerPage} endIndex={Math.min(currentPage * itemsPerPage, filtered.length)} onPageChange={setCurrentPage} />
            </>
          )}
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default TeamMembers;
