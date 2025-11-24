import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const [role, setRole] = useState<"assistant" | "manager" | "executive">("assistant");
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    if (!email) {
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
        email,
        firstName,
        lastName,
        invitedRole: role,
      });

      toast({
        title: "Invitation Sent",
        description: `${role} invitation sent to ${email}`,
      });

      onSuccess();
      onOpenChange(false);

      setEmail("");
      setFirstName("");
      setLastName("");
      setRole("assistant");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          <div>
            <Label>Email *</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@company.com" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>First Name (optional)</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>

            <div>
              <Label>Last Name (optional)</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Invite As</Label>

            <Select value={role} onValueChange={(r: any) => setRole(r)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="assistant">Assistant</SelectItem>
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
