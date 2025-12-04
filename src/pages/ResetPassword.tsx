import { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const ResetPassword = () => {
  const { token } = useParams();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await api.request(`/auth/reset-password/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      setDone(true);
      toast({ title: "Password Reset!", description: "You can now log in." });

      setTimeout(() => navigate("/"), 1500);

    } catch (err: any) {
      toast({
        title: "Reset Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-card border border-border rounded-2xl p-8">

        {!done ? (
          <>
            <h2 className="text-2xl font-bold mb-4">Reset Password</h2>

            <form onSubmit={handleReset} className="space-y-6">
              <div>
                <Label>New Password</Label>
                <Input
                  type="password"
                  required
                  className="mt-2"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <Button className="w-full h-12" type="submit">
                Reset Password
              </Button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold mb-4 text-green-600">Password Updated!</h2>
            <Link to="/" className="text-primary underline text-center block">
              Return to Login
            </Link>
          </>
        )}

      </div>
    </div>
  );
};

export default ResetPassword;
