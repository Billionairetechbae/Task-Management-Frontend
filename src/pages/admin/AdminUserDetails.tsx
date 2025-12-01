import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  User,
  ShieldCheck,
  Ban,
  RefreshCcw,
  Trash2,
  KeyRound,
  Building2,
} from "lucide-react";

const AdminUserDetails = () => {
  const { userId } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any | null>(null);

  const loadUser = async () => {
    try {
      setLoading(true);
      const response = await api.adminGetUserById(userId!);
      setUser(response.data.user);
    } catch (err: any) {
      toast({
        title: "Failed to load user",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [userId]);

  if (loading) return <div className="p-6">Loading user...</div>;

  if (!user) return <div className="p-6 text-destructive">User not found.</div>;

  const handleDeactivate = async () => {
    await api.adminDeactivateUser(userId!);
    toast({ title: "User deactivated" });
    loadUser();
  };

  const handleReactivate = async () => {
    await api.adminReactivateUser(userId!);
    toast({ title: "User reactivated" });
    loadUser();
  };

  const handleDelete = async () => {
    if (!confirm("Delete this user permanently?")) return;
    await api.adminDeleteUser(userId!);
    toast({ title: "User deleted" });
    window.location.href = "/admin/users";
  };

  const handleResetPassword = async () => {
    await api.adminResetUserPassword(userId!);
    toast({ title: "Password reset email sent" });
  };

  return (
    <div className="min-h-screen bg-background p-6">

      <Link to="/admin/users" className="flex items-center gap-2 mb-6 text-primary hover:underline">
        <ArrowLeft className="w-5 h-5" /> Back to Users
      </Link>

      <div className="bg-card border border-border rounded-2xl p-6">
        
        <div className="flex items-center gap-4 mb-4">
          <User className="w-10 h-10 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">
              {user.firstName} {user.lastName}
            </h2>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>

        <p className="text-sm mb-4">Role: <span className="font-semibold">{user.role}</span></p>

        {user.company && (
          <p className="text-sm mb-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Company: {user.company.name}
          </p>
        )}

        <p className="text-sm mb-4">
          Status:{" "}
          <span
            className={user.isActive ? "text-green-600 font-semibold" : "text-red-600 font-semibold"}
          >
            {user.isActive ? "Active" : "Inactive"}
          </span>
        </p>

        {/* ACTIONS */}
        <div className="flex gap-3 mt-6">

          {/* Reset Password */}
          <Button variant="outline" onClick={handleResetPassword}>
            <KeyRound className="w-4 h-4 mr-2" />
            Reset Password
          </Button>

          {/* Deactivate / Reactivate */}
          {user.isActive ? (
            <Button variant="destructive" onClick={handleDeactivate}>
              <Ban className="w-4 h-4 mr-2" /> Deactivate
            </Button>
          ) : (
            <Button variant="outline" onClick={handleReactivate}>
              <RefreshCcw className="w-4 h-4 mr-2" /> Reactivate
            </Button>
          )}

          {/* Delete */}
          <Button variant="outline" onClick={handleDelete}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete User
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetails;
