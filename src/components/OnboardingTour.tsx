import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ClipboardList,
  Users,
  Bot,
  Building2,
  Bell,
  Settings,
  ChevronRight,
  ChevronLeft,
  X,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tip?: string;
}

const executiveTourSteps: TourStep[] = [
  {
    title: "Welcome to Admiino! 🎉",
    description: "We're excited to have you on board. Let's take a quick tour to help you get started with managing your executive tasks and team.",
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    tip: "This tour will only take about 1 minute.",
  },
  {
    title: "Your Dashboard",
    description: "The dashboard gives you an overview of all your tasks, team activity, and key metrics. Check pending tasks, completion rates, and urgent items at a glance.",
    icon: <LayoutDashboard className="w-12 h-12 text-primary" />,
    tip: "Pro tip: Click on any stat card to dive deeper into the details.",
  },
  {
    title: "Hire Talent",
    description: "Need help with specialized tasks? Request assistance from the Admiino team. Submit your requirements and we'll match you with the right professionals.",
    icon: <Users className="w-12 h-12 text-primary" />,
    tip: "You can find this in the sidebar or the highlighted button on your dashboard.",
  },
  {
    title: "Team Directory",
    description: "View all members of your organization. Filter by role, search by name, and click on anyone to view their full profile and task history.",
    icon: <Users className="w-12 h-12 text-primary" />,
    tip: "Great for finding the right person to assign tasks to.",
  },
  {
    title: "Team Management",
    description: "Invite new team members, verify pending requests, and manage your team_member pool. Keep your team organized and efficient.",
    icon: <Settings className="w-12 h-12 text-primary" />,
    tip: "Use the company code to invite assistants to join your organization.",
  },
  {
    title: "AI Hub",
    description: "Leverage AI agents to automate routine tasks. Our AI assistants handle marketing, operations, and sales tasks automatically.",
    icon: <Bot className="w-12 h-12 text-primary" />,
    tip: "Coming soon: Custom AI agent configurations.",
  },
  {
    title: "Company Profile",
    description: "Manage your company information, update settings, and share your company code with new team members.",
    icon: <Building2 className="w-12 h-12 text-primary" />,
    tip: "Keep your company info up-to-date for better team collaboration.",
  },
  {
    title: "You're All Set! 🚀",
    description: "You're ready to start delegating tasks and boosting productivity. The sidebar navigation will always be there to help you move between sections.",
    icon: <Sparkles className="w-12 h-12 text-success" />,
    tip: "Press 'B' anytime to toggle the sidebar on/off.",
  },
];

const assistantTourSteps: TourStep[] = [
  {
    title: "Welcome to Admiino! 🎉",
    description: "We're excited to have you join the team. Let's take a quick tour to help you get started with your tasks and collaboration tools.",
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    tip: "This tour will only take about 1 minute.",
  },
  {
    title: "Your Dashboard",
    description: "This is your home base. See all tasks assigned to you, track your progress, and stay on top of deadlines.",
    icon: <LayoutDashboard className="w-12 h-12 text-primary" />,
    tip: "Use the status filters to focus on pending or in-progress tasks.",
  },
  {
    title: "My Tasks",
    description: "View and manage all tasks assigned to you. Update status, add comments, and mark tasks as complete when done.",
    icon: <ClipboardList className="w-12 h-12 text-primary" />,
    tip: "Click on any task to see full details and attachments.",
  },
  {
    title: "Team Directory",
    description: "Connect with your colleagues. Browse the team directory to find executives and other assistants in your organization.",
    icon: <Users className="w-12 h-12 text-primary" />,
    tip: "Use search to quickly find team members.",
  },
  {
    title: "You're All Set! 🚀",
    description: "You're ready to start tackling tasks and contributing to your team. The sidebar will help you navigate around quickly.",
    icon: <Sparkles className="w-12 h-12 text-success" />,
    tip: "Press 'B' anytime to toggle the sidebar on/off.",
  },
];

const managerTourSteps: TourStep[] = [
  {
    title: "Welcome to Admiino! 🎉",
    description: "As a manager, you have powerful tools to oversee your team and coordinate tasks. Let's explore them together.",
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    tip: "This tour will only take about 1 minute.",
  },
  {
    title: "Manager Dashboard",
    description: "Get an overview of team performance, pending tasks, and key metrics. Monitor workloads and ensure balanced task distribution.",
    icon: <LayoutDashboard className="w-12 h-12 text-primary" />,
    tip: "Click on metrics to drill down into detailed reports.",
  },
  {
    title: "Team Directory",
    description: "View all team members, their roles, and current status. Perfect for finding the right person for each task.",
    icon: <Users className="w-12 h-12 text-primary" />,
    tip: "Filter by role to see executives or assistants specifically.",
  },
  {
    title: "TeamMembers Overview",
    description: "Monitor your team_member team. See who's available, their specializations, and current workload.",
    icon: <Users className="w-12 h-12 text-primary" />,
    tip: "Available assistants are highlighted for easy identification.",
  },
  {
    title: "You're All Set! 🚀",
    description: "You're ready to lead your team to success. Use the sidebar to navigate between different sections.",
    icon: <Sparkles className="w-12 h-12 text-success" />,
    tip: "Press 'B' anytime to toggle the sidebar on/off.",
  },
];

const adminTourSteps: TourStep[] = [
  {
    title: "Welcome, Admin! 🎉",
    description: "You have full access to the Admiino platform. Let's walk through the key admin features.",
    icon: <Sparkles className="w-12 h-12 text-primary" />,
    tip: "This tour covers the main admin capabilities.",
  },
  {
    title: "Admin Dashboard",
    description: "Get a bird's-eye view of the entire platform. Monitor users, companies, tasks, and system health from one place.",
    icon: <LayoutDashboard className="w-12 h-12 text-primary" />,
    tip: "Key metrics are always updated in real-time.",
  },
  {
    title: "User Management",
    description: "Manage all users across the platform. Activate, deactivate, reset passwords, and view user details.",
    icon: <Users className="w-12 h-12 text-primary" />,
    tip: "Use filters to quickly find specific users.",
  },
  {
    title: "Company Management",
    description: "Oversee all registered companies. Verify new companies, suspend suspicious accounts, and view company details.",
    icon: <Building2 className="w-12 h-12 text-primary" />,
    tip: "Click on any company to see their team and tasks.",
  },
  {
    title: "Analytics & Reports",
    description: "Access platform-wide analytics. Track growth, user activity, and system performance metrics.",
    icon: <Bot className="w-12 h-12 text-primary" />,
    tip: "Export reports for external analysis.",
  },
  {
    title: "You're All Set! 🚀",
    description: "You have all the tools to manage the platform effectively. Use the sidebar to access any admin function.",
    icon: <Sparkles className="w-12 h-12 text-success" />,
    tip: "Check system logs regularly for any issues.",
  },
];

const ONBOARDING_STORAGE_KEY = "admiino_onboarding_completed";

const OnboardingTour = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;

    // Check if user has completed onboarding
    const completedOnboarding = localStorage.getItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`);
    
    if (!completedOnboarding) {
      // Show tour after a brief delay to let the dashboard load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [user]);

  const getTourSteps = (): TourStep[] => {
    switch (user?.role) {
      case "executive":
        return executiveTourSteps;
      case "team_member":
        return assistantTourSteps;
      case "manager":
        return managerTourSteps;
      case "admin":
        return adminTourSteps;
      default:
        return executiveTourSteps;
    }
  };

  const tourSteps = getTourSteps();
  const currentTourStep = tourSteps[currentStep];
  const isLastStep = currentStep === tourSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    if (isLastStep) {
      handleComplete();
    } else {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (user) {
      localStorage.setItem(`${ONBOARDING_STORAGE_KEY}_${user.id}`, "true");
    }
    setIsOpen(false);
    setCurrentStep(0);
  };

  const handleSkip = () => {
    handleComplete();
  };

  if (!user) return null;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="sr-only">
          <DialogTitle>{currentTourStep?.title}</DialogTitle>
          <DialogDescription>Onboarding tour step</DialogDescription>
        </DialogHeader>

        {/* Skip button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-2 right-10 text-muted-foreground hover:text-foreground"
          onClick={handleSkip}
        >
          Skip Tour
        </Button>

        <div className="py-6">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              {currentTourStep?.icon}
            </div>
          </div>

          {/* Content */}
          <div className="text-center px-4">
            <h3 className="text-2xl font-bold mb-3">{currentTourStep?.title}</h3>
            <p className="text-muted-foreground mb-4 leading-relaxed">
              {currentTourStep?.description}
            </p>
            {currentTourStep?.tip && (
              <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                💡 {currentTourStep.tip}
              </div>
            )}
          </div>

          {/* Progress dots */}
          <div className="flex justify-center gap-2 mt-6">
            {tourSteps.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentStep(index)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all",
                  index === currentStep
                    ? "w-6 bg-primary"
                    : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 px-4">
            <Button
              variant="ghost"
              onClick={handlePrevious}
              disabled={isFirstStep}
              className="gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>

            <span className="text-sm text-muted-foreground">
              {currentStep + 1} / {tourSteps.length}
            </span>

            <Button onClick={handleNext} className="gap-1">
              {isLastStep ? (
                <>
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingTour;
