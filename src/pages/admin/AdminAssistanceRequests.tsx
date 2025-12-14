import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { api, AssistanceRequest, AssistanceRequestPriority, AssistanceRequestStatus, Company } from "@/lib/api";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Search,
  Filter,
  Building,
  User,
  DollarSign,
  Clock,
  Calendar,
  FileText,
  Paperclip,
  Eye,
  MessageSquare,
  CheckCircle,
  XCircle,
  MoreVertical,
  Download,
  AlertCircle,
  Mail,
  Phone,
} from "lucide-react";
import { format } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";

const AdminAssistanceRequests = () => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<AssistanceRequest[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<AssistanceRequest | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = useState(false);
  const [isConvertOpen, setIsConvertOpen] = useState(false);
  const [filters, setFilters] = useState<{
    status?: AssistanceRequestStatus;
    priority?: AssistanceRequestPriority;
    companyId?: string;
    search: string;
  }>({
    search: "",
  });

  const [updateData, setUpdateData] = useState({
    status: "",
    adminNotes: "",
    quotedPrice: "",
    quotedHours: "",
    adminAssignedTo: "",
  });

  const [convertData, setConvertData] = useState({
    assigneeId: "",
    estimatedHours: "",
    priority: "medium",
    deadline: "",
  });

  useEffect(() => {
    loadRequests();
    loadCompanies();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response = await api.getAllAssistanceRequests({
        status: filters.status ? undefined : filters.status,
        priority: filters.priority ? undefined : filters.priority,
        companyId: filters.companyId ? undefined : filters.companyId,
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

  const loadCompanies = async () => {
    try {
      const response = await api.getAdminCompanies();
      setCompanies(response.data.companies);
    } catch (error) {
      console.error("Failed to load companies:", error);
    }
  };

  const handleUpdateRequest = async () => {
    try {
      if (!selectedRequest) return;
      
      const updatePayload: any = {};
      if (updateData.status) updatePayload.status = updateData.status;
      if (updateData.adminNotes) updatePayload.adminNotes = updateData.adminNotes;
      if (updateData.quotedPrice) updatePayload.quotedPrice = parseFloat(updateData.quotedPrice);
      if (updateData.quotedHours) updatePayload.quotedHours = parseFloat(updateData.quotedHours);
      if (updateData.adminAssignedTo) updatePayload.adminAssignedTo = updateData.adminAssignedTo;

      await api.updateAssistanceRequest(selectedRequest.id, updatePayload);
      
      toast({
        title: "Request updated",
        description: "Assistance request has been updated successfully.",
      });
      
      setIsUpdateOpen(false);
      loadRequests();
    } catch (error: any) {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleConvertToTask = async () => {
    try {
      if (!selectedRequest) return;
      
      const convertPayload: any = {};
      if (convertData.assigneeId) convertPayload.assigneeId = convertData.assigneeId;
      if (convertData.estimatedHours) convertPayload.estimatedHours = parseFloat(convertData.estimatedHours);
      if (convertData.priority) convertPayload.priority = convertData.priority;
      if (convertData.deadline) convertPayload.deadline = convertData.deadline;

      await api.convertAssistanceRequestToTask(selectedRequest.id, convertPayload);
      
      toast({
        title: "Request converted",
        description: "Assistance request has been converted to a task.",
      });
      
      setIsConvertOpen(false);
      loadRequests();
    } catch (error: any) {
      toast({
        title: "Conversion failed",
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
      in_progress: <Clock className="w-3 h-3 mr-1" />,
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
      low: "bg-green-100 text-green-800 border-green-200",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      high: "bg-orange-100 text-orange-800 border-orange-200",
      urgent: "bg-red-100 text-red-800 border-red-200",
    };
    return colors[priority] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const handleDownloadAttachment = (url: string, fileName: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Paperclip className="w-8 h-8 text-primary" />
            Admiino Assistance Requests
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage assistance requests from executives across all companies
          </p>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label className="text-sm">Search</Label>
                <div className="relative mt-1">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search requests..."
                    className="pl-10"
                    value={filters.search}
                    onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm">Status</Label>
                <Select
                  value={filters.status || "all"}
                  onValueChange={(value) => setFilters({ 
                    ...filters, 
                    status: value === "all" ? undefined : value as AssistanceRequestStatus 
                  })}
                >
                  <SelectTrigger className="mt-1">
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
              </div>

              <div>
                <Label className="text-sm">Company</Label>
                <Select
                  value={filters.companyId || "all"}
                  onValueChange={(value) => setFilters({ 
                    ...filters, 
                    companyId: value === "all" ? undefined : value 
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Companies" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Companies</SelectItem>
                    {companies.map((company) => (
                      <SelectItem key={company.id} value={company.id}>
                        {company.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm">Priority</Label>
                <Select
                  value={filters.priority || "all"}
                  onValueChange={(value) => setFilters({ 
                    ...filters, 
                    priority: value === "all" ? undefined : value as AssistanceRequestPriority 
                  })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priorities</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-2 mt-4">
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  search: "",
                  status: undefined,
                  priority: undefined,
                  companyId: undefined,
                })}
              >
                Clear Filters
              </Button>
              <Button onClick={loadRequests} className="gap-2">
                <Filter className="w-4 h-4" />
                Apply Filters
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
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
              <CardDescription>Needs Review</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">
                {requests.filter(r => r.status === "quoted").length}
              </CardTitle>
              <CardDescription>Awaiting Response</CardDescription>
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

        {/* Requests Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Assistance Requests</CardTitle>
            <CardDescription>
              {requests.length} requests found
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
                <h3 className="text-lg font-medium mb-2">No assistance requests</h3>
                <p className="text-muted-foreground">
                  No assistance requests have been submitted yet
                </p>
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Requester</TableHead>
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
                          <div className="flex items-center gap-2">
                            <Building className="w-4 h-4 text-muted-foreground" />
                            <span>{request.company?.name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {request.requester?.firstName} {request.requester?.lastName}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`capitalize ${getPriorityColor(request.priority)}`}
                          >
                            {request.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(request.status)}</TableCell>
                        <TableCell>
                          <div className="text-sm text-muted-foreground">
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setIsDetailsOpen(true);
                                }}
                              >
                                <Eye className="w-4 h-4 mr-2" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setUpdateData({
                                    status: request.status,
                                    adminNotes: request.adminNotes || "",
                                    quotedPrice: request.quotedPrice?.toString() || "",
                                    quotedHours: request.quotedHours?.toString() || "",
                                    adminAssignedTo: request.adminAssignedTo || "",
                                  });
                                  setIsUpdateOpen(true);
                                }}
                              >
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Update Status
                              </DropdownMenuItem>
                              {["accepted", "quoted"].includes(request.status) && !request.taskId && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setSelectedRequest(request);
                                    setConvertData({
                                      assigneeId: "",
                                      estimatedHours: request.estimatedHours?.toString() || "",
                                      priority: request.priority,
                                      deadline: request.deadline || "",
                                    });
                                    setIsConvertOpen(true);
                                  }}
                                >
                                  <CheckCircle className="w-4 h-4 mr-2" />
                                  Convert to Task
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ========== DETAILS DIALOG ========== */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            {selectedRequest && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    {selectedRequest.title}
                  </DialogTitle>
                  <DialogDescription>
                    Request ID: {selectedRequest.id}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6">
                  {/* Status and Priority Row */}
                  <div className="flex flex-wrap gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Status</Label>
                      <div>{getStatusBadge(selectedRequest.status)}</div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Priority</Label>
                      <div>
                        <Badge
                          variant="outline"
                          className={`capitalize ${getPriorityColor(selectedRequest.priority)}`}
                        >
                          {selectedRequest.priority}
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm text-muted-foreground">Category</Label>
                      <div>
                        <Badge variant="secondary">{selectedRequest.category}</Badge>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Request Details */}
                  <div>
                    <Label className="text-sm text-muted-foreground">Description</Label>
                    <div className="mt-2 p-4 bg-muted rounded-lg">
                      <p className="whitespace-pre-wrap">{selectedRequest.description}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Company Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Building className="w-5 h-5" />
                          Company Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Company Name</Label>
                          <p className="font-medium">{selectedRequest.company?.name || "Unknown"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Industry</Label>
                          <p>{selectedRequest.company?.industry || "Not specified"}</p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Company Code</Label>
                          <p className="font-mono">{selectedRequest.company?.companyCode || "N/A"}</p>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Requester Information */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Requester Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm text-muted-foreground">Name</Label>
                          <p className="font-medium">
                            {selectedRequest.requester?.firstName} {selectedRequest.requester?.lastName}
                          </p>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Email</Label>
                          <div className="flex items-center gap-2">
                            <Mail className="w-4 h-4 text-muted-foreground" />
                            <p>{selectedRequest.requester?.email || "Not available"}</p>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm text-muted-foreground">Role</Label>
                          <Badge variant="outline" className="capitalize">
                            {selectedRequest.requester?.role || "Unknown"}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Pricing and Hours */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <DollarSign className="w-5 h-5" />
                          Pricing Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Quoted Price</Label>
                            <div className="flex items-center gap-1 font-medium text-lg">
                              <DollarSign className="w-4 h-4" />
                              {typeof selectedRequest.quotedPrice === "number"
                                ? selectedRequest.quotedPrice.toFixed(2)
                                : selectedRequest.quotedPrice || "Not quoted"}
                            </div>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Quoted Hours</Label>
                            <div className="flex items-center gap-1 font-medium">
                              <Clock className="w-4 h-4" />
                              {selectedRequest.quotedHours ? `${selectedRequest.quotedHours} hours` : "Not specified"}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm text-muted-foreground">Estimated Hours</Label>
                            <p>{selectedRequest.estimatedHours || "Not specified"}</p>
                          </div>
                          <div>
                            <Label className="text-sm text-muted-foreground">Task ID</Label>
                            <p className="font-mono text-sm truncate">
                              {selectedRequest.taskId || "Not converted to task"}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Timeline */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Calendar className="w-5 h-5" />
                          Timeline
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-sm text-muted-foreground">Submitted</Label>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span>{format(new Date(selectedRequest.createdAt), "PPpp")}</span>
                          </div>
                        </div>
                        {selectedRequest.acceptedAt && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Accepted</Label>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>{format(new Date(selectedRequest.acceptedAt), "PPpp")}</span>
                            </div>
                          </div>
                        )}
                        {selectedRequest.completedAt && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Completed</Label>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span>{format(new Date(selectedRequest.completedAt), "PPpp")}</span>
                            </div>
                          </div>
                        )}
                        {selectedRequest.deadline && (
                          <div>
                            <Label className="text-sm text-muted-foreground">Deadline</Label>
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              <span>{format(new Date(selectedRequest.deadline), "PP")}</span>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Admin Information */}
                  {selectedRequest.adminAssignedTo && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Assigned Admin
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">Admin ID: {selectedRequest.adminAssignedTo}</p>
                            <p className="text-sm text-muted-foreground">Assigned to handle this request</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Admin Notes */}
                  {selectedRequest.adminNotes && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" />
                          Admin Notes
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-blue-800 whitespace-pre-wrap">{selectedRequest.adminNotes}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Attachments */}
                  {selectedRequest.attachments && selectedRequest.attachments.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Paperclip className="w-5 h-5" />
                          Attachments ({selectedRequest.attachments.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {selectedRequest.attachments.map((attachment, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div className="flex items-center gap-3">
                                <Paperclip className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="font-medium">{attachment.fileName || `Attachment ${index + 1}`}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {attachment.fileSize ? `${(attachment.fileSize / 1024).toFixed(1)} KB` : "Size unknown"}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => window.open(attachment.url, '_blank')}
                                >
                                  View
                                </Button>
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleDownloadAttachment(attachment.url, attachment.fileName)}
                                  className="gap-2"
                                >
                                  <Download className="w-4 h-4" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                    Close
                  </Button>
                  <Button
                    onClick={() => {
                      setIsDetailsOpen(false);
                      setSelectedRequest(selectedRequest);
                      setUpdateData({
                        status: selectedRequest.status,
                        adminNotes: selectedRequest.adminNotes || "",
                        quotedPrice: selectedRequest.quotedPrice?.toString() || "",
                        quotedHours: selectedRequest.quotedHours?.toString() || "",
                        adminAssignedTo: selectedRequest.adminAssignedTo || "",
                      });
                      setIsUpdateOpen(true);
                    }}
                  >
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Update Request
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Dialog */}
        <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Update Assistance Request</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select
                  value={updateData.status}
                  onValueChange={(value) => setUpdateData({ ...updateData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="under_review">Under Review</SelectItem>
                    <SelectItem value="quoted">Quoted</SelectItem>
                    <SelectItem value="accepted">Accepted</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Admin Notes</Label>
                <Textarea
                  value={updateData.adminNotes}
                  onChange={(e) => setUpdateData({ ...updateData, adminNotes: e.target.value })}
                  placeholder="Add notes or comments for the executive..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Quoted Price ($)</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={updateData.quotedPrice}
                    onChange={(e) => setUpdateData({ ...updateData, quotedPrice: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Quoted Hours</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.5"
                    value={updateData.quotedHours}
                    onChange={(e) => setUpdateData({ ...updateData, quotedHours: e.target.value })}
                    placeholder="0"
                  />
                </div>
              </div>

              <div>
                <Label>Assign to Admin (Optional)</Label>
                <Input
                  value={updateData.adminAssignedTo}
                  onChange={(e) => setUpdateData({ ...updateData, adminAssignedTo: e.target.value })}
                  placeholder="Admin user ID"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsUpdateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleUpdateRequest}>
                Update Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Convert to Task Dialog */}
        <Dialog open={isConvertOpen} onOpenChange={setIsConvertOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Convert to Task</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label>Assign to User ID (Optional)</Label>
                <Input
                  value={convertData.assigneeId}
                  onChange={(e) => setConvertData({ ...convertData, assigneeId: e.target.value })}
                  placeholder="User ID to assign task to"
                />
              </div>

              <div>
                <Label>Estimated Hours</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  value={convertData.estimatedHours}
                  onChange={(e) => setConvertData({ ...convertData, estimatedHours: e.target.value })}
                  placeholder="0"
                />
              </div>

              <div>
                <Label>Priority</Label>
                <Select
                  value={convertData.priority}
                  onValueChange={(value) => setConvertData({ ...convertData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Deadline (Optional)</Label>
                <Input
                  type="datetime-local"
                  value={convertData.deadline}
                  onChange={(e) => setConvertData({ ...convertData, deadline: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsConvertOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleConvertToTask}>
                Convert to Task
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdminAssistanceRequests;