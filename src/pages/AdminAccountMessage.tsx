import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { getEnv } from "@/lib/env";
import { ShieldAlert } from "lucide-react";

const AdminAccountMessage = () => {
  const adminPortalUrl = getEnv("VITE_ADMIN_PORTAL_URL");

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <ShieldAlert className="w-20 h-20 text-destructive mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-4">This account belongs to the Admin Portal</h1>
          <p className="text-muted-foreground text-lg mb-8">
            The account you signed in with is an administrator account and cannot be used in the Workspace application.
            <br />
            <br />
            Please sign in through the Admin Portal instead.
          </p>
        </div>
        
        <div className="space-y-3">
          {adminPortalUrl && (
            <Button asChild className="w-full">
              <a href={adminPortalUrl} target="_blank" rel="noopener noreferrer">
                Open Admin Portal
              </a>
            </Button>
          )}
          <Button asChild variant="outline" className="w-full">
            <Link to="/">Return to Login</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminAccountMessage;
