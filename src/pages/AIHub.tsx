import { Button } from "@/components/ui/button";
import { ArrowLeft, Bot, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const aiAgents = [
  {
    name: "Marketing AI",
    description: "Handles campaign briefs, social content, and brand materials",
    active: 12,
    successRate: "94%",
    color: "bg-accent",
    iconColor: "text-accent-foreground",
    bgColor: "bg-accent/10",
    borderColor: "border-accent/20",
  },
  {
    name: "Operations AI",
    description: "Manages schedules, logistics, and operational workflows",
    active: 8,
    successRate: "98%",
    color: "bg-primary",
    iconColor: "text-primary-foreground",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/20",
  },
  {
    name: "Sales AI",
    description: "Handles client outreach, proposals, and revenue operations",
    active: 15,
    successRate: "91%",
    color: "bg-success",
    iconColor: "text-success-foreground",
    bgColor: "bg-success/10",
    borderColor: "border-success/20",
  },
];

const AIHub = () => {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />
          <Link
            to="/dashboard"
            className="text-foreground hover:text-primary font-medium flex items-center gap-2"
          >
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
              <Bot className="w-7 h-7 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-3xl font-bold">Admiino AI Hub</h2>
            </div>
          </div>
          <p className="text-muted-foreground text-lg">
            Tasks are automatically routed to the best-suited AI agent
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-muted-foreground">Active Tasks</h3>
              <div className="w-10 h-10 bg-info/10 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-info" />
              </div>
            </div>
            <p className="text-4xl font-bold">35</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-muted-foreground">Completed This Week</h3>
              <div className="w-10 h-10 bg-success/10 rounded-xl flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
            </div>
            <p className="text-4xl font-bold">87</p>
          </div>

          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-muted-foreground">Avg Completion Rate</h3>
              <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-accent" />
              </div>
            </div>
            <p className="text-4xl font-bold">94%</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {aiAgents.map((agent) => (
            <div
              key={agent.name}
              className={`bg-card border-2 ${agent.borderColor} rounded-3xl p-8`}
            >
              <div className="mb-6">
                <div
                  className={`w-20 h-20 ${agent.color} rounded-2xl flex items-center justify-center mb-4`}
                >
                  <Bot className={`w-10 h-10 ${agent.iconColor}`} />
                </div>
                <h3 className="text-2xl font-bold mb-2">{agent.name}</h3>
                <p className="text-muted-foreground">{agent.description}</p>
              </div>

              <div className="space-y-4 mb-6 pb-6 border-b border-border">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Active</span>
                  <span className={`font-bold text-lg ${agent.color.replace("bg-", "text-")}`}>
                    {agent.active} tasks
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground text-sm">Success Rate</span>
                  <span className="font-bold text-lg">{agent.successRate}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Button variant="outline" className="font-semibold">
                  View Tasks
                </Button>
                <Button
                  className={`${agent.color} ${agent.iconColor} hover:opacity-90 font-semibold`}
                >
                  Assign Task
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default AIHub;
