import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const Unauthorized = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <AlertTriangle className="w-20 h-20 text-destructive mx-auto mb-4" />
          <h1 className="text-4xl font-bold mb-2">Unauthorized Access</h1>
          <p className="text-muted-foreground text-lg">
            You don't have permission to access this page.
          </p>
        </div>
        
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link to="/">Go to Dashboard</Link>
          </Button>
          <Button variant="outline" onClick={logout} className="w-full">
            Logout
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
