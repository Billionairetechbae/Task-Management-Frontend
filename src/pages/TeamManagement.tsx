// src/pages/TeamManagement.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import {
  User,
  Users,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  X,
  Mail,
  Trash2,
  RotateCcw,
  Activity,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import { api, CompanyMember } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { canAdminWorkspace, canManageWorkspace } from "@/lib/permissions";
import { useToast } from "@/hooks/use-toast";
import InviteUserDialog from "@/components/InviteUserDialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

type Tab = "active" | "removed";

type ActivityEvent = {
  id: string;
  type: "removed" | "restored";
  userName: string;
  role: string;
  at: string;
};

const TeamManagement = () => {
  const { user, workspaceRole, activeCompanyId } = useAuth();
  const { toast } = useToast();

  const globalRole = user?.role ?? null;
  const canManageTeam = canManageWorkspace(workspaceRole, globalRole);
  const canAdminTeam = canAdminWorkspace(workspaceRole, globalRole);

  const [teamMembers, setTeamMembers] = useState<CompanyMember[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");

  const [activeTab, setActiveTab] = useState<Tab>("active");

  const [inviteOpen, setInviteOpen] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"remove" | "restore" | null>(
    null
  );
  const [selectedMember, setSelectedMember] = useState<CompanyMember | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);

  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);

  const loadTeam = async () => {
    try {
      setLoading(true);
      if (!canManageTeam) {
        setTeamMembers([]);
        return;
      }

      const res = await api.getCompanyAssistants();
      setTeamMembers(res.data.members || []);
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Could not load team.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTeam();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManageTeam, activeCompanyId]);

  /* ---------------------------
   * HELPERS
   * --------------------------*/
  const isRemoved = (m: CompanyMember) => m.status === "removed";

  const filtered = teamMembers.filter((m) => {
    const inTab = activeTab === "active" ? !isRemoved(m) : isRemoved(m);
    if (!inTab) return false;

    const fullName = `${m.user.firstName} ${m.user.lastName}`.toLowerCase();
    const matchesSearch =
      fullName.includes(searchTerm.toLowerCase()) ||
      m.user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && m.isVerified && !isRemoved(m)) ||
      (statusFilter === "pending" && !m.isVerified && !isRemoved(m));

    const matchesSpecialization =
      specializationFilter === "all" ||
      (m.user.specialization || "general") === specializationFilter;

    return matchesSearch && matchesStatus && matchesSpecialization;
  });

  const pendingCount = teamMembers.filter((m) => !m.isVerified && !isRemoved(m))
    .length;

  const verifiedCount = teamMembers.filter((m) => m.isVerified && !isRemoved(m))
    .length;

  const removedCount = teamMembers.filter((m) => isRemoved(m)).length;

  const getStatusBadge = (m: CompanyMember) =>
    isRemoved(m) ? (
      <Badge className="bg-destructive/10 text-destructive border border-destructive/30">
        Removed
      </Badge>
    ) : m.isVerified ? (
      <Badge className="bg-success/20 text-success border border-success/30">
        <CheckCircle2 className="w-3 h-3 mr-1" />
        Verified
      </Badge>
    ) : (
      <Badge className="bg-warning/10 text-warning border border-warning/30">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );

  const getSpecBadge = (spec?: string | null) => {
    const map: Record<string, string> = {
      sales: "bg-blue-100 text-blue-800 border-blue-200",
      marketing: "bg-purple-100 text-purple-800 border-purple-200",
      operations: "bg-green-100 text-green-800 border-green-200",
      general: "bg-gray-100 text-gray-800 border-gray-200",
      customer_support: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return map[spec || "general"] || map.general;
  };

  const pushActivity = (type: "removed" | "restored", target: CompanyMember) => {
    const event: ActivityEvent = {
      id: `${Date.now()}-${target.id}-${type}`,
      type,
      userName: `${target.user.firstName} ${target.user.lastName}`,
      role: target.role,
      at: new Date().toLocaleString(),
    };
    setActivityLog((prev) => [event, ...prev].slice(0, 20));
  };

  /* ---------------------------
   * ACTIONS
   * --------------------------*/
  const handleVerify = async (userId: string) => {
    try {
      await api.verifyAssistant(userId);
      toast({ title: "Team member approved!" });
      loadTeam();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (userId: string) => {
    try {
      await api.rejectAssistant(userId);
      toast({ title: "Team member rejected." });
      loadTeam();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const openConfirm = (type: "remove" | "restore", member: CompanyMember) => {
    setConfirmType(type);
    setSelectedMember(member);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmType || !selectedMember) return;

    try {
      setActionLoading(true);

      if (confirmType === "remove") {
        await api.removeTeamMember(selectedMember.userId);
        toast({
          title: "User removed",
          description: `${selectedMember.user.firstName} ${selectedMember.user.lastName} has been deactivated.`,
        });
        pushActivity("removed", selectedMember);
      }

      if (confirmType === "restore") {
        await api.restoreTeamMember(selectedMember.userId);
        toast({
          title: "User restored",
          description: `${selectedMember.user.firstName} ${selectedMember.user.lastName} is now active again.`,
        });
        pushActivity("restored", selectedMember);
      }

      await loadTeam();

      setConfirmOpen(false);
      setSelectedMember(null);
      setConfirmType(null);
    } catch (err: any) {
      toast({
        title: "Action failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold">Team Management</h2>
            <p className="text-muted-foreground">
              Manage team members, status, and removals.
            </p>
          </div>

          {canAdminTeam && (
            <Button className="gap-2" onClick={() => setInviteOpen(true)}>
              <Mail className="w-5 h-5" />
              Invite Team Member
            </Button>
          )}
        </div>

        {/* TABS */}
        <div className="mb-6 border-b border-border flex gap-2">
          <button
            onClick={() => setActiveTab("active")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "active"
                ? "border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Users
            <Badge variant="secondary" className="ml-2">
              {teamMembers.filter((m) => !isRemoved(m)).length}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab("removed")}
            className={`px-4 py-2 font-semibold ${
              activeTab === "removed"
                ? "border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Removed / Rejected
            {removedCount > 0 && (
              <Badge variant="outline" className="ml-2">
                {removedCount}
              </Badge>
            )}
          </button>
        </div>

        {canManageTeam && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Total Team Members</CardTitle>
                <CardDescription>All members in workspace</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{teamMembers.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">
                  {verifiedCount}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-warning">{pendingCount}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Removed</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-destructive">
                  {removedCount}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* FILTERS (only Active tab) */}
        {activeTab === "active" && (
          <Card className="mb-6">
            <CardContent className="p-6 space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by name or email…"
                    className="pl-10"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={specializationFilter}
                  onValueChange={setSpecializationFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Specialization" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                    <SelectItem value="customer_support">
                      Customer Support
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {/* LIST */}
        {loading ? (
          <Card>
            <CardContent className="p-6">Loading…</CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-semibold mb-2">
                {activeTab === "active" ? "No active team members" : "No removed users"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 mb-8">
            {filtered.map((m) => (
              <Card key={m.id}>
                <CardContent className="flex justify-between p-6 flex-wrap gap-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {m.user.firstName} {m.user.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {m.user.email}
                      </p>

                      <div className="flex gap-2 mt-2 flex-wrap">
                        {getStatusBadge(m)}
                        <Badge className={getSpecBadge(m.user.specialization)}>
                          {m.user.specialization || "general"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/team-member/${m.userId}`}>View Profile</Link>
                    </Button>

                    {activeTab === "active" && !isRemoved(m) && canManageTeam && (
                      <>
                        {!m.isVerified && canAdminTeam && (
                          <>
                            <Button size="sm" onClick={() => handleVerify(m.userId)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(m.userId)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {m.isVerified && canAdminTeam && (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => openConfirm("remove", m)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </Button>
                        )}
                      </>
                    )}

                    {activeTab === "removed" && isRemoved(m) && canAdminTeam && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => openConfirm("restore", m)}
                      >
                        <RotateCcw className="w-4 h-4" />
                        Restore
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ACTIVITY LOG */}
        {canManageTeam && (
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-muted-foreground" />
                <CardTitle>Activity Log</CardTitle>
              </div>
              <CardDescription>
                Removals and restorations (local session)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {activityLog.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No activity recorded yet.
                </p>
              ) : (
                activityLog.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex justify-between text-sm border-b border-border/50 pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium">
                        {evt.type === "removed" ? "Removed" : "Restored"}{" "}
                        {evt.userName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Role: {evt.role}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">{evt.at}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        )}

        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onSuccess={loadTeam}
        />
      </div>

      {/* CONFIRM MODAL */}
      {confirmOpen && confirmType && selectedMember && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-card border border-border rounded-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold mb-2">
              {confirmType === "remove"
                ? "Remove team member?"
                : "Restore team member?"}
            </h3>

            <p className="text-sm text-muted-foreground mb-4">
              {confirmType === "remove" ? (
                <>
                  This will deactivate{" "}
                  <strong>
                    {selectedMember.user.firstName} {selectedMember.user.lastName}
                  </strong>
                  . They will lose login access but remain in history.
                </>
              ) : (
                <>
                  This will re-activate{" "}
                  <strong>
                    {selectedMember.user.firstName} {selectedMember.user.lastName}
                  </strong>
                  .
                </>
              )}
            </p>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  if (!actionLoading) {
                    setConfirmOpen(false);
                    setConfirmType(null);
                    setSelectedMember(null);
                  }
                }}
              >
                Cancel
              </Button>

              <Button
                variant={confirmType === "remove" ? "destructive" : "default"}
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading
                  ? "Please wait..."
                  : confirmType === "remove"
                  ? "Remove"
                  : "Restore"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default TeamManagement;