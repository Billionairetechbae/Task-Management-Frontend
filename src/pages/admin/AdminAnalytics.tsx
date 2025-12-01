import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Briefcase,
  Activity,
  TrendingUp
} from "lucide-react";

const AdminAnalytics = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<any | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await api.getAdminSummary();
      setAnalytics(response.data);
    } catch (err: any) {
      toast({
        title: "Failed to load analytics",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-6 text-muted-foreground">
        Loading analytics...
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-6 text-destructive">
        Unable to load analytics.
      </div>
    );
  }

  const stats = [
    {
      label: "Total Companies",
      value: analytics.totalCompanies,
      icon: Building2,
      color: "text-primary"
    },
    {
      label: "Active Companies",
      value: analytics.activeCompanies,
      icon: Activity,
      color: "text-green-500"
    },
    {
      label: "Total Users",
      value: analytics.totalUsers,
      icon: Users,
      color: "text-blue-500"
    },
    {
      label: "Active Users",
      value: analytics.activeUsers,
      icon: Users,
      color: "text-success"
    },
    {
      label: "Total Tasks",
      value: analytics.totalTasks,
      icon: Briefcase,
      color: "text-orange-500"
    },
  ];

  return (
    <div className="min-h-screen bg-background p-6">
      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <TrendingUp className="w-8 h-8 text-primary" />
        Platform Analytics
      </h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((stat) => (
          <Card key={stat.label} className="p-6 border border-border">
            <div className="flex items-center justify-between mb-1">
              <p className="text-muted-foreground text-sm">{stat.label}</p>
              <stat.icon className={`w-6 h-6 ${stat.color}`} />
            </div>
            <p className="text-3xl font-bold">{stat.value}</p>
          </Card>
        ))}
      </div>

      {/* Role breakdown */}
      <Card className="p-6 border border-border mb-10">
        <h3 className="text-xl font-bold mb-4">User Role Breakdown</h3>

        {analytics.roleBreakdown.length === 0 ? (
          <p className="text-muted-foreground">No data available</p>
        ) : (
          <ul className="space-y-3">
            {analytics.roleBreakdown.map((r: any) => (
              <li
                className="flex justify-between border-b border-border pb-2"
                key={r.role}
              >
                <span className="font-medium capitalize">{r.role}</span>
                <span className="text-muted-foreground">{r.count}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Future charts */}
      <Card className="p-6 border border-border">
        <h3 className="text-xl font-bold mb-4">Platform Activity (Coming Soon)</h3>
        <p className="text-muted-foreground">Charts and activity graphs will be added here.</p>
      </Card>
    </div>
  );
};

export default AdminAnalytics;
