import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api, AssistanceRequest, AssistanceRequestStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Plus,
  Paperclip,
  Sparkles,
  ShieldCheck,
  Users,
  ListChecks,
} from "lucide-react";
import { format } from "date-fns";
import AssistanceRequestDialog from "@/components/AssistanceRequestDialog";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

const ExecutiveAssistanceRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [filters, setFilters] = useState<{
    status?: AssistanceRequestStatus;
    search: string;
  }>({ search: "" });

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.getMyAssistanceRequests({
        status: filters.status || undefined,
        search: filters.search || undefined,
      });
      setRequests(response.data.requests);
    } catch (error: any) {
      toast({
        title: "Failed to load requests",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm("Are you sure you want to cancel this request?")) return;

    try {
      await api.cancelAssistanceRequest(requestId);
      toast({
        title: "Request cancelled",
        description: "Your assistance request has been cancelled.",
      });
      loadRequests();
    } catch (error: any) {
      toast({
        title: "Cancellation failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      pending: "secondary",
      under_review: "outline",
      quoted: "default",
      accepted: "default",
      in_progress: "default",
      completed: "default",
      rejected: "destructive",
      cancelled: "destructive",
    };

    const icons: Record<string, React.ReactNode> = {
      pending: <AlertCircle className="w-3 h-3 mr-1" />,
      under_review: <Clock className="w-3 h-3 mr-1" />,
      quoted: <DollarSign className="w-3 h-3 mr-1" />,
      accepted: <CheckCircle className="w-3 h-3 mr-1" />,
      completed: <CheckCircle className="w-3 h-3 mr-1" />,
      rejected: <XCircle className="w-3 h-3 mr-1" />,
      cancelled: <XCircle className="w-3 h-3 mr-1" />,
      in_progress: <Clock className="w-3 h-3 mr-1" />,
    };

    const label = status.replace("_", " ");

    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {icons[status]}
        {label}
      </Badge>
    );
  };

  const getPriorityPill = (priority: string) => {
    const map: Record<string, string> = {
      low: "border-emerald-200 bg-emerald-50 text-emerald-800",
      medium: "border-amber-200 bg-amber-50 text-amber-800",
      high: "border-orange-200 bg-orange-50 text-orange-800",
      urgent: "border-red-200 bg-red-50 text-red-800",
    };
    return (
      <span
        className={[
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize",
          map[priority] || "border-border bg-muted text-foreground",
        ].join(" ")}
      >
        {priority}
      </span>
    );
  };

  const stats = useMemo(() => {
    const total = requests.length;
    const pendingReview = requests.filter((r) => r.status === "pending" || r.status === "under_review").length;
    const quotedAccepted = requests.filter((r) => r.status === "quoted" || r.status === "accepted").length;
    const completed = requests.filter((r) => r.status === "completed").length;
    return { total, pendingReview, quotedAccepted, completed };
  }, [requests]);

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <div className="mb-8">
          <Card className="overflow-hidden">
            <div className="relative">
              {/* soft gradient header */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-background" />
              <CardContent className="relative p-6 md:p-8">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground">
                      <Sparkles className="h-3.5 w-3.5 text-primary" />
                      External operators that plug into your tasks
                    </div>

                    <h1 className="mt-4 text-3xl md:text-4xl font-bold tracking-tight">
                      External Talent, Built Into Your Workflow
                    </h1>

                    <p className="mt-3 text-muted-foreground text-base md:text-lg">
                      Scale your team without the hiring overhead.
                    </p>

                    <p className="mt-3 text-muted-foreground">
                      Admiino gives you instant access to vetted operators who plug directly into your workspace so tasks don’t stall
                      when your team is stretched.
                    </p>

                    <p className="mt-3 text-muted-foreground">
                      Whether you need a Software Developer, Digital Marketer, Social Media Manager, Accountant, Chief of Staff, or
                      Executive Assistant, assign work the same way you would internally. We handle sourcing, vetting, and onboarding.
                      You stay focused on delivery.
                    </p>

                    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-start gap-3 rounded-lg border bg-background/70 p-3">
                        <Users className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Pre-vetted, trained operators</p>
                          <p className="text-xs text-muted-foreground">Ready to execute without onboarding drag</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border bg-background/70 p-3">
                        <ShieldCheck className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Role-based access and permissions</p>
                          <p className="text-xs text-muted-foreground">Controlled access. Cleaner accountability</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border bg-background/70 p-3">
                        <ListChecks className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Direct task assignment inside Admiino</p>
                          <p className="text-xs text-muted-foreground">No handoffs or parallel tools</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 rounded-lg border bg-background/70 p-3">
                        <Paperclip className="h-5 w-5 text-primary mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Transparent tracking and accountability</p>
                          <p className="text-xs text-muted-foreground">Everything logged and visible</p>
                        </div>
                      </div>
                    </div>

                    <p className="mt-4 text-sm text-muted-foreground">
                      No long hiring cycles. No messy handoffs.
                    </p>
                  </div>

                  <div className="flex flex-col items-stretch gap-3 lg:min-w-[260px]">
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                      <DialogTrigger asChild>
                        <Button className="gap-2 h-11">
                          <Plus className="w-4 h-4" />
                          New request
                        </Button>
                      </DialogTrigger>
                      <AssistanceRequestDialog
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                        onSuccess={loadRequests}
                      />
                    </Dialog>

                    <div className="rounded-lg border bg-background/70 p-4">
                      <p className="text-xs text-muted-foreground">Quick note</p>
                      <p className="mt-1 text-sm">
                        Create a request, attach context, and we’ll respond with a quote and timeline.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{stats.total}</CardTitle>
              <CardDescription>Total requests</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{stats.pendingReview}</CardTitle>
              <CardDescription>Pending review</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{stats.quotedAccepted}</CardTitle>
              <CardDescription>Quoted / accepted</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{stats.completed}</CardTitle>
              <CardDescription>Completed</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Filters + Table (Tabs wrapper just for nicer structure; no behavior changes) */}
        <Tabs defaultValue="requests" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 md:w-[360px]">
            <TabsTrigger value="requests">Requests</TabsTrigger>
            <TabsTrigger value="how">How it works</TabsTrigger>
          </TabsList>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col lg:flex-row gap-3 lg:items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search requests..."
                      className="pl-10 h-11"
                      value={filters.search}
                      onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                      onKeyDown={(e) => e.key === "Enter" && loadRequests()}
                    />
                  </div>

                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => {
                      if (value === "all") setFilters({ ...filters, status: undefined });
                      else setFilters({ ...filters, status: value as AssistanceRequestStatus });
                    }}
                  >
                    <SelectTrigger className="w-full lg:w-[220px] h-11">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="under_review">Under Review</SelectItem>
                      <SelectItem value="quoted">Quoted</SelectItem>
                      <SelectItem value="accepted">Accepted</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>

                  <Button onClick={loadRequests} variant="secondary" className="gap-2 h-11 w-full lg:w-auto">
                    <Filter className="w-4 h-4" />
                    Apply
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>My requests</CardTitle>
                <CardDescription>Track status, quotes, and delivery updates</CardDescription>
              </CardHeader>

              <CardContent>
                {loading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading requests...</p>
                  </div>
                ) : requests.length === 0 ? (
                  <div className="text-center py-12">
                    <Paperclip className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No requests yet</h3>
                    <p className="text-muted-foreground mb-6">Create a request and attach context so we can scope fast.</p>
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2 h-11">
                      <Plus className="w-4 h-4" />
                      Create your first request
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/40">
                          <TableHead>Title</TableHead>
                          <TableHead className="hidden md:table-cell">Category</TableHead>
                          <TableHead>Priority</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden lg:table-cell">Submitted</TableHead>
                          <TableHead className="hidden md:table-cell">Quote</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>

                      <TableBody>
                        {requests.map((request) => (
                          <TableRow key={request.id} className="hover:bg-muted/30">
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4 text-muted-foreground" />
                                <div className="min-w-0">
                                  <p className="truncate max-w-[380px]">{request.title}</p>
                                  <p className="text-xs text-muted-foreground md:hidden mt-1">
                                    <span className="mr-2">{request.category}</span>
                                    <span>•</span>
                                    <span className="ml-2">
                                      {format(new Date(request.createdAt), "MMM d, yyyy")}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline" className="capitalize">
                                {request.category}
                              </Badge>
                            </TableCell>

                            <TableCell>{getPriorityPill(request.priority)}</TableCell>

                            <TableCell>{getStatusBadge(request.status)}</TableCell>

                            <TableCell className="hidden lg:table-cell">
                              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(request.createdAt), "MMM d, yyyy")}
                              </div>
                            </TableCell>

                            <TableCell className="hidden md:table-cell">
                              {request.quotedPrice ? (
                                <div className="inline-flex items-center gap-1 font-medium">
                                  <DollarSign className="w-3 h-3" />
                                  {typeof request.quotedPrice === "number"
                                    ? request.quotedPrice.toFixed(2)
                                    : request.quotedPrice}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>

                            <TableCell className="text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setIsDetailsOpen(true);
                                  }}
                                  className="h-9 px-3"
                                >
                                  <Eye className="w-4 h-4 mr-1.5" />
                                  View
                                </Button>

                                {["pending", "under_review", "quoted"].includes(request.status) && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCancelRequest(request.id)}
                                    className="h-9 px-3 text-destructive hover:text-destructive"
                                  >
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="how">
            <Card>
              <CardHeader>
                <CardTitle>How it works</CardTitle>
                <CardDescription>What happens after you submit a request</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">1) Submit request</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Add title, details, deadline, and attachments. The more context, the faster we scope.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">2) We review + quote</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You’ll get quoted hours and price. Accept to kick off delivery.
                    </p>
                  </div>
                  <div className="rounded-lg border p-4">
                    <p className="text-sm font-medium">3) Delivery + updates</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Work progresses with visible tracking, status updates, and attachments.
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4">
                  <p className="text-sm font-medium">Tip</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    If you already have a task inside Admiino, paste the task link in the request description so the operator
                    can start immediately.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Request Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {selectedRequest.title}
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Status and Priority */}
                  <div className="flex flex-wrap gap-4">
                    <div>
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div className="mt-1">{getStatusBadge(selectedRequest.status)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Priority</Label>
                      <div className="mt-1">{getPriorityPill(selectedRequest.priority)}</div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Category</Label>
                      <div className="mt-1">
                        <Badge variant="secondary" className="capitalize">
                          {selectedRequest.category}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedRequest.description}</p>
                    </div>
                  </div>

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded-lg border p-4">
                      <Label className="text-xs text-muted-foreground">Estimated hours</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">{selectedRequest.estimatedHours || "Not specified"}</span>
                      </div>
                    </div>

                    <div className="rounded-lg border p-4">
                      <Label className="text-xs text-muted-foreground">Deadline</Label>
                      <div className="mt-2 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {selectedRequest.deadline ? format(new Date(selectedRequest.deadline), "PPP") : "Not specified"}
                        </span>
                      </div>
                    </div>

                    {selectedRequest.quotedPrice && (
                      <div className="rounded-lg border p-4">
                        <Label className="text-xs text-muted-foreground">Quoted price</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">
                            ${typeof selectedRequest.quotedPrice === "number"
                              ? selectedRequest.quotedPrice.toFixed(2)
                              : selectedRequest.quotedPrice}
                          </span>
                        </div>
                      </div>
                    )}

                    {selectedRequest.quotedHours && (
                      <div className="rounded-lg border p-4">
                        <Label className="text-xs text-muted-foreground">Quoted hours</Label>
                        <div className="mt-2 flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{selectedRequest.quotedHours} hours</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Notes */}
                  {selectedRequest.adminNotes && (
                    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                      <Label className="text-sm text-blue-900">Notes</Label>
                      <p className="mt-2 text-blue-900 whitespace-pre-wrap">{selectedRequest.adminNotes}</p>
                    </div>
                  )}

                  {/* Attachments */}
                  {selectedRequest.attachments.length > 0 && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Attachments</Label>
                      <div className="mt-2 space-y-2">
                        {selectedRequest.attachments.map((attachment, index) => (
                          <div
                            key={index}
                            className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                              <div className="min-w-0">
                                <p className="font-medium truncate">{attachment.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(attachment.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => window.open(attachment.url, "_blank")}
                              className="gap-2 w-full sm:w-auto"
                            >
                              <Download className="w-4 h-4" />
                              Download
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Timeline */}
                  <div className="rounded-lg border p-4">
                    <Label className="text-sm text-muted-foreground">Timeline</Label>
                    <div className="mt-3 space-y-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span>Submitted</span>
                        <span className="text-muted-foreground">{format(new Date(selectedRequest.createdAt), "PPp")}</span>
                      </div>

                      {selectedRequest.acceptedAt && (
                        <div className="flex items-center justify-between">
                          <span>Accepted</span>
                          <span className="text-muted-foreground">{format(new Date(selectedRequest.acceptedAt), "PPp")}</span>
                        </div>
                      )}

                      {selectedRequest.completedAt && (
                        <div className="flex items-center justify-between">
                          <span>Completed</span>
                          <span className="text-muted-foreground">
                            {format(new Date(selectedRequest.completedAt), "PPp")}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ExecutiveAssistanceRequests;
