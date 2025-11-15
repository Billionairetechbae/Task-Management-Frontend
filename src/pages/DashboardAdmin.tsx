import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, HelpCircle, User, Users, Briefcase, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const stats = [
  { label: "Total Users", value: "1,234", icon: Users, color: "text-primary" },
  { label: "Active Tasks", value: "567", icon: Briefcase, color: "text-accent" },
  { label: "Revenue (MTD)", value: "$45,678", icon: TrendingUp, color: "text-success" },
];

const DashboardAdmin = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-bold text-2xl">
            admiino<span className="text-accent">°</span>
          </h1>

          <div className="flex items-center gap-4">
            <button className="relative">
              <HelpCircle className="w-6 h-6 text-muted-foreground" />
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" />
                Profile
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">
            Admin Dashboard
          </h2>
          <p className="text-muted-foreground">Welcome back, {user?.firstName}! Here's what's happening.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-card border border-border rounded-2xl p-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-muted-foreground">{stat.label}</h3>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-3xl font-bold">{stat.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-card border border-border rounded-2xl p-8">
          <h3 className="text-xl font-bold mb-4">Platform Overview</h3>
          <p className="text-muted-foreground mb-6">
            Manage users, monitor tasks, and oversee platform operations.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Users className="w-8 h-8 text-primary" />
              <span className="font-semibold">Manage Users</span>
            </Button>
            <Button variant="outline" className="h-auto py-6 flex-col gap-2">
              <Briefcase className="w-8 h-8 text-accent" />
              <span className="font-semibold">View All Tasks</span>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardAdmin;
