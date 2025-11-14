import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Bot, Crown, HelpCircle, Plus, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";

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

const Dashboard = () => {
  const [showBanner, setShowBanner] = useState(true);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-primary font-bold text-2xl">
            admiino<span className="text-accent">°</span>
          </h1>

          <div className="flex items-center gap-4">
            <Button variant="outline" className="gap-2">
              <Bot className="w-5 h-5" />
              AI Hub
            </Button>
            <button className="relative">
              <HelpCircle className="w-6 h-6 text-muted-foreground" />
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-muted-foreground" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
            </button>
            <Button className="gap-2">
              <Plus className="w-5 h-5" />
              Delegate New Task
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        {showBanner && (
          <div className="bg-primary rounded-2xl p-6 mb-8 relative">
            <button
              onClick={() => setShowBanner(false)}
              className="absolute top-4 right-4 text-primary-foreground/80 hover:text-primary-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center flex-shrink-0">
                <Crown className="w-6 h-6 text-accent-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="text-primary-foreground font-bold text-xl mb-2">
                  Need more capacity?
                </h3>
                <p className="text-primary-foreground/90 mb-4">
                  Upgrade to Premium and hire a dedicated Chief of Staff to handle your tasks
                  professionally.
                </p>
                <Button
                  className="bg-accent hover:bg-accent/90 text-accent-foreground font-semibold"
                  asChild
                >
                  <Link to="/assistants">Hire a Chief of Staff Now</Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">My Tasks</h2>
          <p className="text-muted-foreground">Manage and track all delegated tasks</p>
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
          <div className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border font-semibold text-sm">
            <div>Task Title</div>
            <div>Priority</div>
            <div>Deadline</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {tasks.map((task, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr,1fr,1fr,1fr,1fr] gap-4 p-4 border-b border-border last:border-0 items-center hover:bg-muted/50 transition-colors"
            >
              <div className="font-medium">{task.title}</div>
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
                      : task.status === "Past Due"
                      ? "bg-destructive/10 text-destructive border-destructive/20"
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

export default Dashboard;
