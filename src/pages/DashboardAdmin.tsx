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
  Paperclip,
  CheckCircle2,
  Clock,
  DollarSign,
  ChevronRight,
} from "lucide-react";

/* ===========================================
   ADMIN ASSISTANCE REQUESTS PROMO CARD
=========================================== */
const AdminAssistancePromoCard = () => {
  const [isHovered, setIsHovered] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<number>(0);
  const [totalRequests, setTotalRequests] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Load assistance requests stats
    const loadAssistanceStats = async () => {
      try {
        setLoading(true);
        // Load pending requests count
        const pendingResponse = await api.getAllAssistanceRequests({
          status: "pending",
        });
        setPendingRequests(pendingResponse.data.results || 0);

        // Load total requests count
        const totalResponse = await api.getAllAssistanceRequests();
        setTotalRequests(totalResponse.data.results || 0);
      } catch (error) {
        console.error("Failed to load assistance requests stats:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAssistanceStats();
  }, []);

  return (
    <Link
      to="/admin/assistance-requests"
      className="bg-gradient-to-br from-blue-50 via-purple-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-blue-300 group relative overflow-hidden"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Animated background effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      {/* Notification badge */}
      {pendingRequests > 0 && (
        <div className="absolute -top-2 -right-2">
          <div className="relative">
            <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center animate-pulse shadow-lg">
              <span className="text-white text-xs font-bold">{pendingRequests}</span>
            </div>
            <div className="absolute inset-0 w-8 h-8 bg-red-500 rounded-full animate-ping opacity-75" />
          </div>
        </div>
      )}

      <div className="relative z-10">
        {/* Icon with animation */}
        <div className="mb-4 relative">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg transform transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110">
            <Paperclip className="w-6 h-6 text-white" />
          </div>
          
          {/* Floating icon */}
          <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center animate-bounce shadow-md">
            <span className="text-white text-xs font-bold">!</span>
          </div>
        </div>

        {/* Title and description */}
        <div className="mb-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-1 flex items-center gap-2">
            Assistance Requests
            {isHovered && (
              <span className="text-blue-600 text-sm animate-pulse">
                →
              </span>
            )}
          </h3>
          <p className="text-sm text-gray-600">
            Review and manage executive assistance requests
          </p>
        </div>

        {/* Stats */}
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <div className="text-left">
                <p className="text-xs text-gray-500 mb-1">Pending Review</p>
                <p className="text-2xl font-bold text-blue-600">
                  {pendingRequests}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-1">Total Requests</p>
                <p className="text-2xl font-bold text-purple-600">
                  {totalRequests}
                </p>
              </div>
            </div>

            {/* CTA Button */}
            <div className="flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${
                pendingRequests > 0 
                  ? "bg-red-100 text-red-600" 
                  : "bg-green-100 text-green-600"
              }`}>
                {pendingRequests > 0 ? "⚠️ Needs Attention" : "✅ All Clear"}
              </span>
              <button className="text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors flex items-center gap-1">
                Manage
                <span className={`transition-transform duration-300 ${isHovered ? 'translate-x-1' : ''}`}>
                  →
                </span>
              </button>
            </div>

            {/* Progress bar (optional - shows if there are pending requests) */}
            {pendingRequests > 0 && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Response time</span>
                  <span className="font-medium">24h goal</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-400 to-blue-500 h-2 rounded-full transition-all duration-700"
                    style={{ width: isHovered ? '75%' : '60%' }}
                  />
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Link>
  );
};

const DashboardAdmin = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any | null>(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
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
        {
          label: "Assistance Requests",
          value: stats.totalAssistanceRequests || 0,
          icon: Paperclip,
          color: "text-purple-500",
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
            to="/dashboard-admin"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          <Link
            to="/admin/users"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Users className="w-5 h-5" />
            Manage Users
          </Link>

          <Link
            to="/admin/companies"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Building2 className="w-5 h-5" />
            Companies
          </Link>

          <Link
            to="/admin/assistance-requests"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Paperclip className="w-5 h-5" />
            Assistance Requests
          </Link>

          <Link
            to="/admin/tasks"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Briefcase className="w-5 h-5" />
            Tasks
          </Link>

          <Link
            to="/admin/analytics"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <TrendingUp className="w-5 h-5" />
            Analytics
          </Link>

          <Link
            to="/admin/search"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Search className="w-5 h-5" />
            Global Search
          </Link>

          <Link
            to="/admin/deleted/users"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Users className="w-5 h-5 text-destructive" />
            Deleted Users
          </Link>

          <Link
            to="/admin/deleted/companies"
            className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition"
          >
            <Building2 className="w-5 h-5 text-destructive" />
            Deleted Companies
          </Link>

          <Link
            to="/admin/logs"
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
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-6 mb-12">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
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
            to="/admin/users"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Users className="w-8 h-8 text-primary" />
            <h3 className="text-lg font-semibold">Manage Users</h3>
            <p className="text-sm text-muted-foreground">View, update, and control all platform users.</p>
          </Link>

          <Link
            to="/admin/companies"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Building2 className="w-8 h-8 text-blue-500" />
            <h3 className="text-lg font-semibold">View Companies</h3>
            <p className="text-sm text-muted-foreground">Manage companies and verify registrations.</p>
          </Link>

          {/* Assistance Requests Promo Card */}
          <AdminAssistancePromoCard />

          <Link
            to="/admin/tasks"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Briefcase className="w-8 h-8 text-accent" />
            <h3 className="text-lg font-semibold">All Tasks</h3>
            <p className="text-sm text-muted-foreground">Monitor company tasks across the entire platform.</p>
          </Link>

          <Link
            to="/admin/analytics"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <TrendingUp className="w-8 h-8 text-green-500" />
            <h3 className="text-lg font-semibold">Analytics</h3>
            <p className="text-sm text-muted-foreground">Track growth and platform-wide activity trends.</p>
          </Link>

          <Link
            to="/admin/search"
            className="bg-card border border-border rounded-2xl p-6 hover:shadow transition flex flex-col items-start gap-3"
          >
            <Search className="w-8 h-8 text-purple-500" />
            <h3 className="text-lg font-semibold">Global Search</h3>
            <p className="text-sm text-muted-foreground">Search across all users, tasks, and companies.</p>
          </Link>
        </div>

        {/* Recent Activity Section (Optional) */}
        <div className="mt-12">
          <h3 className="text-xl font-semibold mb-6">Recent Platform Activity</h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Users */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Recent User Signups
                </h4>
                <span className="text-xs text-muted-foreground">Last 7 days</span>
              </div>
              {stats?.recentUsers && stats.recentUsers.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentUsers.slice(0, 5).map((user: any) => (
                    <div key={user.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <UserCircle className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{user.firstName} {user.lastName}</p>
                          <p className="text-xs text-muted-foreground">{user.email}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {user.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">No recent user activity</p>
              )}
            </div>

            {/* Recent Companies */}
            <div className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  Recent Company Registrations
                </h4>
                <span className="text-xs text-muted-foreground">Last 7 days</span>
              </div>
              {stats?.recentCompanies && stats.recentCompanies.length > 0 ? (
                <div className="space-y-3">
                  {stats.recentCompanies.slice(0, 5).map((company: any) => (
                    <div key={company.id} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-blue-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{company.name}</p>
                          <p className="text-xs text-muted-foreground">{company.companyCode}</p>
                        </div>
                      </div>
                      <Badge variant={company.isActive ? "default" : "secondary"} className="text-xs">
                        {company.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">No recent company registrations</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Helper Badge component
const Badge = ({ variant = "default", className = "", children }: any) => {
  const baseStyles = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium";
  
  const variants: Record<string, string> = {
    default: "bg-primary text-primary-foreground",
    secondary: "bg-secondary text-secondary-foreground",
    outline: "border border-border bg-transparent",
    destructive: "bg-destructive text-destructive-foreground",
  };

  return (
    <span className={`${baseStyles} ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default DashboardAdmin;