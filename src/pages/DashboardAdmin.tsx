import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Briefcase,
  Building2,
  TrendingUp,
  Paperclip,
  UserCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
} from "lucide-react";

import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  StatsCard,
  PageHeader,
  SectionHeader,
  ContentCard,
  LoadingState,
  QuickActionCard,
} from "@/components/dashboard/DashboardComponents";

import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const DashboardAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any | null>(null);
  const [pendingRequests, setPendingRequests] = useState(0);
  const [totalRequests, setTotalRequests] = useState(0);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminSummary();
      setStats(response.data);

      // Load assistance requests stats
      try {
        const pendingResponse = await api.getAllAssistanceRequests({ status: "pending" });
        setPendingRequests(pendingResponse.data.results || 0);

        const totalResponse = await api.getAllAssistanceRequests();
        setTotalRequests(totalResponse.data.results || 0);
      } catch (_) {}
    } catch (err: any) {
      toast({
        title: "Failed to load dashboard",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  if (loading) {
    return (
      <DashboardLayout>
        <LoadingState message="Loading admin dashboard..." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageHeader
        title="Admin Dashboard"
        description={`Welcome back, ${user?.firstName}. Here's your platform overview.`}
      />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <StatsCard
          title="Total Users"
          value={stats?.totalUsers || 0}
          icon={Users}
          iconClassName="bg-primary/10"
        />
        <StatsCard
          title="Active Users"
          value={stats?.activeUsers || 0}
          icon={Users}
          iconClassName="bg-success/10"
        />
        <StatsCard
          title="Total Companies"
          value={stats?.totalCompanies || 0}
          icon={Building2}
          iconClassName="bg-info/10"
        />
        <StatsCard
          title="Active Companies"
          value={stats?.activeCompanies || 0}
          icon={Building2}
          iconClassName="bg-accent/10"
        />
        <StatsCard
          title="Total Tasks"
          value={stats?.totalTasks || 0}
          icon={Briefcase}
          iconClassName="bg-warning/10"
        />
        <StatsCard
          title="Assistance Requests"
          value={stats?.totalAssistanceRequests || 0}
          icon={Paperclip}
          iconClassName="bg-purple-500/10"
        />
      </div>

      {/* Quick Actions */}
      <SectionHeader title="Quick Actions" className="mb-4" />
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-8">
        <Link
          to="/admin/users"
          className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/20 transition-all"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 mb-4">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h3 className="font-semibold mb-1">Manage Users</h3>
          <p className="text-sm text-muted-foreground">View, update, and control all platform users</p>
        </Link>

        <Link
          to="/admin/companies"
          className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/20 transition-all"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-info/10 mb-4">
            <Building2 className="w-6 h-6 text-info" />
          </div>
          <h3 className="font-semibold mb-1">View Companies</h3>
          <p className="text-sm text-muted-foreground">Manage companies and verify registrations</p>
        </Link>

        {/* Assistance Requests Card with badge */}
        <Link
          to="/admin/assistance-requests"
          className="bg-gradient-to-br from-primary/5 to-accent/5 border-2 border-primary/20 rounded-xl p-6 hover:shadow-md hover:border-primary/30 transition-all relative"
        >
          {pendingRequests > 0 && (
            <div className="absolute -top-2 -right-2">
              <div className="w-8 h-8 bg-destructive rounded-full flex items-center justify-center animate-pulse shadow-lg">
                <span className="text-destructive-foreground text-xs font-bold">{pendingRequests}</span>
              </div>
            </div>
          )}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary to-accent mb-4">
            <Paperclip className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold mb-1">Assistance Requests</h3>
          <p className="text-sm text-muted-foreground">Review and manage executive assistance requests</p>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="text-lg font-bold text-primary">{pendingRequests}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="text-lg font-bold">{totalRequests}</p>
            </div>
          </div>
        </Link>

        <Link
          to="/admin/tasks"
          className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/20 transition-all"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-warning/10 mb-4">
            <Briefcase className="w-6 h-6 text-warning" />
          </div>
          <h3 className="font-semibold mb-1">All Tasks</h3>
          <p className="text-sm text-muted-foreground">Monitor tasks across the entire platform</p>
        </Link>

        <Link
          to="/admin/analytics"
          className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/20 transition-all"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-success/10 mb-4">
            <TrendingUp className="w-6 h-6 text-success" />
          </div>
          <h3 className="font-semibold mb-1">Analytics</h3>
          <p className="text-sm text-muted-foreground">Track growth and platform-wide activity</p>
        </Link>

        <Link
          to="/admin/search"
          className="bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/20 transition-all"
        >
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-muted mb-4">
            <UserCircle className="w-6 h-6 text-foreground" />
          </div>
          <h3 className="font-semibold mb-1">Global Search</h3>
          <p className="text-sm text-muted-foreground">Search across users, tasks, and companies</p>
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Users */}
        <ContentCard>
          <SectionHeader
            title="Recent User Signups"
            actions={
              <Badge variant="outline" className="text-xs">Last 7 days</Badge>
            }
          />
          {stats?.recentUsers && stats.recentUsers.length > 0 ? (
            <div className="space-y-3 mt-4">
              {stats.recentUsers.slice(0, 5).map((u: any) => (
                <div key={u.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <UserCircle className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.firstName} {u.lastName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs capitalize">{u.role}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No recent signups</p>
          )}
        </ContentCard>

        {/* Recent Companies */}
        <ContentCard>
          <SectionHeader
            title="Recent Companies"
            actions={
              <Badge variant="outline" className="text-xs">Last 7 days</Badge>
            }
          />
          {stats?.recentCompanies && stats.recentCompanies.length > 0 ? (
            <div className="space-y-3 mt-4">
              {stats.recentCompanies.slice(0, 5).map((c: any) => (
                <div key={c.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-info/10 rounded-full flex items-center justify-center">
                      <Building2 className="w-4 h-4 text-info" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.industry || "—"}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={c.isActive ? "text-success border-success/20" : "text-muted-foreground"}
                  >
                    {c.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground text-center py-8">No recent companies</p>
          )}
        </ContentCard>
      </div>
    </DashboardLayout>
  );
};

export default DashboardAdmin;
