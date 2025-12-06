// src/lib/api.ts

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  "https://admiino-backend.onrender.com/api/v1";

/* ============================
   SHARED TYPES
============================ */

export type UserRole = "executive" | "manager" | "assistant" | "admin" ;

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

  // NEW — backend now returns companyId + nested company object
  companyId: string | null;
  company?: Company | null;

  // Roles updated
  role: "executive" | "manager" | "assistant" | "admin";

  subscriptionTier: "free" | "premium";

  isVerified: boolean;
  invitationStatus: "pending" | "approved" | "rejected" | "invited" | "removed";
  invitedBy: string | null;

  isActive: boolean;

  // Optional fields (assistants/managers)
  specialization?: string | null;
  experience?: number | null;
  hourlyRate?: number | null;
  bio?: string | null;
  skills?: string[];

  // Assistant availability & rating
  isAvailable?: boolean;
  rating?: number;

  // Profile picture
  profilePictureUrl?: string | null;

  createdAt: string;
  updatedAt: string;
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

  // Backend fields for relation scoping
  assignedAssistantId: string | null;
  executiveId: string; // creator/owner on backend
  assigneeId: string | null;

  createdAt: string;
  updatedAt: string;

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
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string; // ISO string
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
  actualHours?: number;
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
   ASSISTANTS & TEAM
============================ */

export interface Assistant {
  id: string;
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

export interface TeamAssistantsResponse {
  status: string;
  results: number;
  data: {
    assistants: Assistant[];
  };
}

export interface PendingVerificationsResponse {
  status: string;
  results: number;
  data: {
    pendingAssistants: Assistant[];
  };
}

export interface InviteAssistantData {
  email: string;
  firstName?: string;
  lastName?: string;
}



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
   API CLIENT
============================ */

class ApiClient {
  /* -------- Auth header helper -------- */
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("auth_token");
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  /* -------- Generic request helper -------- */
  async request<T>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${API_BASE_URL}${path}`;
    const response = await fetch(url, options);

    let result: any;
    try {
      result = await response.json();
    } catch {
      throw new Error("Unexpected server response");
    }

    if (!response.ok) {
      throw new Error(result?.message || "Request failed");
    }

    return result as T;
  }

  /* ============================
     AUTH
  ============================ */

  async signupExecutive(data: SignupExecutiveData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/executive", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (result.token) {
      localStorage.setItem("auth_token", result.token);
    }

    return result;
  }

  async signupAssistant(data: SignupAssistantData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/signup/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (result.token) {
      localStorage.setItem("auth_token", result.token);
    }

    return result;
  }

  // ===============================
  // EXECUTIVE JOIN EXISTING COMPANY
  // ===============================
  async signupExecutiveJoin(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    companyCode: string;
  }): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup/executive-join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Executive join failed");
    }

    if (result.token) {
      localStorage.setItem("auth_token", result.token);
    }

    return result;
  }

  // ===============================
  // MANAGER SIGNUP (JOIN COMPANY)
  // ===============================
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
    const response = await fetch(`${API_BASE_URL}/auth/signup/manager`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Manager signup failed");
    }

    if (result.token) {
      localStorage.setItem("auth_token", result.token);
    }

    return result;
  }


  async login(data: LoginData): Promise<AuthResponse> {
    const result = await this.request<AuthResponse>("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (result.token) {
      localStorage.setItem("auth_token", result.token);
    }

    return result;
  }

  async getCurrentUser(): Promise<{ status: string; data: { user: User } }> {
    return this.request<{ status: string; data: { user: User } }>("/auth/me", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  logout(): void {
    localStorage.removeItem("auth_token");
  }

  /* ============================
     TASKS
  ============================ */

  async createTask(
    data: FormData | CreateTaskData
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
    const isFormData = data instanceof FormData;

    const headers: HeadersInit = isFormData
      ? (() => {
          const token = localStorage.getItem("auth_token");
          return token ? { Authorization: `Bearer ${token}` } : {};
        })()
      : this.getAuthHeaders();

    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Failed to create task");
    }

    return result;
  }

  async getTasks(
    filters?: TaskFilters
  ): Promise<{ status: string; results: number; data: { tasks: Task[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append("status", filters.status);
    if (filters?.priority) queryParams.append("priority", filters.priority);
    if (filters?.category) queryParams.append("category", filters.category);

    return this.request<{
      status: string;
      results: number;
      data: { tasks: Task[] };
    }>(`/tasks?${queryParams.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getTaskById(
    taskId: string
  ): Promise<{ status: string; data: { task: Task } }> {
    return this.request<{ status: string; data: { task: Task } }>(
      `/tasks/${taskId}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }

  async updateTask(
    taskId: string,
    data: UpdateTaskData
  ): Promise<{ status: string; message: string; data: { task: Task } }> {
    return this.request<{
      status: string;
      message: string;
      data: { task: Task };
    }>(`/tasks/${taskId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
  }

  async deleteTask(
    taskId: string
  ): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(
      `/tasks/${taskId}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      }
    );
  }

  /* ============================
     DASHBOARDS
  ============================ */

  async getExecutiveDashboard(): Promise<{
    status: string;
    data: ExecutiveDashboard;
  }> {
    return this.request<{ status: string; data: ExecutiveDashboard }>(
      "/dashboard/executive",
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }

  async getAssistantDashboard(): Promise<{
    status: string;
    data: AssistantDashboard;
  }> {
    return this.request<{ status: string; data: AssistantDashboard }>(
      "/dashboard/assistant",
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }

  /* ============================
     ASSISTANTS (Public / Browsing)
  ============================ */

  async getAssistants(
    filters?: AssistantFilters
  ): Promise<{
    status: string;
    results: number;
    data: { assistants: Assistant[] };
  }> {
    const queryParams = new URLSearchParams();
    if (filters?.specialization)
      queryParams.append("specialization", filters.specialization);
    if (filters?.minRating)
      queryParams.append("minRating", filters.minRating.toString());
    if (filters?.maxHourlyRate)
      queryParams.append("maxHourlyRate", filters.maxHourlyRate.toString());

    return this.request<{
      status: string;
      results: number;
      data: { assistants: Assistant[] };
    }>(`/assistants?${queryParams.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getAssistantById(
    assistantId: string
  ): Promise<{ status: string; data: { assistant: Assistant } }> {
    return this.request<{ status: string; data: { assistant: Assistant } }>(
      `/assistants/${assistantId}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }

  async updateAssistantAvailability(
    assistantId: string,
    data: {
      isAvailable?: boolean;
      hourlyRate?: number;
      specialization?: string;
    }
  ): Promise<{
    status: string;
    message: string;
    data: { assistant: Assistant };
  }> {
    return this.request<{
      status: string;
      message: string;
      data: { assistant: Assistant };
    }>(`/assistants/${assistantId}/availability`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
  }

  async getAvailableAssistants(
    filters?: AssistantFilters
  ): Promise<{
    status: string;
    results: number;
    data: { assistants: Assistant[] };
  }> {
    const queryParams = new URLSearchParams();
    if (filters?.specialization)
      queryParams.append("specialization", filters.specialization);
    if (filters?.minRating)
      queryParams.append("minRating", filters.minRating.toString());
    if (filters?.maxHourlyRate)
      queryParams.append("maxHourlyRate", filters.maxHourlyRate.toString());

    return this.request<{
      status: string;
      results: number;
      data: { assistants: Assistant[] };
    }>(`/assistants/available?${queryParams.toString()}`, {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  /* ============================
     TEAM MANAGEMENT (Company-scoped)
  ============================ */

  async getCompanyAssistants(): Promise<TeamAssistantsResponse> {
    return this.request<TeamAssistantsResponse>("/team/assistants", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getPendingVerifications(): Promise<PendingVerificationsResponse> {
    return this.request<PendingVerificationsResponse>(
      "/team/pending-verifications",
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }

  async verifyAssistant(
    assistantId: string
  ): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(
      `/team/verify/${assistantId}`,
      {
        method: "PATCH",
        headers: this.getAuthHeaders(),
      }
    );
  }

  async rejectAssistant(
    assistantId: string
  ): Promise<{ status: string; message: string }> {
    return this.request<{ status: string; message: string }>(
      `/team/reject/${assistantId}`,
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      }
    );
  }

  // async removeTeamMember(userId: string): Promise<{ status: string; message: string }> {
  //   return this.request(`/team/remove/${userId}`, {
  //     method: "DELETE",
  //     headers: this.getAuthHeaders(),
  //   });
  // }

  async removeTeamMember(userId: string) {
    return this.request(`/team/remove/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });
  }

  async restoreTeamMember(userId: string) {
    return this.request(`/team/restore/${userId}`, {
      method: "PATCH",
      headers: this.getAuthHeaders(),
    });
  }



  async inviteAssistant(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    invitedRole: "assistant" | "manager" | "executive";
  }): Promise<{ status: string; message: string }> {
    return this.request("/team/invite", {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
  }

  async getCompanyTeam(): Promise<{
    status: string;
    results: number;
    data: { team: User[] };
  }> {
    return this.request("/team/members", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getTeamDirectory(): Promise<{
    status: string;
    results: number;
    data: { team: User[] };
  }> {
    return this.request("/team/directory", {
      method: "GET",
      headers: this.getAuthHeaders(),
    });
  }

  async getUserById(
    userId: string
  ): Promise<{ status: string; data: { user: User } }> {
    return this.request<{ status: string; data: { user: User } }>(
      `/users/${userId}`,
      {
        method: "GET",
        headers: this.getAuthHeaders(),
      }
    );
  }


  // PATCH /profile/update
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
      headers: this.getAuthHeaders(),
      body: JSON.stringify(updates),
    });
  }



  async uploadProfilePicture(file: File) {
    const form = new FormData();
    form.append("profilePicture", file);

    const response = await fetch(`${API_BASE_URL}/profile/upload-picture`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("auth_token") || ""}`,
      },
      body: form,
    });

    const result = await response.json();

    if (!response.ok) throw new Error(result.message || "Upload failed");

    return result;
  }


  /* ============================
    ADMIN MODULE
  ============================ */

  // GET ADMIN SUMMARY
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

  // GET ALL USERS
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

  // GET ALL COMPANIES
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

  // GET ALL TASKS
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

  /* ============================
    ADMIN — USERS
  ============================ */

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



  /* ============================
    ADMIN — COMPANIES
  ============================ */

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
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ email }),
    });
  }




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
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    const url = `/task-comments/task/${taskId}/comments${
      queryParams.toString() ? `?${queryParams.toString()}` : ''
    }`;

    return this.request(url, {
      method: 'GET',
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
      method: 'POST',
      headers: this.getAuthHeaders(),
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
      method: 'PUT',
      headers: this.getAuthHeaders(),
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
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
  }

  // WebSocket token endpoint (optional, for secure WebSocket connections)
  async getWebSocketToken(): Promise<{ token: string }> {
    return this.request('/auth/websocket-token', {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });
  }
}


export const api = new ApiClient();
