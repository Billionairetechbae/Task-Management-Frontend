import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Users } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const AdminDeletedUsers = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState([]);

  const loadUsers = async () => {
    try {
      const response = await api.adminGetDeletedUsers();
      setUsers(response.data.users);
    } catch (err: any) {
      toast({
        title: "Failed to load deleted users",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
          <Users className="w-8 h-8 text-primary" />
          Deleted Users
        </h2>

        <Card className="p-6 border-border border">
          {users.length === 0 ? (
            <p className="text-muted-foreground">No deleted users.</p>
          ) : (
            <ul className="space-y-3">
              {users.map((u: any) => (
                <li key={u.id} className="border-b pb-2 border-border">
                  {u.firstName} {u.lastName} — {u.email}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default AdminDeletedUsers;
