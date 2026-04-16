import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell,
  Bot,
  Crown,
  HelpCircle,
  Plus,
  X,
  ArrowRight,
  Clock3,
  ListTodo,
  AlertTriangle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";

const tasks = [
  {
    title: "Prepare Q4 Board Presentation",
    priority: "High",
    deadline: "2025-10-28",
    status: "In Progress",
  },
  {
    title: "Review Annual Budget Proposal",
    priority: "High",
    deadline: "2025-10-27",
    status: "Pending",
  },
  {
    title: "Schedule Leadership Retreat",
    priority: "Medium",
    deadline: "2025-11-05",
    status: "In Progress",
  },
  {
    title: "Draft Investor Update Email",
    priority: "High",
    deadline: "2025-10-25",
    status: "Past Due",
  },
];

const getStatusBadgeClass = (status: string) => {
  switch (status) {
    case "In Progress":
      return "bg-primary/10 text-primary border-primary/20";
    case "Pending":
      return "bg-warning/10 text-warning border-warning/20";
    case "Past Due":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Completed":
      return "bg-success/10 text-success border-success/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const getPriorityBadgeClass = (priority: string) => {
  switch (priority) {
    case "High":
      return "bg-destructive/10 text-destructive border-destructive/20";
    case "Medium":
      return "bg-warning/10 text-warning border-warning/20";
    case "Low":
      return "bg-info/10 text-info border-info/20";
    default:
      return "bg-muted text-muted-foreground";
  }
};

const Dashboard = () => {
  const [showBanner, setShowBanner] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  const summary = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "Pending").length,
      inProgress: tasks.filter((t) => t.status === "In Progress").length,
      pastDue: tasks.filter((t) => t.status === "Past Due").length,
    };
  }, []);

  const filteredTasks = useMemo(() => {
    switch (activeTab) {
      case "pending":
        return tasks.filter((t) => t.status === "Pending");
      case "in_progress":
        return tasks.filter((t) => t.status === "In Progress");
      case "completed":
        return tasks.filter((t) => t.status === "Completed");
      default:
        return tasks;
    }
  }, [activeTab]);

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-border/80 bg-background/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <h1 className="text-primary font-bold text-2xl">
              admiino<span className="text-accent">°</span>
            </h1>
            <Badge variant="outline" className="hidden sm:inline-flex">
              Executive Workspace
            </Badge>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="outline" className="hidden sm:inline-flex gap-2">
              <Bot className="h-4 w-4" />
              AI Hub
            </Button>

            <Button variant="ghost" size="icon">
              <HelpCircle className="h-5 w-5 text-muted-foreground" />
            </Button>

            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5 text-muted-foreground" />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Delegate New Task</span>
              <span className="sm:hidden">New</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6">
        {showBanner && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/15 bg-gradient-to-r from-primary to-primary/80 p-5 text-primary-foreground shadow-soft sm:p-6">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute right-4 top-4 text-primary-foreground/80 transition hover:text-primary-foreground"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                <Crown className="h-6 w-6" />
              </div>

              <div className="flex-1">
                <h3 className="text-xl font-semibold">Need more capacity?</h3>
                <p className="mt-1 max-w-2xl text-sm text-primary-foreground/90 sm:text-base">
                  Upgrade to Premium and hire a dedicated Chief of Staff to
                  handle your tasks professionally.
                </p>

                <Button
                  className="mt-4 bg-background text-foreground hover:bg-background/90"
                  asChild
                >
                  <Link to="/team_members" className="gap-2">
                    Hire a Chief of Staff Now
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">My Tasks</h2>
            <p className="mt-1 text-sm text-muted-foreground sm:text-base">
              Manage and track all delegated tasks
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground">
                <ListTodo className="h-4 w-4" />
                <span className="text-xs">Total</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{summary.total}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs">Pending</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{summary.pending}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock3 className="h-4 w-4" />
                <span className="text-xs">In Progress</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{summary.inProgress}</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 shadow-soft">
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs">Past Due</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{summary.pastDue}</p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card shadow-soft">
          <div className="border-b border-border px-4 pt-4 sm:px-6">
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "All Tasks" },
                { key: "pending", label: "Pending" },
                { key: "in_progress", label: "In Progress" },
                { key: "completed", label: "Completed" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "rounded-t-lg border-b-2 px-4 py-2 text-sm font-medium transition",
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="divide-y divide-border">
            {filteredTasks.map((task, index) => (
              <div
                key={index}
                className="flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-muted/30 sm:px-6 md:flex-row md:items-center md:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-foreground">{task.title}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge className={getPriorityBadgeClass(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge className={getStatusBadgeClass(task.status)}>
                      {task.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Due {new Date(task.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <Button variant="outline" asChild className="w-full md:w-auto">
                  <Link to="/task-details">View Details</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;