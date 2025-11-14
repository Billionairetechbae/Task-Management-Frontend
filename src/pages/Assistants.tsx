import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";
import { Link } from "react-router-dom";

const assistants = [
  {
    name: "Sarah Chen",
    role: "Chief of Staff",
    skills: ["Operations", "Strategic Planning", "Project Management"],
    experience: "8 years",
    rate: "$75/hour",
    status: "Available",
    selected: false,
  },
  {
    name: "Michael Rodriguez",
    role: "Sales Executive Assistant",
    skills: ["Sales", "CRM Management", "Client Relations"],
    experience: "6 years",
    rate: "$65/hour",
    status: "Available",
    selected: true,
  },
  {
    name: "Emily Thompson",
    role: "Marketing Chief of Staff",
    skills: ["Marketing", "Content Strategy", "Social Media"],
    experience: "7 years",
    rate: "$70/hour",
    status: "Available",
    selected: false,
  },
];

const Assistants = () => {
  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/plans"
          className="inline-flex items-center gap-2 text-foreground hover:text-primary mb-8 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Plans
        </Link>

        <div className="text-center mb-4">
          <h1 className="text-primary font-bold text-2xl">
            admiino<span className="text-accent">°</span>
          </h1>
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Choose Your Executive Assistant</h2>
          <p className="text-muted-foreground text-lg">
            Select a Chief of Staff or Executive Assistant based on their skills and expertise.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {assistants.map((assistant) => (
            <div
              key={assistant.name}
              className={`bg-card rounded-3xl p-8 transition-all ${
                assistant.selected ? "border-2 border-primary" : "border-2 border-border"
              }`}
            >
              <div className="flex flex-col items-center mb-6">
                <div className="relative mb-4">
                  <div className="w-24 h-24 bg-muted rounded-full" />
                  <div
                    className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-card ${
                      assistant.status === "Available" ? "bg-success" : "bg-warning"
                    }`}
                  />
                </div>
                <h3 className="text-xl font-bold text-center">{assistant.name}</h3>
                <p className="text-muted-foreground text-center">{assistant.role}</p>
              </div>

              <div className="flex flex-wrap gap-2 mb-6 justify-center">
                {assistant.skills.map((skill) => (
                  <span
                    key={skill}
                    className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Experience:</span>
                  <span className="font-semibold">{assistant.experience}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Rate:</span>
                  <span className="font-semibold">{assistant.rate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <span className="text-success font-semibold">{assistant.status}</span>
                </div>
              </div>

              <Button className="w-full h-12 font-semibold" asChild>
                <Link to="/checkout">
                  <Check className="w-5 h-5 mr-2" />
                  Select Assistant
                </Link>
              </Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Assistants;
