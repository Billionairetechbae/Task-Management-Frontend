import { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

export default function ProjectInvite() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const handle = async (action: "accept" | "reject") => {
    if (!token) return;
    try {
      setBusy(true);
      if (action === "accept") {
        await api.acceptProjectInvite(token);
        setMessage("Invite accepted");
        toast({ title: "Invite accepted" });
      } else {
        await api.rejectProjectInvite(token);
        setMessage("Invite rejected");
        toast({ title: "Invite rejected" });
      }
    } catch (err: any) {
      const msg = err.message || "Action failed";
      setMessage(msg);
      toast({ title: "Action failed", description: msg, variant: "destructive" });
      if (/unauthorized|login/i.test(msg)) {
        navigate("/");
      }
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    setMessage("");
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Card className="max-w-md w-full p-6">
        <div className="mb-6 flex items-center justify-center">
          <Logo className="h-8" />
        </div>
        <h1 className="text-xl font-semibold mb-2 text-center">Project Invitation</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Use the buttons below to accept or reject this project invite.
        </p>
        {message && <p className="text-center text-sm mb-4">{message}</p>}
        <div className="flex gap-3 justify-center">
          <Button onClick={() => handle("accept")} disabled={busy || !token}>Accept</Button>
          <Button variant="outline" onClick={() => handle("reject")} disabled={busy || !token}>Reject</Button>
        </div>
        <div className="text-center mt-6">
          <Link to="/" className="text-xs text-primary hover:underline">Go to Login</Link>
        </div>
      </Card>
    </div>
  );
}

