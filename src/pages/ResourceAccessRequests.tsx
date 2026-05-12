import { useEffect, useState, useCallback } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { api, ResourceAccessRequest } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2, XCircle, ShieldCheck, Inbox } from "lucide-react";

const ResourceAccessRequests = () => {
  const { workspaceRole } = useAuth();
  const { toast } = useToast();
  const isReviewer =
    workspaceRole === "owner" ||
    workspaceRole === "admin" ||
    workspaceRole === "manager";

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ResourceAccessRequest[]>([]);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = isReviewer
        ? await api.getResourceAccessRequests({ status: "pending" })
        : await api.getMyResourceAccessRequests();
      setRequests(res?.data?.requests || []);
    } catch (e: any) {
      toast({
        title: "Failed to load",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [isReviewer, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (id: string, status: "approved" | "denied") => {
    setDecidingId(id);
    try {
      await api.decideResourceAccessRequest(id, status);
      toast({ title: status === "approved" ? "Approved" : "Denied" });
      await load();
    } catch (e: any) {
      toast({
        title: "Action failed",
        description: e?.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setDecidingId(null);
    }
  };

  const statusBadge = (s: ResourceAccessRequest["status"]) => {
    if (s === "approved") return <Badge className="bg-emerald-500/15 text-emerald-700 border-emerald-500/30">Approved</Badge>;
    if (s === "denied") return <Badge variant="destructive">Denied</Badge>;
    return <Badge variant="secondary">Pending</Badge>;
  };

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">
              {isReviewer ? "Client Access Requests" : "My Access Requests"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isReviewer
                ? "Review and approve external access to projects and tasks."
                : "Track the status of your access requests."}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : requests.length === 0 ? (
          <Card>
            <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
              <Inbox className="w-8 h-8" />
              <p>No access requests found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {requests.map((r) => (
              <Card key={r.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <CardTitle className="text-base">
                        {r.requester
                          ? `${r.requester.firstName} ${r.requester.lastName}`
                          : "Unknown user"}
                      </CardTitle>
                      {r.requester?.email && (
                        <p className="text-xs text-muted-foreground">
                          {r.requester.email}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize">
                        {r.resourceType}
                      </Badge>
                      {statusBadge(r.status)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {r.reason && (
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      “{r.reason}”
                    </p>
                  )}
                  <p className="text-[11px] text-muted-foreground">
                    Resource ID: <code>{r.resourceId}</code> · Requested{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {isReviewer && r.status === "pending" && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => decide(r.id, "approved")}
                        disabled={decidingId === r.id}
                        className="gap-1.5"
                      >
                        {decidingId === r.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => decide(r.id, "denied")}
                        disabled={decidingId === r.id}
                        className="gap-1.5"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Deny
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ResourceAccessRequests;
