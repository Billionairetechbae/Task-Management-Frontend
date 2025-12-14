import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api, AssistanceRequest, AssistanceRequestStatus } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  User,
  Building,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Download,
  Plus,
  Paperclip,
  ChevronRight,
} from "lucide-react";
import { format } from "date-fns";
import AssistanceRequestDialog from "@/components/AssistanceRequestDialog";

const ExecutiveAssistanceRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
    // Update the filters state to use the correct types
    const [filters, setFilters] = useState<{
    status?: AssistanceRequestStatus;
    search: string;
    }>({
    search: "",
    });

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
    };

    return (
      <Badge variant={variants[status] || "secondary"} className="capitalize">
        {icons[status]}
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      low: "bg-green-100 text-green-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800",
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Paperclip className="w-8 h-8 text-primary" />
              Admiino Assistance Requests
            </h1>
            <p className="text-muted-foreground mt-2">
              Request professional assistance from the Admiino team for your tasks
            </p>
          </div>
          
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Assistance Request
              </Button>
            </DialogTrigger>
            <AssistanceRequestDialog
              open={isCreateOpen}
              onOpenChange={setIsCreateOpen}
              onSuccess={loadRequests}
            />
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{requests.length}</CardTitle>
              <CardDescription>Total Requests</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                {requests.filter(r => r.status === "pending" || r.status === "under_review").length}
              </CardTitle>
              <CardDescription>Pending Review</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                {requests.filter(r => r.status === "quoted" || r.status === "accepted").length}
              </CardTitle>
              <CardDescription>Quoted/Accepted</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                {requests.filter(r => r.status === "completed").length}
              </CardTitle>
              <CardDescription>Completed</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search requests..."
                  className="pl-10"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  onKeyDown={(e) => e.key === "Enter" && loadRequests()}
                />
              </div>
              
                    <Select
                    value={filters.status || "all"} // Use "all" instead of empty string
                    onValueChange={(value) => {
                        if (value === "all") {
                        setFilters({ ...filters, status: undefined });
                        } else {
                        setFilters({ ...filters, status: value as AssistanceRequestStatus });
                        }
                    }}
                    >
                <SelectTrigger className="w-[180px]">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="All Status" />
                </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem> {/* Changed from empty string to "all" */}
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
              <Button onClick={loadRequests} className="gap-2">
                <Filter className="w-4 h-4" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>My Assistance Requests</CardTitle>
            <CardDescription>
              Track the status of your requests to Admiino
            </CardDescription>
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
                <h3 className="text-lg font-medium mb-2">No assistance requests yet</h3>
                <p className="text-muted-foreground mb-6">
                  Submit your first request to get help from the Admiino team
                </p>
                <Button onClick={() => setIsCreateOpen(true)} className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create First Request
                </Button>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Quoted Price</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                            <span className="truncate max-w-[200px]">
                              {request.title}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{request.category}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(request.priority)}
                          >
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(request.createdAt), "MMM d, yyyy")}
                          </div>
                        </TableCell>
                        <TableCell>
                          {request.quotedPrice ? (
                            <div className="flex items-center gap-1 font-medium">
                              <DollarSign className="w-3 h-3" />
                              {typeof request.quotedPrice === "number"
                                ? request.quotedPrice.toFixed(2)
                                : request.quotedPrice}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedRequest(request);
                                setIsDetailsOpen(true);
                              }}
                              className="h-8 px-2"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            
                            {["pending", "under_review", "quoted"].includes(request.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelRequest(request.id)}
                                className="h-8 px-2 text-destructive hover:text-destructive"
                              >
                                <XCircle className="w-4 h-4" />
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
                      <div className="mt-1">
                        <Badge
                          variant="outline"
                          className={getPriorityColor(selectedRequest.priority)}
                        >
                          {selectedRequest.priority}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm text-muted-foreground">Category</Label>
                      <div className="mt-1">
                        <Badge variant="secondary">{selectedRequest.category}</Badge>
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
                    <div>
                      <Label className="text-sm text-muted-foreground">Estimated Hours</Label>
                      <div className="mt-1 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {selectedRequest.estimatedHours || "Not specified"}
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm text-muted-foreground">Deadline</Label>
                      <div className="mt-1 flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {selectedRequest.deadline 
                          ? format(new Date(selectedRequest.deadline), "PPP")
                          : "Not specified"}
                      </div>
                    </div>
                    
                    {selectedRequest.quotedPrice && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Quoted Price</Label>
                        <div className="mt-1 flex items-center gap-1 font-medium">
                          <DollarSign className="w-4 h-4" />
                          ${typeof selectedRequest.quotedPrice === "number"
                            ? selectedRequest.quotedPrice.toFixed(2)
                            : selectedRequest.quotedPrice}
                        </div>
                      </div>
                    )}
                    
                    {selectedRequest.quotedHours && (
                      <div>
                        <Label className="text-sm text-muted-foreground">Quoted Hours</Label>
                        <div className="mt-1 flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {selectedRequest.quotedHours} hours
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Admin Notes */}
                  {selectedRequest.adminNotes && (
                    <div>
                      <Label className="text-sm text-muted-foreground">Admin Notes</Label>
                      <div className="mt-2 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <p className="text-blue-800 whitespace-pre-wrap">
                          {selectedRequest.adminNotes}
                        </p>
                      </div>
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
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <Paperclip className="w-4 h-4 text-muted-foreground" />
                              <div>
                                <p className="font-medium">{attachment.fileName}</p>
                                <p className="text-sm text-muted-foreground">
                                  {(attachment.fileSize / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => window.open(attachment.url, "_blank")}
                              className="gap-2"
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
                  <div>
                    <Label className="text-sm text-muted-foreground">Timeline</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span>Submitted</span>
                        <span className="text-muted-foreground">
                          {format(new Date(selectedRequest.createdAt), "PPp")}
                        </span>
                      </div>
                      {selectedRequest.acceptedAt && (
                        <div className="flex items-center justify-between text-sm">
                          <span>Accepted</span>
                          <span className="text-muted-foreground">
                            {format(new Date(selectedRequest.acceptedAt), "PPp")}
                          </span>
                        </div>
                      )}
                      {selectedRequest.completedAt && (
                        <div className="flex items-center justify-between text-sm">
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
    </div>
  );
};

export default ExecutiveAssistanceRequests;