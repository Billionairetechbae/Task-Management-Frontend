import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";
import Logo from "@/components/Logo";

const Plans = () => {
  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-4">
          <Logo className="h-8" />
        </div>

        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Welcome to Admiino! Choose Your Productivity Path.</h2>
          <p className="text-muted-foreground text-lg">
            Select the plan that best fits your needs and start delegating tasks efficiently.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className="bg-card border-2 border-border rounded-3xl p-8">
            <div className="mb-6">
              <h3 className="text-2xl font-bold mb-2">Free Forever</h3>
            </div>

            <h4 className="text-xl font-semibold mb-4">Free Delegation Hub</h4>
            <p className="text-muted-foreground mb-8">
              Assign tasks to your internal team, track deadlines, and monitor basic productivity.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Task List View with status tracking</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Assign to your internal team members</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Deadline and priority management</span>
              </div>
              <div className="flex items-start gap-3">
                <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                <span>Basic productivity tracking</span>
              </div>
            </div>

            <Button variant="outline" className="w-full h-12 font-semibold" asChild>
              <Link to="/dashboard">Start Free Trial</Link>
            </Button>
          </div>

          <div className="bg-card border-2 border-primary rounded-3xl p-8 relative">
            <div className="absolute -top-4 right-8">
              <span className="bg-accent text-accent-foreground px-6 py-2 rounded-full font-semibold text-sm">
                Popular
              </span>
            </div>

            <div className="mb-6">
              <span className="bg-primary text-primary-foreground px-6 py-2 rounded-full font-semibold text-sm inline-block">
                Premium
              </span>
            </div>

            <h4 className="text-xl font-semibold mb-4">Dedicated Executive Assistant</h4>
            <p className="text-muted-foreground mb-8">
              Instantly delegate tasks to a skilled Admiino Chief of Staff or Executive Assistant. Includes all delegation features plus full-service support.
            </p>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <span className="font-medium">Everything in Free, plus:</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <span>Dedicated Admiino Chief of Staff/EA</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <span>Full-service task execution</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <span>Priority support & communication</span>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 bg-primary rounded-full flex items-center justify-center mt-0.5 flex-shrink-0">
                  <Check className="w-3 h-3 text-primary-foreground" />
                </div>
                <span>Specialized expertise (Sales, Marketing, Ops)</span>
              </div>
            </div>

            <Button className="w-full h-12 font-semibold" asChild>
              <Link to="/assistants">Explore Assistants</Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Plans;
