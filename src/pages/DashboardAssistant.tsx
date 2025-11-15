import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, HelpCircle, User, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const assignedTasks = [
  {
    title: "Schedule Board Meeting",
    client: "Tech Corp Inc",
    priority: "High",
    deadline: "2025-11-18",
    status: "In Progress",
  },
  {
    title: "Research Venues for Retreat",
    client: "Innovation Labs",
    priority: "Medium",
    deadline: "2025-11-20",
    status: "Pending",
  },
  {
    title: "Draft Meeting Notes",
    client: "Startup Co",
    priority: "High",
    deadline: "2025-11-16",
    status: "In Progress",
  },
];

const DashboardAssistant = () => {
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
            Welcome, {user?.firstName}!
          </h2>
          <p className="text-muted-foreground">Here are your assigned tasks</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Active Tasks</h3>
              <CheckCircle2 className="w-5 h-5 text-primary" />
            </div>
            <p className="text-3xl font-bold">3</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Completed This Week</h3>
              <CheckCircle2 className="w-5 h-5 text-success" />
            </div>
            <p className="text-3xl font-bold">12</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-muted-foreground">Earnings This Month</h3>
              <CheckCircle2 className="w-5 h-5 text-accent" />
            </div>
            <p className="text-3xl font-bold">${user?.hourlyRate ? user.hourlyRate * 160 : 0}</p>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex gap-2 border-b border-border">
            <button className="px-4 py-2 font-semibold border-b-2 border-primary">
              All Tasks
            </button>
            <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
              Pending
            </button>
            <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
              In Progress
            </button>
            <button className="px-4 py-2 text-muted-foreground hover:text-foreground">
              Completed
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border font-semibold text-sm">
            <div>Task Title</div>
            <div>Client</div>
            <div>Priority</div>
            <div>Deadline</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {assignedTasks.map((task, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border last:border-0 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium">{task.title}</div>
              <div className="text-muted-foreground">{task.client}</div>
              <div>
                <Badge
                  variant={task.priority === "High" ? "destructive" : "secondary"}
                  className={
                    task.priority === "Medium"
                      ? "bg-warning/10 text-warning border-warning/20"
                      : ""
                  }
                >
                  {task.priority}
                </Badge>
              </div>
              <div className="text-muted-foreground">{task.deadline}</div>
              <div>
                <Badge
                  variant={task.status === "In Progress" ? "default" : "secondary"}
                  className={
                    task.status === "Pending"
                      ? "bg-warning text-warning-foreground"
                      : ""
                  }
                >
                  {task.status}
                </Badge>
              </div>
              <div>
                <Button variant="link" className="text-primary" asChild>
                  <Link to="/task-details">View Details</Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardAssistant;
