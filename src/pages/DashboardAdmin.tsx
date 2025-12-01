import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import {
  Users,
  Briefcase,
  Building2,
  TrendingUp,
  LayoutDashboard,
  Settings,
  Search,
  Bell,
  UserCircle,
} from "lucide-react";

const DashboardAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any | null>(null);

  const loadSummary = async () => {
    try {
      const response = await api.getAdminSummary();
      setStats(response.data);
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

  const statCards = stats
    ? [
        {
          label: "Total Users",
          value: stats.totalUsers,
          icon: Users,
          color: "text-primary",
        },
        {
          label: "Active Users",
          value: stats.activeUsers,
          icon: Users,
          color: "text-green-500",
        },
        {
          label: "Total Companies",
          value: stats.totalCompanies,
          icon: Building2,
          color: "text-blue-500",
        },
        {
          label: "Active Companies",
          value: stats.activeCompanies,
          icon: Building2,
          color: "text-accent",
        },
        {
          label: "Total Tasks",
          value: stats.totalTasks,
          icon: Briefcase,
          color: "text-orange-500",
        },
      ]
    : [];

  return (
    <div className="flex min-h-screen bg-background">
      {/* ===========================
          SIDEBAR
      =========================== */}
      <aside className="hidden md:flex flex-col w-64 bg-card border-r border-border p-6">
        <h1 className="text-2xl font-bold text-primary mb-10">
          admiino<span className="text-accent">°</span>
        </h1>

        <nav className="flex flex-col gap-3 text-foreground flex-1">
          <Link
            to="/../DashboardAdmin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          <Link
            to="/admin/AdminUsers"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Users className="w-5 h-5" />
            Manage Users
          </Link>

          <Link
            to="/admin/AdminCompanies"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Building2 className="w-5 h-5" />
            Companies
          </Link>

          <Link
            to="/admin/AdminTasks"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Briefcase className="w-5 h-5" />
            Tasks
          </Link>

          <Link
            to="/admin/AdminAnalytics"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <TrendingUp className="w-5 h-5" />
            Analytics
          </Link>

          <Link
            to="/admin/AdminSearch"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Search className="w-5 h-5" />
            Global Search
          </Link>

          <Link
            to="/admin/AdminDeletedUSers"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Users className="w-5 h-5 text-destructive" />
            Deleted Users
          </Link>

          <Link
            to="/admin/AdminDeletedCompanies"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Building2 className="w-5 h-5 text-destructive" />
            Deleted Companies
          </Link>

          <Link
            to="/admin/AdminLogs"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Settings className="w-5 h-5" />
            System Logs
          </Link>
        </nav>

        <div className="flex items-center gap-3 mt-10 border-t pt-6">
          <UserCircle className="w-8 h-8 text-muted-foreground" />
          <div>
            <p className="font-semibold">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-muted-foreground">Platform Admin</p>
          </div>
        </div>
      </aside>

      {/* ===========================
          MAIN CONTENT
      =========================== */}
      <div className="flex-1 p-8">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-3xl font-bold mb-1">Admin Dashboard</h2>
            <p className="text-muted-foreground">
              Welcome back, {user?.firstName}. Here's your platform overview.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <Bell className="w-6 h-6 text-muted-foreground hover:text-primary transition" />

            <Link
              to="/profile"
              className="flex items-center gap-2 border border-border rounded-xl px-4 py-2 hover:bg-muted transition"
            >
              <UserCircle className="w-5 h-5" />
              <span>Profile</span>
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            statCards.map((stat) => (
              <div
                key={stat.label}
                className="p-6 bg-card border border-border rounded-2xl shadow-sm hover:shadow transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
                <p className="text-4xl font-bold">{stat.value}</p>
              </div>
            ))
          )}
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <Link
            to="/admin/AdminUsers"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Users className="w-8 h-8 text-primary" />
            <h3 className="text-lg font-semibold">Manage Users</h3>
            <p className="text-sm text-muted-foreground">View, update, and control all platform users.</p>
          </Link>

          <Link
            to="/admin/AdminCompanies"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Building2 className="w-8 h-8 text-blue-500" />
            <h3 className="text-lg font-semibold">View Companies</h3>
            <p className="text-sm text-muted-foreground">Manage companies and verify registrations.</p>
          </Link>

          <Link
            to="/admin/AdminTasks"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Briefcase className="w-8 h-8 text-accent" />
            <h3 className="text-lg font-semibold">All Tasks</h3>
            <p className="text-sm text-muted-foreground">Monitor company tasks across the entire platform.</p>
          </Link>

          <Link
            to="/admin/AdminAnalytics"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <TrendingUp className="w-8 h-8 text-green-500" />
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p className="text-sm text-muted-foreground">Track growth and platform-wide activity trends.</p>
          </Link>

          <Link
            to="/admin/AdminSearch"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Search className="w-8 h-8 text-purple-500" />
            <h3 className="text-lg font-semibold">Global Search</h3>
            <p className="text-sm text-muted-foreground">Search across all users, tasks, and companies.</p>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardAdmin;
