import { useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

const ForgotPassword = () => {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      await api.request("/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setSent(true);

      toast({
        title: "Request Received",
        description: "If that email is registered, you will receive password reset instructions shortly.",
      });
    } catch (err: any) {
      const statusCode = err?.statusCode ?? err?.status;
      const description =
        statusCode === 429
          ? "Too many attempts. Please try again shortly."
          : err?.message || "Unable to send reset email";

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">

        <Link to="/" className="flex items-center gap-2 text-primary mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to Login
        </Link>

        {!sent ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Forgot Password?</h2>
            <p className="text-muted-foreground mb-6">
              Enter your email and we'll send you a reset link.
            </p>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  required
                  className="mt-2"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <Button className="w-full h-12" type="submit" disabled={loading}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending…
                  </span>
                ) : (
                  "Send Reset Email"
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4">Check Your Email</h2>
            <p className="text-muted-foreground mb-6">
              If <strong>{email}</strong> is registered, you will receive password reset instructions shortly.
            </p>

            <Link to="/" className="text-primary underline block text-center">
              Return to Login
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPassword;
