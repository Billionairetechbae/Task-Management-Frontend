import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Paperclip, RefreshCcw, XCircle, Send } from "lucide-react";

const AdminInvites = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [invites, setInvites] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [workspaceFilter, setWorkspaceFilter] = useState("");
  const [workspaces, setWorkspaces] = useState<any[]>([]);

  const loadInvites = async () => {
    try {
      setLoading(true);
      const res = await api.adminGetInvitesGlobal({
        workspaceId: workspaceFilter || undefined,
        search: search || undefined,
      });
      setInvites((res as any)?.data?.invites || (res as any)?.data || []);
    } catch (err: any) {
      toast({ title: "Failed to load invites", description: err?.message || "Try again", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvites();
    api.adminGetCompanies({}).then((res) => {
      setWorkspaces(res.data?.companies || []);
    }).catch(() => {});
  }, []);

  const handleRevoke = async (id: string) => {
    try {
      await api.adminRevokeInvite(id);
      toast({ title: "Invite revoked" });
      loadInvites();
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message || "Try again", variant: "destructive" });
    }
  };

  const handleResend = async (id: string) => {
    try {
      await api.adminResendInvite(id);
      toast({ title: "Invite resent" });
    } catch (err: any) {
      toast({ title: "Action failed", description: err?.message || "Try again", variant: "destructive" });
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold flex items-center gap-2">
            <Paperclip className="w-8 h-8 text-primary" />
            Invites
          </h2>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative w-full md:w-1/3">
            <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
            <Input
              placeholder="Search invites…"
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && loadInvites()}
            />
          </div>

          <select
            value={workspaceFilter}
            onChange={(e) => setWorkspaceFilter(e.target.value)}
            className="border px-3 py-2 rounded-lg bg-card"
          >
            <option value="">All Workspaces</option>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name || w.company?.name || w.id}</option>
            ))}
          </select>

          <Button onClick={loadInvites} className="gap-2">
            <RefreshCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Workspace</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-6">Loading…</td>
                </tr>
              ) : invites.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-muted-foreground">No invites found.</td>
                </tr>
              ) : (
                invites.map((inv: any) => (
                  <tr key={inv.id} className="border-t border-border">
                    <td className="px-4 py-3">{inv.email || "—"}</td>
                    <td className="px-4 py-3">{inv.company?.name || inv.workspaceName || "—"}</td>
                    <td className="px-4 py-3 capitalize">{inv.role || "—"}</td>
                    <td className="px-4 py-3 capitalize">{inv.status || "pending"}</td>
                    <td className="px-4 py-3">{inv.createdAt ? new Date(inv.createdAt).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleResend(inv.id)}>
                        <Send className="w-4 h-4 mr-1" />
                        Resend
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleRevoke(inv.id)}>
                        <XCircle className="w-4 h-4 mr-1" />
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminInvites;
