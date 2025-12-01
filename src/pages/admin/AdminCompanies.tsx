import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Search,
  ShieldCheck,
  Ban,
  RefreshCcw,
} from "lucide-react";
import { Link } from "react-router-dom";

const AdminCompanies = () => {
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [companies, setCompanies] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const loadCompanies = async () => {
    try {
      setLoading(true);
      const response = await api.adminGetCompanies({
        search,
        status: statusFilter,
      });
      setCompanies(response.data.companies);
    } catch (err: any) {
      toast({
        title: "Failed to load companies",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleVerify = async (id: string) => {
    try {
      await api.adminVerifyCompany(id);
      toast({ title: "Company verified" });
      loadCompanies();
    } catch (err: any) {
      toast({ title: "Failed to verify company", description: err.message, variant: "destructive" });
    }
  };

  const handleSuspend = async (id: string) => {
    try {
      await api.adminSuspendCompany(id);
      toast({ title: "Company suspended" });
      loadCompanies();
    } catch (err: any) {
      toast({ title: "Failed to suspend company", description: err.message, variant: "destructive" });
    }
  };

  const handleReactivate = async (id: string) => {
    try {
      await api.adminReactivateCompany(id);
      toast({ title: "Company reactivated" });
      loadCompanies();
    } catch (err: any) {
      toast({ title: "Failed to reactivate company", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold flex items-center gap-2">
          <Building2 className="w-8 h-8 text-primary" />
          Manage Companies
        </h2>
      </div>

      {/* Filters */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* Search */}
        <div className="relative w-full md:w-1/3">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-3" />
          <Input
            placeholder="Search companies..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && loadCompanies()}
          />
        </div>

        {/* Status */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 bg-card"
        >
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <Button onClick={loadCompanies} className="md:ml-auto">
          Apply Filters
        </Button>
      </div>

      {/* Table */}
      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted">
            <tr>
              <th className="px-4 py-3">Company</th>
              <th className="px-4 py-3">Industry</th>
              <th className="px-4 py-3">Members</th>
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
            ) : companies.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-6 text-muted-foreground">
                  No companies found.
                </td>
              </tr>
            ) : (
              companies.map((c) => (
                <tr key={c.id} className="border-t border-border">
                  <td className="px-4 py-4 font-medium">
                    <Link
                      to={`/admin/companies/${c.id}`}
                      className="hover:underline text-primary"
                    >
                      {c.name}
                    </Link>
                  </td>

                  <td className="px-4 py-4">{c.industry || "—"}</td>
                  <td className="px-4 py-4">{c.memberCount ?? "—"}</td>

                  <td className="px-4 py-4">
                    <Badge
                      variant={c.isActive ? "default" : "destructive"}
                    >
                      {c.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </td>

                  <td className="px-4 py-4 flex gap-2">
                    {!c.isVerified && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleVerify(c.id)}
                      >
                        <ShieldCheck className="w-4 h-4 mr-1" />
                        Verify
                      </Button>
                    )}

                    {c.isActive ? (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleSuspend(c.id)}
                      >
                        <Ban className="w-4 h-4 mr-1" />
                        Suspend
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReactivate(c.id)}
                      >
                        <RefreshCcw className="w-4 h-4 mr-1" />
                        Reactivate
                      </Button>
                    )}
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

export default AdminCompanies;
