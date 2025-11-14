import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check } from "lucide-react";
import { Link } from "react-router-dom";

const Login = () => {
  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      <div className="flex flex-col justify-center px-8 lg:px-16 py-12">
        <div className="mb-12">
          <h1 className="text-primary font-bold text-2xl">
            admiino<span className="text-accent">°</span>
          </h1>
        </div>

        <div className="max-w-md">
          <h2 className="text-4xl font-bold text-foreground mb-6">Welcome to Admiino</h2>
          <p className="text-muted-foreground text-lg mb-12">
            Your intelligent executive assistant platform that combines human expertise with AI-powered task routing for maximum productivity.
          </p>

          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-primary rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Smart Task Management</h3>
                <p className="text-muted-foreground">
                  Delegate and track tasks with ease across your entire organization.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-accent-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">AI-Powered Routing</h3>
                <p className="text-muted-foreground">
                  Automatically assign tasks to specialized AI agents for optimal results.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0 w-14 h-14 bg-success rounded-2xl flex items-center justify-center">
                <Check className="w-6 h-6 text-success-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-1">Real-Time Collaboration</h3>
                <p className="text-muted-foreground">
                  Communicate seamlessly with your assistants and track progress.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center px-8 py-12 bg-card">
        <div className="w-full max-w-md">
          <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
            <h2 className="text-3xl font-bold mb-2">Sign In</h2>
            <p className="text-muted-foreground mb-8">Your Dedicated Executive Assistant</p>

            <form className="space-y-6">
              <div>
                <Label htmlFor="email" className="text-sm font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="executive@company.com"
                  className="mt-2"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <Input id="password" type="password" placeholder="••••••••" className="mt-2" />
              </div>

              <Button className="w-full h-12 text-base font-semibold" asChild>
                <Link to="/plans">Sign In</Link>
              </Button>
            </form>

            <div className="flex items-center justify-between mt-6">
              <Link to="#" className="text-primary hover:underline font-medium">
                Forgot Password?
              </Link>
              <Link to="#" className="text-primary hover:underline font-medium">
                Create Account
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
