// src/lib/api.ts

/* ============================
   SHARED TYPES
============================ */

export type UserRole = "executive" | "manager" | "team_member" | "admin";

export interface Company {
  id: string;
  name: string;
  companyCode: string;
  industry: string | null;
  size: "1-10" | "11-50" | "51-200" | "201-500" | "500+" | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;

  companyId: string | null;
  company?: Company | null;

  role: UserRole;

  subscriptionTier: "free" | "premium";

  isVerified: boolean;
  invitationStatus: "pending" | "approved" | "rejected" | "invited" | "removed";
  invitedBy: string | null;

  isActive: boolean;

  specialization?: string | null;
  experience?: number | null;
  hourlyRate?: number | null;
  bio?: string | null;
  skills?: string[];

  isAvailable?: boolean;
  rating?: number;

  profilePictureUrl?: string | null;

  createdAt: string;
  updatedAt: string;
}

export type WorkspaceRole = "owner" | "admin" | "manager" | "member";

export interface CompanyMember {
  id: string;              // membership id
  userId: string;          // user id (THIS is what verify/reject expects)
  companyId: string;
  role: WorkspaceRole;
  status: "active" | "removed" | string;
  isVerified: boolean;
  invitedBy: string | null;
  createdAt: string;
  updatedAt: string;
  user: User;
  company?: Company;
}

export interface AuthResponse {
  status: string;
  message: string;
  token: string;
  data: {
    user: User;
  };
}

export interface ErrorResponse {
  status: string;
  message: string;
}

/* ============================
   AUTH PAYLOADS
============================ */

export interface SignupExecutiveData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company: string;
  companySize: string;
  industry: string;
}

export interface SignupAssistantData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  companyCode: string;
  specialization: string;
  experience: number;
  hourlyRate: number;
  bio: string;
  skills: string[];
}

export interface LoginData {
  email: string;
  password: string;
}

/* ============================
   TASKS & ATTACHMENTS
============================ */

export interface TaskAttachment {
  id: string;
  taskId: string;
  fileUrl: string;
  fileName: string;
  fileType: string;
  fileSize: number;
}

export type TaskPriority = "low" | "medium" | "high";
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled";

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  deadline: string;
  category: string;
  estimatedHours: number;
  actualHours: number | null;
  tier: string;

  assignedAssistantId: string | null;
  executiveId: string;
  assigneeId: string | null;

  createdAt: string;
  updatedAt: string;

  company?: {
    id: string;
    name: string;
    companyCode?: string;
    industry?: string;
  };

  creator?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role?: string;
  };

  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: string;
  } | null;

  attachments?: TaskAttachment[];

  // Some backends return this
  assignees?: any[];
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
  category: string;
  estimatedHours: number;
  assigneeId?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  deadline?: string;
  category?: string;
  estimatedHours?: number;
  actualHours?: number;
  assigneeId?: string | null;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  category?: string;
}

/* ============================
   DASHBOARDS
============================ */

export interface ExecutiveDashboard {
  overview: {
    team: {
      totalAssistants: number;
      availableAssistants: number;
      pendingVerifications: number;
      totalExecutives: number;
    };
    tasks: {
      totalTasks: number;
      pendingTasks: number;
      inProgressTasks: number;
      completedTasks: number;
      overdueTasks: number;
      urgentTasks: number;
      completionRate: number;
    };
    timeframe: string;
  };
  analytics: {
    tasksByCategory: Record<string, number>;
    assistantPerformance: Array<{
      assistantId: string;
      assistantName: string;
      completedTasks: number;
      averageHours: number;
      totalHours: number;
    }>;
  };
  recentActivity: {
    tasks: Task[];
  };
}

export interface AssistantDashboard {
  overview: {
    totalAssigned: number;
    completed: number;
    inProgress: number;
    pending: number;
    overdue: number;
    completionRate: number;
    totalHours: number;
    averageHours: number;
    onTimeCompletionRate: number;
  };
  analytics: {
    tasksByPriority: Record<string, number>;
    timeframe: string;
  };
  activity: {
    recentCompleted: Array<{
      id: string;
      title: string;
      completedAt: string;
      executive: {
        firstName: string;
        lastName: string;
      };
      actualHours: number;
    }>;
    upcomingDeadlines: Array<{
      id: string;
      title: string;
      deadline: string;
      priority: string;
      executive: {
        firstName: string;
        lastName: string;
      };
    }>;
  };
  currentTasks: {
    inProgress: number;
    pending: number;
  };
}

/* ============================
   TEAM DIRECTORY CARD TYPE (UI)
   - used by your TeamMembers page cards
============================ */

export interface TeamMember {
  id: string; // user id
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  role: string;
  subscriptionTier: string;
  isVerified: boolean;
  isActive: boolean;
  specialization: string;
  experience: number;
  hourlyRate: number;
  bio: string;
  skills: string[];
  isAvailable: boolean;
  rating: number;
  invitationStatus?: "pending" | "approved" | "rejected" | "invited" | "removed";
  invitedByExecutive?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  createdAt?: string;
}

export interface AssistantFilters {
  specialization?: string;
  minRating?: number;
  maxHourlyRate?: number;
}

/* ============================
   RESPONSES (TEAM)
============================ */

export interface TeamAssistantsResponse {
  status: string;
  results: number;
  data: {
    team_members: any;
    members?: CompanyMember[];
  };
}

export interface PendingVerificationsResponse {
  status: string;
  results: number;
  data: {
    pendingMembers: CompanyMember[];
  };
}

/* ============================
   COMMENTS
============================ */

export interface TaskComment {
  id: string;
  taskId: string;
  userId: string;
  content: string;
  isSystemMessage: boolean;
  systemEventType?: string;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    profilePictureUrl?: string;
  };
}

/* ============================
   ASSISTANCE REQUEST TYPES
============================ */

export interface AssistanceRequestAttachment {
  url: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  publicId: string;
  uploadedAt: string;
}

export type AssistanceRequestPriority = "low" | "medium" | "high" | "urgent";
export type AssistanceRequestStatus =
  | "pending"
  | "under_review"
  | "quoted"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface AssistanceRequest {
  id: string;
  userId: string;
  companyId: string;
  title: string;
  description: string;
  category: string;
  priority: AssistanceRequestPriority;
  deadline?: string | null;
  estimatedHours?: number | null;
  attachments: AssistanceRequestAttachment[];
  status: AssistanceRequestStatus;
  adminNotes?: string | null;
  quotedPrice?: number | string | null;
  quotedHours?: number | null;
  adminAssignedTo?: string | null;
  taskId?: string | null;
  acceptedAt?: string | null;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;

  requester?: User;
  company?: Company;
  assignedAdmin?: User;
  convertedTask?: Task;
}

export interface AssistanceRequestStats {
  total: number;
  pending: number;
  under_review: number;
  quoted: number;
  accepted: number;
  in_progress: number;
  completed: number;
  rejected: number;
  cancelled: number;
  byPriority: {
    low: number;
    medium: number;
    high: number;
    urgent: number;
  };
  topCompanies?: Array<{
    companyId: string;
    total: number;
    completed: number;
    totalQuoted?: number;
    company?: {
      id: string;
      name: string;
      companyCode: string;
    };
  }>;
  monthlyTrend?: Array<{
    month: string;
    count: number;
  }>;
}

export interface CreateAssistanceRequestData {
  title: string;
  description: string;
  category: string;
  priority?: AssistanceRequestPriority;
  deadline?: string;
  estimatedHours?: number;
  attachments?: File[];
}

export interface UpdateAssistanceRequestData {
  status?: AssistanceRequestStatus;
  adminNotes?: string;
  quotedPrice?: number;
  quotedHours?: number;
  adminAssignedTo?: string;
}

export interface ConvertToTaskData {
  assigneeId?: string;
  estimatedHours?: number;
  priority?: AssistanceRequestPriority;
  deadline?: string;
}

export interface CostEstimation {
  baseRate: number;
  estimatedHours: number;
  estimatedCost: number;
  minCharge: number;
  currency: string;
}

/* ============================
   API BASE URL
============================ */

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/v1";

/* ============================
   API CLIENT
============================ */

class ApiClient {
  getUserById: any;
  getTeamMembers: any;
  private getAuthHeaders(includeWorkspace: boolean = true): HeadersInit {
    const token =
      localStorage.getItem("auth_token") || localStorage.getItem("token");
    const activeCompanyId = localStorage.getItem("activeCompanyId");

    const headers: HeadersInit = {};

    // Content-Type should NOT be set when using FormData
    // so we set it in request() for JSON calls only.
    if (token) {
      (headers as any).Authorization = `Bearer ${token}`;
    }
    if (includeWorkspace && activeCompanyId) {
      (headers as any)["x-company-id"] = activeCompanyId;
    }
    return headers;
  }

  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE_URL}${path}`;

    const headers = new Headers(options.headers || {});
    const isFormData = options.body instanceof FormData;

    // Ensure JSON calls always have Content-Type
    if (!isFormData && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const response = await fetch(url, { ...options, headers });

    let result: any;
    try {
      result = await response.json();
    } catch {
      result = {};
    }

    if (!response.ok) {
      const message: string = result?.message || "Request failed";

      // Workspace missing guard
      if (
        response.status === 400 &&
        message.toLowerCase().includes("x-company-id")
      ) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("workspace:missing", {
              detail: { message: "Select a workspace to continue" },
            })
          );
          window.dispatchEvent(new Event("workspace:switcher-open"));
        }
      }

      if (
        response.status === 403 &&
        message.toLowerCase().includes("workspace")
      ) {
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("workspace:missing", {
              detail: { message },
            })
          );
        }
      }

      throw new Error(message);
    }

    return result as T;
  }

  /* ============================
     AUTH
  ============================ */

  async signupExecutive(data: SignupExecutiveData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/executive", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async signupTeamMember(data: SignupAssistantData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/team_member", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async signupExecutiveJoin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyCode: string;
  }): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/executive-join", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async signupManager(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyCode: string;
    specialization?: string;
    experience?: number;
    hourlyRate?: number;
    bio?: string;
    skills?: string[];
  }): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/manager", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result.token) {
      localStorage.setItem("auth_token", result.token);
      localStorage.setItem("token", result.token);
    }
    return result;
  }

  async getCurrentUser(): Promise<{ status: string; data: { user: User } }> {
    return this.request("/auth/me", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  logout(): void {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("token");
  }

  /* ============================
     TASKS
  ============================ */

  async createTask(
    data: FormData | CreateTaskData
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
    const isFormData = data instanceof FormData;

    const headers: HeadersInit = isFormData
      ? this.getAuthHeaders(true) // no JSON content-type
      : { ...this.getAuthHeaders(true), "Content-Type": "application/json" };

    return this.request("/tasks", {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async getTasks(
    filters?: TaskFilters
  ): Promise<{ status: string; results: number; data: { tasks: Task[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.priority) queryParams.append("priority", filters.priority);
    if (filters?.category) queryParams.append("category", filters.category);

    return this.request(`/tasks?${queryParams.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getTaskById(
    taskId: string
  ): Promise<{ status: string; data: { task: Task } }> {
    return this.request(`/tasks/${taskId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskData | FormData
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
    const isFormData = data instanceof FormData;

    const headers: HeadersInit = isFormData
      ? this.getAuthHeaders(true)
      : { ...this.getAuthHeaders(true), "Content-Type": "application/json" };

    return this.request(`/tasks/${taskId}`, {
      method: "PATCH",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });
  }

  async deleteTaskAttachment(
    attachmentId: string
  ): Promise<{ status: string; message: string }> {
    return this.request(`/task-attachments/${attachmentId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async deleteTask(
    taskId: string
  ): Promise<{ status: string; message: string }> {
    return this.request(`/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  /* ============================
     DASHBOARDS
  ============================ */

  async getExecutiveDashboard(): Promise<{
    status: string;
    data: ExecutiveDashboard;
  }> {
    return this.request("/dashboard/executive", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getTeamMemberDashboard(): Promise<{
    status: string;
    data: AssistantDashboard;
  }> {
    return this.request("/dashboard/team_member", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async createWorkspace(data: { name: string; industry?: string; size?: string }) {
    return this.request("/companies", {
      method: "POST",
      headers: this.getAuthHeaders(false),
      body: JSON.stringify(data),
    });
  }

  /* ============================
     TEAM MANAGEMENT (Workspace scoped)
  ============================ */

  // GET /team/team_members
  async getCompanyAssistants(): Promise<TeamAssistantsResponse> {
    return this.request("/team/team_members", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  // GET /team/members
  async getCompanyTeam(): Promise<{
    status: string;
    results: number;
    data: { members: CompanyMember[] };
  }> {
    return this.request("/team/members", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  // GET /team/pending-verifications
  async getPendingVerifications(): Promise<PendingVerificationsResponse> {
    return this.request("/team/pending-verifications", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  // PATCH /team/verify/:assistantId  (assistantId == USER ID)
  async verifyAssistant(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/verify/${userId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  // DELETE /team/reject/:assistantId  (assistantId == USER ID)
  async rejectAssistant(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/reject/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  // DELETE /team/remove/:userId
  async removeTeamMember(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/remove/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  // PATCH /team/restore/:userId
  async restoreTeamMember(userId: string): Promise<{ status: string; message: string }> {
    return this.request(`/team/restore/${userId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  // POST /team/invite
  async inviteAssistant(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    invitedRole: "team_member" | "manager" | "executive";
  }): Promise<{ status: string; message: string }> {
    return this.request("/team/invite", {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  /**
   * Helper: get a workspace member by USER ID
   * (Fixes your broken /users/:id dependency for team pages)
   */
  async getWorkspaceMemberByUserId(userId: string): Promise<CompanyMember> {
    const res = await this.getCompanyTeam();
    const member = res.data.members.find((m) => m.userId === userId);
    if (!member) throw new Error("User not found in this workspace.");
    return member;
  }

  /* ============================
    PROFILE
  ============================ */

  async updateUserProfile(updates: {
    firstName?: string;
    lastName?: string;
    bio?: string;
    specialization?: string;
    experience?: number;
    hourlyRate?: number;
  }) {
    return this.request("/profile/update", {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
  }

  async uploadProfilePicture(file: File) {
    const form = new FormData();
    form.append("profilePicture", file);

    return this.request("/profile/upload-picture", {
      method: "POST",
      headers: this.getAuthHeaders(true), // no content-type
      body: form,
    });
  }

  /* ============================
    ADMIN MODULE
  ============================ */

  async getAdminSummary(): Promise<{
    status: string;
    data: {
      totalCompanies: number;
      activeCompanies: number;
      totalUsers: number;
      activeUsers: number;
      totalTasks: number;
      roleBreakdown: { role: string; count: number }[];
    };
  }> {
    return this.request("/admin/analytics/summary", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getAdminUsers(): Promise<{
    status: string;
    results: number;
    data: { users: User[] };
  }> {
    return this.request("/admin/users", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getAdminCompanies(): Promise<{
    status: string;
    results: number;
    data: { companies: Company[] };
  }> {
    return this.request("/admin/companies", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getAdminTasks(): Promise<{
    status: string;
    results: number;
    data: { tasks: Task[] };
  }> {
    return this.request("/admin/tasks", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetUsers(filters?: {
    role?: string;
    status?: string;
    companyId?: string;
    search?: string;
  }): Promise<{
    status: string;
    results: number;
    data: { users: any[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.role) params.append("role", filters.role);
    if (filters?.status) params.append("status", filters.status);
    if (filters?.companyId) params.append("companyId", filters.companyId);
    if (filters?.search) params.append("search", filters.search);

    return this.request(`/admin/users?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminDeactivateUser(userId: string) {
    return this.request(`/admin/users/${userId}/deactivate`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async adminReactivateUser(userId: string) {
    return this.request(`/admin/users/${userId}/reactivate`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async adminDeleteUser(userId: string) {
    return this.request(`/admin/users/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async adminResetUserPassword(userId: string) {
    return this.request(`/admin/users/${userId}/reset-password`, {
      method: "POST",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetCompanies(filters?: {
    search?: string;
    status?: string;
  }): Promise<{
    status: string;
    results: number;
    data: { companies: any[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.search) params.append("search", filters.search);
    if (filters?.status) params.append("status", filters.status);

    return this.request(`/admin/companies?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminVerifyCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}/verify`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async adminSuspendCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}/suspend`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async adminReactivateCompany(companyId: string) {
    return this.request(`/admin/companies/${companyId}/reactivate`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetCompany(companyId: string): Promise<{
    status: string;
    data: { company: any };
  }> {
    return this.request(`/admin/companies/${companyId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetTasks(filters?: {
    status?: string;
    priority?: string;
    companyId?: string;
    assigneeId?: string;
  }): Promise<{
    status: string;
    results: number;
    data: { tasks: Task[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.companyId) params.append("companyId", filters.companyId);
    if (filters?.assigneeId) params.append("assigneeId", filters.assigneeId);

    return this.request(`/admin/tasks?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminDeleteTask(taskId: string) {
    return this.request(`/admin/tasks/${taskId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetUserById(userId: string): Promise<{
    status: string;
    data: { user: any };
  }> {
    return this.request(`/admin/users/${userId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetSystemLogs() {
    return this.request("/admin/logs", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminSearch(keyword: string, type?: string): Promise<{
    status: string;
    data: {
      companies?: any[];
      users?: any[];
      tasks?: any[];
    };
  }> {
    const params = new URLSearchParams();
    params.append("keyword", keyword);
    if (type) params.append("type", type);

    return this.request(`/admin/search?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetDeletedUsers(): Promise<{
    status: string;
    results: number;
    data: { users: any[] };
  }> {
    return this.request("/admin/deleted/users", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async adminGetDeletedCompanies(): Promise<{
    status: string;
    results: number;
    data: { companies: any[] };
  }> {
    return this.request("/admin/deleted/companies", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async resendVerificationEmail(email: string): Promise<{
    status: string;
    message: string;
  }> {
    return this.request("/auth/resend-verification", {
      method: "POST",
      headers: { ...this.getAuthHeaders(false), "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
  }

  /* ============================
    TASK COMMENTS
  ============================ */

  async getTaskComments(
    taskId: string,
    params?: { limit?: number; offset?: number }
  ): Promise<{
    success: boolean;
    comments: TaskComment[];
    pagination?: {
      total: number;
      limit: number;
      offset: number;
      hasMore: boolean;
    };
  }> {
    const queryParams = new URLSearchParams();
    if (params?.limit) queryParams.append("limit", params.limit.toString());
    if (params?.offset) queryParams.append("offset", params.offset.toString());

    const url = `/task-comments/task/${taskId}/comments${
      queryParams.toString() ? `?${queryParams.toString()}` : ""
    }`;

    return this.request(url, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async addTaskComment(
    taskId: string,
    content: string
  ): Promise<{
    success: boolean;
    comment: TaskComment;
    involvedUsers: string[];
  }> {
    return this.request(`/task-comments/task/${taskId}/comments`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async updateComment(
    commentId: string,
    content: string
  ): Promise<{
    success: boolean;
    comment: TaskComment;
  }> {
    return this.request(`/task-comments/${commentId}`, {
      method: "PUT",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(
    commentId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    return this.request(`/task-comments/${commentId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async getWebSocketToken(): Promise<{ token: string }> {
    return this.request("/auth/websocket-token", {
      method: "GET",
      headers: this.getAuthHeaders(false),
    });
  }

  /* ============================
    ASSISTANCE REQUESTS
  ============================ */

  async createAssistanceRequest(
    data: CreateAssistanceRequestData
  ): Promise<{
    status: string;
    message: string;
    data: { assistanceRequest: AssistanceRequest };
  }> {
    const formData = new FormData();
    formData.append("title", data.title);
    formData.append("description", data.description);
    formData.append("category", data.category);

    if (data.priority) formData.append("priority", data.priority);
    if (data.deadline) formData.append("deadline", data.deadline);
    if (data.estimatedHours !== undefined)
      formData.append("estimatedHours", String(data.estimatedHours));

    if (data.attachments?.length) {
      data.attachments.forEach((file) => formData.append("attachments", file));
    }

    return this.request("/assistance", {
      method: "POST",
      headers: this.getAuthHeaders(true),
      body: formData,
    });
  }

  async getMyAssistanceRequests(filters?: {
    status?: AssistanceRequestStatus;
    search?: string;
    sort?: string;
    order?: "ASC" | "DESC";
  }): Promise<{
    status: string;
    results: number;
    data: { requests: AssistanceRequest[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.sort) params.append("sort", filters.sort);
    if (filters?.order) params.append("order", filters.order);

    return this.request(`/assistance/my-requests?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getAssistanceRequestDetails(
    requestId: string
  ): Promise<{
    status: string;
    data: { request: AssistanceRequest };
  }> {
    return this.request(`/assistance/${requestId}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async cancelAssistanceRequest(
    requestId: string
  ): Promise<{
    status: string;
    message: string;
  }> {
    return this.request(`/assistance/${requestId}/cancel`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }

  async getAllAssistanceRequests(filters?: {
    status?: AssistanceRequestStatus;
    priority?: AssistanceRequestPriority;
    companyId?: string;
    search?: string;
    sort?: string;
    order?: "ASC" | "DESC";
  }): Promise<{
    status: string;
    results: number;
    data: { requests: AssistanceRequest[] };
  }> {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.priority) params.append("priority", filters.priority);
    if (filters?.companyId) params.append("companyId", filters.companyId);
    if (filters?.search) params.append("search", filters.search);
    if (filters?.sort) params.append("sort", filters.sort);
    if (filters?.order) params.append("order", filters.order);

    return this.request(`/assistance/admin/all-requests?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async updateAssistanceRequest(
    requestId: string,
    data: UpdateAssistanceRequestData
  ): Promise<{
    status: string;
    message: string;
    data: { request: AssistanceRequest };
  }> {
    return this.request(`/assistance/admin/${requestId}`, {
      method: "PATCH",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  }

  async convertAssistanceRequestToTask(
    requestId: string,
    data?: ConvertToTaskData
  ): Promise<{
    status: string;
    message: string;
    data: {
      task: Task;
      request: { id: string; taskId: string };
    };
  }> {
    return this.request(`/assistance/admin/${requestId}/convert-to-task`, {
      method: "POST",
      headers: { ...this.getAuthHeaders(), "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async getAssistanceRequestStats(): Promise<{
    status: string;
    data: { stats: AssistanceRequestStats };
  }> {
    return this.request("/assistance/stats/overview", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async estimateAssistanceCost(
    estimatedHours: number,
    hourlyRate?: number
  ): Promise<{
    status: string;
    data: { calculation: CostEstimation };
  }> {
    const params = new URLSearchParams();
    params.append("estimatedHours", String(estimatedHours));
    if (hourlyRate !== undefined) params.append("hourlyRate", String(hourlyRate));

    return this.request(`/assistance/estimate-cost?${params.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }
}

export const api = new ApiClient();
