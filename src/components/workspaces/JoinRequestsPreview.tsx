import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus } from "lucide-react";
import { useWorkspaceJoinRequests } from "@/hooks/useWorkspaceJoinRequests";

export function JoinRequestsPreview({ compact = false }: { compact?: boolean }) {
  const query = useWorkspaceJoinRequests({ status: "pending", page: 1, pageSize: compact ? 1 : 3 });
  const count = query.data?.pagination.total || 0;
  const requests = query.data?.requests || [];
  return <Card data-testid="pending-join-requests">
    <CardHeader className="pb-3"><div className="flex items-center justify-between gap-3"><CardTitle className="flex items-center gap-2 text-base"><UserPlus className="h-4 w-4 text-primary" />Join Requests</CardTitle>{count > 0 && <Badge aria-label={`${count} pending join requests`}>{count}</Badge>}</div></CardHeader>
    <CardContent>
      {query.isPending ? <p className="text-sm text-muted-foreground">Loading requests…</p> : query.isError ? <p className="text-sm text-destructive">Pending requests could not be loaded.</p> : count === 0 ? <p className="text-sm text-muted-foreground">No pending workspace join requests.</p> : <div className="space-y-2">{requests.map((request) => <Link key={request.id} to={`/settings/workspace/join-requests?requestId=${encodeURIComponent(request.id)}`} className="block rounded-lg border p-3 transition-colors hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="text-sm font-medium">{[request.requester?.firstName, request.requester?.lastName].filter(Boolean).join(" ") || "Registered user"}</p>{!compact && <p className="mt-1 text-xs text-muted-foreground">{request.requester?.email} · {new Date(request.createdAt).toLocaleString()}</p>}</Link>)}</div>}
      <Button variant="outline" size="sm" className="mt-4" asChild><Link to="/settings/workspace/join-requests">View all requests</Link></Button>
    </CardContent>
  </Card>;
}
