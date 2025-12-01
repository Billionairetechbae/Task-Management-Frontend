import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Search,
  ShieldCheck,
  UserMinus,
  UserPlus,
  Trash2,
  RotateCcw,
  KeyRound,
} from "lucide-react";

const AdminUsers = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await api.adminGetUsers({
        search,
        role: roleFilter,
        status: statusFilter,
      });
      setUsers(response.data.users);
    } catch (err: any) {
      toast({
        title: "Failed to load users",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDeactivate = async (id: string) => {
    try {
      await api.adminDeactivateUser(id);
      toast({ title: "User deactivated" });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.adminReactivateUser(id);
      toast({ title: "User reactivated" });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this user?")) return;
    try {
      await api.adminDeleteUser(id);
      toast({ title: "User deleted permanently" });
      loadUsers();
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleResetPassword = async (id: string) => {
    try {
      await api.adminResetUserPassword(id);
      toast({ title: "Password reset", description: "Temporary password emailed" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" />
          Manage Users
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search Box */}
        <div className="relative w-full md:w-1/3">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search users by name or email..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadUsers()}
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-card"
        >
          <option value="">All Roles</option>
          <option value="executive">Executives</option>
          <option value="manager">Managers</option>
          <option value="assistant">Assistants</option>
          <option value="admin">Admins</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-card"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <Button onClick={loadUsers} className="md:ml-auto">
          Apply Filters
        </Button>
      </div>

      {/* Users Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted-foreground">
                  Loading...
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="px-4 py-4 font-medium">
                    {u.firstName} {u.lastName}
                  </td>
                  <td className="px-4 py-4">{u.email}</td>
                  <td className="px-4 py-4">
                    <Badge>{u.role}</Badge>
                  </td>
                  <td className="px-4 py-4">
                    <Badge
                      variant={u.isActive ? "default" : "destructive"}
                    >
                      {u.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </td>

                  <td className="px-4 py-4 flex gap-2">

                    {/* Reset Password */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResetPassword(u.id)}
                    >
                      <KeyRound className="w-4 h-4 mr-1" />
                      Reset
                    </Button>

                    {/* Activate / Deactivate */}
                    {u.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeactivate(u.id)}
                      >
                        <UserMinus className="w-4 h-4 mr-1" />
                        Deactivate
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReactivate(u.id)}
                      >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Reactivate
                      </Button>
                    )}

                    {/* Delete */}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(u.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
