import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  User, Users, Search, Filter, CheckCircle2, Clock, X, Mail, Trash2,
  RotateCcw, Activity, Shield, ChevronDown, Eye, UserPlus, MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectTrigger, SelectItem, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, CompanyMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { canAdminWorkspace, canManageWorkspace } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import InviteUserDialog from "@/components/InviteUserDialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { PageHeader, LoadingState } from "@/components/dashboard/DashboardComponents";
import { Pagination } from "@/components/dashboard/TaskComponents";
import { cn } from "@/lib/utils";

type Tab = "active" | "removed";
type ActivityEvent = { id: string; type: "removed" | "restored"; userName: string; role: string; at: string };

const TeamManagement = () => {
  const { user, workspaceRole, activeCompanyId } = useAuth();
  const { toast } = useToast();
  const globalRole = user?.role ?? null;
  const canManageTeam = canManageWorkspace(workspaceRole, globalRole);
  const canAdminTeam = canAdminWorkspace(workspaceRole, globalRole);
  const [invitePermissionMode, setInvitePermissionMode] = useState<"restricted" | "free">("restricted");
  const canInviteTeam =
    invitePermissionMode === "free" ? !!workspaceRole || user?.role === "admin" : canManageTeam;

  const [teamMembers, setTeamMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<Tab>("active");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"remove" | "restore" | null>(null);
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const loadTeam = async () => {
    try {
      setLoading(true);
      if (!canManageTeam) { setTeamMembers([]); return; }
      const res = await api.getCompanyAssistants();
      setTeamMembers(res.data.members || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Could not load team.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!activeCompanyId) return;
    try {
      const res = await api.getWorkspaceSettings(activeCompanyId);
      setInvitePermissionMode(res.data.invitePermissionMode || "restricted");
    } catch {
      setInvitePermissionMode("restricted");
    }
  };

  useEffect(() => { loadTeam(); }, [canManageTeam, activeCompanyId]);

  const isRemoved = (m: CompanyMember) => m.status === "removed";

  const filtered = teamMembers.filter((m) => {
    const inTab = activeTab === "active" ? !isRemoved(m) : isRemoved(m);
    if (!inTab) return false;
    const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
    const matchesSearch = fullName.includes(searchTerm.toLowerCase()) || m.user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || (statusFilter === "verified" && m.isVerified && !isRemoved(m)) || (statusFilter === "pending" && !m.isVerified && !isRemoved(m));
    const matchesSpecialization = specializationFilter === "all" || (m.user.specialization || "general") === specializationFilter;
    return matchesSearch && matchesStatus && matchesSpecialization;
  });

  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const paginatedMembers = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [activeTab, searchTerm, statusFilter, specializationFilter]);

  const pendingCount = teamMembers.filter((m) => !m.isVerified && !isRemoved(m)).length;
  const verifiedCount = teamMembers.filter((m) => m.isVerified && !isRemoved(m)).length;
  const removedCount = teamMembers.filter((m) => isRemoved(m)).length;

  const getSpecBadgeClass = (spec?: string | null) => {
    const map: Record<string, string> = {
      sales: "bg-blue-500/10 text-blue-600 border-blue-500/20",
      marketing: "bg-purple-500/10 text-purple-600 border-purple-500/20",
      operations: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
      general: "bg-muted text-muted-foreground",
      customer_support: "bg-orange-500/10 text-orange-600 border-orange-500/20",
    };
    return map[spec || "general"] || map.general;
  };

  const pushActivity = (type: "removed" | "restored", target: CompanyMember) => {
    setActivityLog((prev) => [{ id: `${Date.now()}-${target.id}`, type, userName: `${target.user.firstName} ${target.user.lastName}`, role: target.role, at: new Date().toLocaleString() }, ...prev].slice(0, 20));
  };

  const handleVerify = async (userId: string) => {
    try { await api.verifyAssistant(userId); toast({ title: "Team member approved!" }); loadTeam(); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const handleReject = async (userId: string) => {
    try { await api.rejectAssistant(userId); toast({ title: "Team member rejected." }); loadTeam(); } catch (err: any) { toast({ title: "Error", description: err.message, variant: "destructive" }); }
  };

  const openConfirm = (type: "remove" | "restore", member: CompanyMember) => {
    setConfirmType(type); setSelectedMember(member); setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmType || !selectedMember) return;
    try {
      setActionLoading(true);
      if (confirmType === "remove") {
        await api.removeTeamMember(selectedMember.userId);
        toast({ title: "User removed", description: `${selectedMember.user.firstName} ${selectedMember.user.lastName} has been deactivated.` });
        pushActivity("removed", selectedMember);
      }
      if (confirmType === "restore") {
        await api.restoreTeamMember(selectedMember.userId);
        toast({ title: "User restored", description: `${selectedMember.user.firstName} ${selectedMember.user.lastName} is now active again.` });
        pushActivity("restored", selectedMember);
      }
      await loadTeam();
      setConfirmOpen(false); setSelectedMember(null); setConfirmType(null);
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <TooltipProvider delayDuration={150}>
        <div className="max-w-7xl mx-auto space-y-6">
          <PageHeader
            title="Team Management"
            description="Manage team members, approvals, and access control"
            actions={
              canAdminTeam ? (
                <Button className="gap-2" onClick={() => setInviteOpen(true)}>
                  <UserPlus className="w-4 h-4" /> Invite Member
                </Button>
              ) : undefined
            }
          />

          {/* Stats row */}
          {canManageTeam && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { label: "Total Members", value: teamMembers.length, icon: Users, color: "text-primary", bg: "bg-primary/10" },
                { label: "Verified", value: verifiedCount, icon: CheckCircle2, color: "text-success", bg: "bg-success/10" },
                { label: "Pending", value: pendingCount, icon: Clock, color: "text-warning", bg: "bg-warning/10" },
                { label: "Removed", value: removedCount, icon: Trash2, color: "text-destructive", bg: "bg-destructive/10" },
              ].map(stat => (
                <div key={stat.label} className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:shadow-sm transition-shadow">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0", stat.bg)}>
                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                  </div>
                  <div>
                    <p className={cn("text-2xl font-bold leading-none", stat.color)}>{stat.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Tabs + filters */}
          <div className="bg-card rounded-xl border border-border overflow-hidden">
            <div className="flex items-center justify-between border-b border-border px-4">
              <div className="flex gap-0">
                {[
                  { key: "active" as Tab, label: "Active Users", count: teamMembers.filter(m => !isRemoved(m)).length },
                  { key: "removed" as Tab, label: "Removed", count: removedCount },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "px-4 py-3 text-sm font-medium relative transition-colors",
                      activeTab === tab.key ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {tab.label}
                    <Badge variant="secondary" className="ml-2 text-[10px] h-5">{tab.count}</Badge>
                    {activeTab === tab.key && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Filters */}
            {activeTab === "active" && (
              <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-border bg-muted/20">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by name or email…" className="pl-9 h-9" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                  <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Specialization" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="customer_support">Customer Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Table */}
            {loading ? (
              <div className="p-8"><LoadingState message="Loading team..." /></div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <Users className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="font-semibold text-sm">{activeTab === "active" ? "No active team members" : "No removed users"}</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="w-[300px]">Member</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Specialization</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedMembers.map((m) => (
                      <TableRow key={m.id} className="group">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                {m.user.firstName?.[0]}{m.user.lastName?.[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{m.user.firstName} {m.user.lastName}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.user.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {isRemoved(m) ? (
                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px]">Removed</Badge>
                          ) : m.isVerified ? (
                            <Badge variant="outline" className="bg-success/10 text-success border-success/20 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 mr-1" />Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20 text-[10px]">
                              <Clock className="w-3 h-3 mr-1" />Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm capitalize">{m.role}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn("text-[10px]", getSpecBadgeClass(m.user.specialization))}>
                            {m.user.specialization || "general"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                  <Link to={`/team-member/${m.userId}`}><Eye className="h-3.5 w-3.5" /></Link>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Profile</TooltipContent>
                            </Tooltip>

                            {activeTab === "active" && !isRemoved(m) && canManageTeam && (
                              <DropdownMenu>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                  </TooltipTrigger>
                                  <TooltipContent>Actions</TooltipContent>
                                </Tooltip>
                                <DropdownMenuContent align="end">
                                  {!m.isVerified && canAdminTeam && (
                                    <>
                                      <DropdownMenuItem onClick={() => handleVerify(m.userId)}>
                                        <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => handleReject(m.userId)}>
                                        <X className="w-3.5 h-3.5 mr-2" /> Reject
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                    </>
                                  )}
                                  {m.isVerified && canAdminTeam && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => openConfirm("remove", m)}>
                                      <Trash2 className="w-3.5 h-3.5 mr-2" /> Remove
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}

                            {activeTab === "removed" && isRemoved(m) && canAdminTeam && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openConfirm("restore", m)}>
                                    <RotateCcw className="w-3 h-3" /> Restore
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Restore Member</TooltipContent>
                              </Tooltip>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="px-4 pb-4">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    totalItems={filtered.length}
                    startIndex={(currentPage - 1) * itemsPerPage}
                    endIndex={Math.min(currentPage * itemsPerPage, filtered.length)}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </div>

          {/* Activity Log */}
          {canManageTeam && activityLog.length > 0 && (
            <div className="bg-card rounded-xl border border-border overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold">Recent Activity</h3>
              </div>
              <div className="divide-y divide-border">
                {activityLog.slice(0, 5).map(evt => (
                  <div key={evt.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-2">
                      <div className={cn("w-2 h-2 rounded-full", evt.type === "removed" ? "bg-destructive" : "bg-success")} />
                      <span className="font-medium">{evt.type === "removed" ? "Removed" : "Restored"}</span>
                      <span className="text-muted-foreground">{evt.userName}</span>
                      <Badge variant="outline" className="text-[10px]">{evt.role}</Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{evt.at}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} onSuccess={loadTeam} />

          {/* Confirm Dialog */}
          <Dialog open={confirmOpen} onOpenChange={(o) => { if (!actionLoading) { setConfirmOpen(o); if (!o) { setConfirmType(null); setSelectedMember(null); } } }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{confirmType === "remove" ? "Remove team member?" : "Restore team member?"}</DialogTitle>
                <DialogDescription>
                  {confirmType === "remove"
                    ? `This will deactivate ${selectedMember?.user.firstName} ${selectedMember?.user.lastName}. They will lose login access but remain in history.`
                    : `This will re-activate ${selectedMember?.user.firstName} ${selectedMember?.user.lastName}.`}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setConfirmOpen(false); setConfirmType(null); setSelectedMember(null); }} disabled={actionLoading}>Cancel</Button>
                <Button variant={confirmType === "remove" ? "destructive" : "default"} onClick={handleConfirm} disabled={actionLoading}>
                  {actionLoading ? "Please wait..." : confirmType === "remove" ? "Remove" : "Restore"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </TooltipProvider>
    </DashboardLayout>
  );
};

export default TeamManagement;
