import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, HelpCircle, User, Mail, Search, Filter, CheckCircle2, Clock, X, Crown, Users } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { api, Assistant } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/components/Logo";

const TeamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [specializationFilter, setSpecializationFilter] = useState<string>('all');
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);

  const isExecutive = user?.role === 'executive';
  const isAssistant = user?.role === 'assistant';

  const fetchTeamAssistants = async () => {
    try {
      setLoading(true);
      if (isExecutive) {
        const response = await api.getCompanyAssistants();
        setAssistants(response.data.assistants);
      } else {
        // For assistants, we might want to show limited team info or their own status
        // For now, we'll show an empty state with appropriate messaging
        setAssistants([]);
      }
    } catch (error) {
      console.error('Failed to fetch team assistants:', error);
      toast({
        title: "Error",
        description: "Failed to load team data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamAssistants();
  }, [isExecutive]);

  const handleVerifyAssistant = async (assistantId: string) => {
    try {
      await api.verifyAssistant(assistantId);
      toast({
        title: "Assistant verified!",
        description: "The assistant has been approved and can now receive tasks",
      });
      fetchTeamAssistants();
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleRejectAssistant = async (assistantId: string) => {
    try {
      await api.rejectAssistant(assistantId);
      toast({
        title: "Assistant rejected",
        description: "The assistant registration has been removed",
      });
      fetchTeamAssistants();
    } catch (error: any) {
      toast({
        title: "Rejection failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    }
  };

  const handleInviteAssistant = async () => {
    if (!inviteEmail) {
      toast({
        title: "Error",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }

    try {
      setInviteLoading(true);
      await api.inviteAssistant({ email: inviteEmail });
      toast({
        title: "Invitation sent!",
        description: `An invitation has been sent to ${inviteEmail}`,
      });
      setInviteEmail('');
      setInviteDialogOpen(false);
      fetchTeamAssistants();
    } catch (error: any) {
      toast({
        title: "Invitation failed",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    } finally {
      setInviteLoading(false);
    }
  };

  // Filter assistants based on search and filters
  const filteredAssistants = assistants.filter(assistant => {
    const matchesSearch = 
      assistant.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistant.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assistant.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'verified' && assistant.isVerified) ||
      (statusFilter === 'pending' && !assistant.isVerified);

    const matchesSpecialization = specializationFilter === 'all' || 
      assistant.specialization === specializationFilter;

    return matchesSearch && matchesStatus && matchesSpecialization;
  });

  const getStatusBadge = (assistant: Assistant) => {
    if (assistant.isVerified) {
      return (
        <Badge className="bg-success text-success-foreground">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Verified
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-warning/10 text-warning border-warning/20">
          <Clock className="w-3 h-3 mr-1" />
          Pending
        </Badge>
      );
    }
  };

  const getSpecializationBadge = (specialization: string) => {
    const colorMap: Record<string, string> = {
      sales: "bg-blue-100 text-blue-800 border-blue-200",
      marketing: "bg-purple-100 text-purple-800 border-purple-200",
      operations: "bg-green-100 text-green-800 border-green-200",
      general: "bg-gray-100 text-gray-800 border-gray-200",
      customer_support: "bg-orange-100 text-orange-800 border-orange-200",
    };
    return colorMap[specialization] || "bg-gray-100 text-gray-800 border-gray-200";
  };

  const pendingVerifications = assistants.filter(a => !a.isVerified).length;
  const verifiedAssistants = assistants.filter(a => a.isVerified).length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between">
          <Logo className="h-8" />

          <div className="flex items-center gap-4">
            <Button variant="outline" className="gap-2" asChild>
              <Link to="/dashboard-executive">
                <Users className="w-5 h-5" />
                Dashboard
              </Link>
            </Button>
            <button className="relative">
              <HelpCircle className="w-6 h-6 text-muted-foreground" />
            </button>
            <button className="relative">
              <Bell className="w-6 h-6 text-muted-foreground" />
              {isExecutive && pendingVerifications > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full" />
              )}
            </button>
            <Button variant="outline" asChild>
              <Link to="/profile">
                <User className="w-5 h-5 mr-2" />
                Profile
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">Team Management</h2>
              <p className="text-muted-foreground">
                {isExecutive 
                  ? "Manage your company assistants and verifications"
                  : "View your team information and status"
                }
              </p>
            </div>
            
            {isExecutive && (
              <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                <Mail className="w-5 h-5" />
                Invite Assistant
              </Button>
            )}
          </div>
        </div>

        {/* Executive View */}
        {isExecutive && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Assistants</CardTitle>
                  <Users className="w-4 h-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{assistants.length}</div>
                  <p className="text-xs text-muted-foreground">
                    Across all specializations
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Verified</CardTitle>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{verifiedAssistants}</div>
                  <p className="text-xs text-muted-foreground">
                    Active and verified
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Verification</CardTitle>
                  <Clock className="w-4 h-4 text-warning" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-warning">{pendingVerifications}</div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Filters and Search */}
            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search assistants by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <Filter className="w-4 h-4 mr-2" />
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={specializationFilter} onValueChange={setSpecializationFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Specializations</SelectItem>
                      <SelectItem value="sales">Sales</SelectItem>
                      <SelectItem value="marketing">Marketing</SelectItem>
                      <SelectItem value="operations">Operations</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="customer_support">Customer Support</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Assistants List */}
            {loading ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Loading team data...</p>
                </CardContent>
              </Card>
            ) : filteredAssistants.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="max-w-md mx-auto">
                    <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">No assistants found</h3>
                    <p className="text-muted-foreground mb-6">
                      {searchTerm || statusFilter !== 'all' || specializationFilter !== 'all'
                        ? "Try adjusting your search or filters"
                        : "Get started by inviting assistants to join your company"
                      }
                    </p>
                    <Button onClick={() => setInviteDialogOpen(true)} className="gap-2">
                      <Mail className="w-5 h-5" />
                      Invite Your First Assistant
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredAssistants.map((assistant) => (
                  <Card key={assistant.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-6 h-6 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold">
                              {assistant.firstName} {assistant.lastName}
                            </h3>
                            <p className="text-sm text-muted-foreground">{assistant.email}</p>
                            <div className="flex gap-2 mt-2">
                              {getStatusBadge(assistant)}
                              <Badge variant="outline" className={getSpecializationBadge(assistant.specialization)}>
                                {assistant.specialization}
                              </Badge>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {!assistant.isVerified && (
                            <>
                              <Button
                                size="sm"
                                onClick={() => handleVerifyAssistant(assistant.id)}
                                className="gap-2"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectAssistant(assistant.id)}
                              >
                                <X className="w-4 h-4" />
                                Reject
                              </Button>
                            </>
                          )}
                          {assistant.isVerified && (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Active
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Assistant View */}
        {isAssistant && (
          <Card>
            <CardContent className="p-8">
              <div className="max-w-md mx-auto text-center">
                <Users className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Team Overview</h3>
                <p className="text-muted-foreground mb-6">
                  {user?.isVerified
                    ? "You can view basic team information here. Contact your executive for detailed team management."
                    : "Once verified, you'll be able to see your team information here."
                  }
                </p>
                
                <div className="space-y-4 text-left bg-muted/50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Your Status</span>
                    {getStatusBadge(user as any)}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Specialization</span>
                    <Badge variant="outline" className={getSpecializationBadge(user?.specialization || 'general')}>
                      {user?.specialization || 'Not specified'}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Hourly Rate</span>
                    <span className="text-sm font-medium">${user?.hourlyRate || '0'}/hr</span>
                  </div>
                </div>

                {!user?.isVerified && (
                  <div className="bg-warning/10 border border-warning/20 rounded-lg p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-4 h-4 text-warning" />
                      <span className="font-medium text-warning">Pending Verification</span>
                    </div>
                    <p className="text-sm text-warning">
                      Your account is awaiting verification by the company executive. 
                      You'll gain full access to team features once approved.
                    </p>
                  </div>
                )}

                <Button variant="outline" asChild>
                  <Link to="/dashboard-assistant">
                    Back to Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Invite Dialog */}
        {inviteDialogOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Invite Assistant</CardTitle>
                <CardDescription>
                  Send an invitation to join your company team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Email Address
                  </label>
                  <Input
                    type="email"
                    placeholder="assistant@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  The assistant will receive an email invitation to join your company.
                  They'll need to complete their profile after signing up.
                </p>
              </CardContent>
              <CardContent className="flex gap-3 pt-0">
                <Button
                  variant="outline"
                  onClick={() => setInviteDialogOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInviteAssistant}
                  disabled={inviteLoading}
                  className="flex-1 gap-2"
                >
                  {inviteLoading ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Mail className="w-4 h-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default TeamManagement;