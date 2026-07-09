import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const AuthGoogleCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginWithGoogleToken } = useAuth();
  const { toast } = useToast();
  const [processing, setProcessing] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Check for errors from backend first
        const errorParam = searchParams.get("error");
        if (errorParam) {
          const errorMessages: Record<string, string> = {
            "invalid_state": "Invalid state parameter",
            "state_expired": "Authentication session expired",
            "google_auth_failed": "Google authentication failed",
          };
          throw new Error(errorMessages[errorParam] || "Authentication failed");
        }

        const token = searchParams.get("token");
        const redirect = searchParams.get("redirect");

        if (!token) {
          throw new Error("No authentication token received");
        }

        // Clear the token from URL
        const url = new URL(window.location.href);
        url.searchParams.delete("token");
        url.searchParams.delete("accountType");
        url.searchParams.delete("redirect");
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.toString());

        // Login with the token
        const { isAdmin } = await loginWithGoogleToken(token);

        if (isAdmin) {
          // Show admin account message like in Login page
          setError("This account belongs to the Admin Portal");
          return;
        }

        // Redirect
        if (redirect) {
          navigate(redirect);
        } else {
          navigate("/dashboard");
        }
      } catch (err: any) {
        console.error("Google callback error:", err);
        setError(err.message || "Failed to complete authentication");
        toast({
          title: "Authentication failed",
          description: err.message || "Please try again",
          variant: "destructive",
        });
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, loginWithGoogleToken, toast]);

  if (processing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <h2 className="text-xl font-semibold">Signing you in...</h2>
          <p className="text-muted-foreground">Please wait while we complete your authentication</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center max-w-md space-y-6">
          <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
            <svg
              className="w-8 h-8 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">{error}</h2>
          <p className="text-muted-foreground">
            {error === "This account belongs to the Admin Portal"
              ? "Please sign in through the Admin Portal instead."
              : "We couldn't complete your sign in. Please try again."}
          </p>
          <Button onClick={() => navigate("/")} className="w-full">
            Return to Login
          </Button>
        </div>
      </div>
    );
  }

  return null;
};

export default AuthGoogleCallback;
