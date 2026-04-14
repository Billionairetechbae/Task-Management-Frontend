import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

type InvitedRole = "team_member" | "manager" | "executive";

const InviteUserDialog = ({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) => {
  const { toast } = useToast();

  const [email, setEmail] = useState("");

  const [role, setRole] = useState<InvitedRole>("team_member");
  const [loading, setLoading] = useState(false);

  const resetForm = () => {
    setEmail("");
    setRole("team_member");
  };

  const handleInvite = async () => {
    if (!email.trim()) {
      toast({
        title: "Missing email",
        description: "Please enter at least an email.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      await api.inviteAssistant({
        email: email.trim(),
        invitedRole: role,
      });

      toast({
        title: "Invite sent",
        description: "The user will receive an invite email to join this workspace.",
      });

      onSuccess(); // reload team list
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      const isAlreadyMember =
        message.includes("already in this workspace") ||
        message.includes("already member");
      toast({
        title: "Error",
        description: isAlreadyMember
          ? "User is already in this workspace"
          : error.message || "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) resetForm();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Email *</Label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@company.com"
            />
          </div>

          <div>
            <Label>Invite As</Label>
            <Select value={role} onValueChange={(r: any) => setRole(r)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="team_member">TeamMember</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="executive">Executive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="w-full h-12" disabled={loading} onClick={handleInvite}>
            {loading ? "Sending Invite..." : "Send Invitation"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InviteUserDialog;