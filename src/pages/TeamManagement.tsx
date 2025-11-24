// src/pages/TeamManagement.tsx
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import {
  Bell,
  HelpCircle,
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

import Logo from "@/components/Logo";
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

import { api, Assistant } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import InviteUserDialog from "@/components/InviteUserDialog";

type Tab = "active" | "removed";

type ActivityEvent = {
  id: string;
  type: "removed" | "restored";
  userName: string;
  role: string;
  at: string;
};

const TeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const isExecutive = user?.role === "executive";

  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [specializationFilter, setSpecializationFilter] = useState("all");

  const [activeTab, setActiveTab] = useState<Tab>("active");

  // Invite dialog
  const [inviteOpen, setInviteOpen] = useState(false);

  // Confirm modal
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmType, setConfirmType] = useState<"remove" | "restore" | null>(
    null
  );
  const [selectedMember, setSelectedMember] = useState<Assistant | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Activity log (frontend only)
  const [activityLog, setActivityLog] = useState<ActivityEvent[]>([]);

  /* ---------------------------
   * LOAD TEAM DATA
   * --------------------------*/
  const loadAssistants = async () => {
    try {
      setLoading(true);
      if (!isExecutive) {
        setAssistants([]);
        return;
      }

      const res = await api.getCompanyAssistants();
      setAssistants(res.data.assistants || []);
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
    loadAssistants();
  }, [isExecutive]);

  /* ---------------------------
   * HELPERS
   * --------------------------*/
  const isRemoved = (a: Assistant) =>
    a.isActive === false || a.invitationStatus === "removed";

  const filteredAssistants = assistants.filter((a) => {
    const isInTab =
      activeTab === "active" ? !isRemoved(a) : isRemoved(a);

    if (!isInTab) return false;

    const matchesSearch =
      a.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "verified" && a.isVerified && !isRemoved(a)) ||
      (statusFilter === "pending" && !a.isVerified && !isRemoved(a));

    const matchesSpecialization =
      specializationFilter === "all" ||
      a.specialization === specializationFilter;

    return matchesSearch && matchesStatus && matchesSpecialization;
  });

  const pendingCount = assistants.filter(
    (a) => !a.isVerified && !isRemoved(a)
  ).length;

  const verifiedCount = assistants.filter(
    (a) => a.isVerified && !isRemoved(a)
  ).length;

  const removedCount = assistants.filter((a) => isRemoved(a)).length;

  const getStatusBadge = (a: Assistant) =>
    isRemoved(a) ? (
      <Badge className="bg-destructive/10 text-destructive border border-destructive/30">
        Removed
      </Badge>
    ) : a.isVerified ? (
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
    return map[spec || "general"] || "";
  };

  const pushActivity = (
    type: "removed" | "restored",
    target: Assistant
  ) => {
    const event: ActivityEvent = {
      id: `${Date.now()}-${target.id}-${type}`,
      type,
      userName: `${target.firstName} ${target.lastName}`,
      role: target.role,
      at: new Date().toLocaleString(),
    };
    setActivityLog((prev) => [event, ...prev].slice(0, 20));
  };

  /* ---------------------------
   * ACTIONS
   * --------------------------*/
  const handleVerify = async (id: string) => {
    try {
      await api.verifyAssistant(id);
      toast({ title: "Assistant verified!" });
      loadAssistants();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (id: string) => {
    try {
      await api.rejectAssistant(id);
      toast({ title: "Assistant rejected." });
      loadAssistants();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const openConfirm = (
    type: "remove" | "restore",
    member: Assistant
  ) => {
    setConfirmType(type);
    setSelectedMember(member);
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!confirmType || !selectedMember) return;

    try {
      setActionLoading(true);

      if (confirmType === "remove") {
        await api.removeTeamMember(selectedMember.id);
        toast({
          title: "User removed",
          description: `${selectedMember.firstName} ${selectedMember.lastName} has been deactivated.`,
        });
        pushActivity("removed", selectedMember);
      }

      if (confirmType === "restore") {
        await api.restoreTeamMember(selectedMember.id);
        toast({
          title: "User restored",
          description: `${selectedMember.firstName} ${selectedMember.lastName} is now active again.`,
        });
        pushActivity("restored", selectedMember);
      }

      await loadAssistants();

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

  /* ---------------------------
   * RENDER UI
   * --------------------------*/
  return (
    <div className="min-h-screen bg-background">
      {/* HEADER */}
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-4">
            <Button variant="outline" asChild>
              <Link
                to={
                  user?.role === "executive"
                    ? "/dashboard-executive"
                    : "/dashboard-assistant"
                }
              >
                <Users className="w-4 h-4 mr-1" />
                Dashboard
              </Link>
            </Button>

            <HelpCircle className="w-6 h-6 text-muted-foreground" />
            <Bell className="w-6 h-6 text-muted-foreground" />

            <Button variant="outline" asChild>
              <Link to="/team-directory">
                <Users className="w-4 h-4 mr-1" /> Team Directory
              </Link>
            </Button>

            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" />
                Profile
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="px-6 py-8 max-w-6xl mx-auto">
        {/* Title + Invite */}
        <div className="flex justify-between mb-8 gap-4 flex-wrap">
          <div>
            <h2 className="text-3xl font-bold">Team Management</h2>
            <p className="text-muted-foreground">
              Manage assistants, status, and removals.
            </p>
          </div>

          {isExecutive && (
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
              {assistants.filter((a) => !isRemoved(a)).length}
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

        {/* SUMMARY CARDS */}
        {isExecutive && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader>
                <CardTitle>Total Team Members</CardTitle>
                <CardDescription>All assistants in company</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{assistants.length}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verified</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-success">{verifiedCount}</p>
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

                {/* Status filter */}
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
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

                {/* Specialization */}
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
          <Card><CardContent className="p-6">Loading…</CardContent></Card>
        ) : filteredAssistants.length === 0 ? (
          <Card>
            <CardContent className="text-center p-8">
              <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="font-semibold mb-2">
                {activeTab === "active"
                  ? "No active assistants"
                  : "No removed users"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 mb-8">
            {filteredAssistants.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex justify-between p-6 flex-wrap gap-4">
                  <div className="flex gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {a.firstName} {a.lastName}
                      </h3>
                      <p className="text-sm text-muted-foreground">{a.email}</p>

                      <div className="flex gap-2 mt-2 flex-wrap">
                        {getStatusBadge(a)}
                        <Badge className={getSpecBadge(a.specialization)}>
                          {a.specialization || "general"}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <Button variant="outline" size="sm" asChild>
                      <Link to={`/team-member/${a.id}`}>View Profile</Link>
                    </Button>

                    {/* Actions */}
                    {activeTab === "active" && !isRemoved(a) && (
                      <>
                        {!a.isVerified ? (
                          <>
                            <Button size="sm" onClick={() => handleVerify(a.id)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReject(a.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => openConfirm("remove", a)}
                          >
                            <Trash2 className="w-4 h-4" />
                            Remove
                          </Button>
                        )}
                      </>
                    )}

                    {activeTab === "removed" && isRemoved(a) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => openConfirm("restore", a)}
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
        {isExecutive && (
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

        {/* INVITE USER DIALOG */}
        <InviteUserDialog
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          onSuccess={loadAssistants}
        />
      </main>

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
                    {selectedMember.firstName} {selectedMember.lastName}
                  </strong>
                  . They will lose login access but remain in history.
                </>
              ) : (
                <>
                  This will re-activate{" "}
                  <strong>
                    {selectedMember.firstName} {selectedMember.lastName}
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
    </div>
  );
};

export default TeamManagement;
