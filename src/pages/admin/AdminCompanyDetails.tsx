import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  ShieldCheck,
  Ban,
  RefreshCcw,
  Users,
  UserCog,
  User,
} from "lucide-react";

const AdminCompanyDetails = () => {
  const { companyId } = useParams();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [company, setCompany] = useState<any | null>(null);

  const loadCompany = async () => {
    try {
      setLoading(true);
      const response = await api.adminGetCompany(companyId!);
      setCompany(response.data.company);
    } catch (err: any) {
      toast({
        title: "Failed to load company",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompany();
  }, [companyId]);

  const handleVerify = async () => {
    try {
      await api.adminVerifyCompany(companyId!);
      toast({ title: "Company verified" });
      loadCompany();
    } catch (err: any) {
      toast({ title: "Verification failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSuspend = async () => {
    try {
      await api.adminSuspendCompany(companyId!);
      toast({ title: "Company suspended" });
      loadCompany();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  const handleReactivate = async () => {
    try {
      await api.adminReactivateCompany(companyId!);
      toast({ title: "Company reactivated" });
      loadCompany();
    } catch (err: any) {
      toast({ title: "Action failed", description: err.message, variant: "destructive" });
    }
  };

  if (loading)
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Loading company information...</p>
      </div>
    );

  if (!company)
    return (
      <div className="p-6">
        <p className="text-destructive">Company not found.</p>
      </div>
    );

  const users = company.users || [];

  const executives = users.filter((u: any) => u.role === "executive");
  const managers = users.filter((u: any) => u.role === "manager");
  const assistants = users.filter((u: any) => u.role === "assistant");
  const inactive = users.filter((u: any) => !u.isActive);
  const pending = users.filter((u: any) => u.invitationStatus === "pending");

  return (
    <div className="min-h-screen bg-background p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <Link to="/admin/companies" className="flex items-center gap-2 text-primary hover:underline">
          <ArrowLeft className="w-5 h-5" />
          Back to Companies
        </Link>
      </div>

      {/* Company Overview Card */}
      <div className="bg-card border border-border rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Building2 className="w-10 h-10 text-primary" />
          <div>
            <h2 className="text-2xl font-bold">{company.name}</h2>
            <p className="text-muted-foreground">{company.industry || "No industry specified"}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-4">
          <Badge variant={company.isActive ? "default" : "destructive"}>
            {company.isActive ? "Active" : "Suspended"}
          </Badge>

          <Badge variant={company.isVerified ? "default" : "secondary"}>
            {company.isVerified ? "Verified" : "Unverified"}
          </Badge>

          <Badge>{company.size || "N/A"} Employees</Badge>

          <Badge variant="outline">
            Code: {company.companyCode}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground">
          Created on: {new Date(company.createdAt).toLocaleDateString()}
        </p>

        {/* Actions */}
        <div className="flex gap-3 mt-6">
          {!company.isVerified && (
            <Button onClick={handleVerify} variant="outline">
              <ShieldCheck className="w-4 h-4 mr-2" />
              Verify Company
            </Button>
          )}

          {company.isActive ? (
            <Button onClick={handleSuspend} variant="destructive">
              <Ban className="w-4 h-4 mr-2" />
              Suspend
            </Button>
          ) : (
            <Button onClick={handleReactivate} variant="outline">
              <RefreshCcw className="w-4 h-4 mr-2" />
              Reactivate
            </Button>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Executives */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Executives ({executives.length})
          </h3>

          {executives.length === 0 ? (
            <p className="text-muted-foreground text-sm">No executives.</p>
          ) : (
            <ul className="space-y-2">
              {executives.map((u: any) => (
                <li key={u.id} className="flex justify-between border-b pb-2 border-border">
                  <span>{u.firstName} {u.lastName}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Managers */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="text-xl font-bold mb-3 flex items-center gap-2">
            <UserCog className="w-5 h-5 text-accent" />
            Managers ({managers.length})
          </h3>

          {managers.length === 0 ? (
            <p className="text-muted-foreground text-sm">No managers.</p>
          ) : (
            <ul className="space-y-2">
              {managers.map((u: any) => (
                <li key={u.id} className="flex justify-between border-b pb-2 border-border">
                  <span>{u.firstName} {u.lastName}</span>
                  <span className="text-xs text-muted-foreground">{u.email}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Assistants + Pending + Inactive */}
      <div className="grid md:grid-cols-3 gap-6 mt-6">
        {/* Assistants */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-3">Assistants ({assistants.length})</h3>

          {assistants.length === 0 ? (
            <p className="text-muted-foreground text-sm">No assistants.</p>
          ) : (
            <ul className="space-y-2">
              {assistants.map((u: any) => (
                <li key={u.id} className="border-b pb-2 border-border">
                  {u.firstName} {u.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Pending Verification */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-3">Pending Verification ({pending.length})</h3>

          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">None pending.</p>
          ) : (
            <ul className="space-y-2">
              {pending.map((u: any) => (
                <li key={u.id} className="border-b pb-2 border-border">
                  {u.firstName} {u.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Inactive */}
        <div className="bg-card border border-border rounded-2xl p-6">
          <h3 className="font-bold text-lg mb-3">Inactive Users ({inactive.length})</h3>

          {inactive.length === 0 ? (
            <p className="text-muted-foreground text-sm">No inactive users.</p>
          ) : (
            <ul className="space-y-2">
              {inactive.map((u: any) => (
                <li key={u.id} className="border-b pb-2 border-border">
                  {u.firstName} {u.lastName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCompanyDetails;
