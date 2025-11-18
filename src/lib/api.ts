const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admiino-backend.onrender.com/api/v1';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  companyCode?: string;
  role: 'executive' | 'assistant' | 'admin';
  subscriptionTier: string;
  companySize?: string;
  industry?: string;
  specialization?: string;
  experience?: number;
  hourlyRate?: number;
  bio?: string;
  skills?: string[];
  isAvailable?: boolean;
  rating?: number;
  isVerified: boolean;
  isActive: boolean;
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

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
  executive?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    company: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    company?: string;
  } | null;
}

export interface CreateTaskData {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  deadline: string;
  category: string;
  estimatedHours: number;
  assigneeId?: string;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  deadline?: string;
  actualHours?: number;
}

export interface TaskFilters {
  status?: string;
  priority?: string;
  category?: string;
}

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
  invitationStatus?: 'pending' | 'approved' | 'rejected' | 'invited';
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

class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  async signupExecutive(data: SignupExecutiveData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup/executive`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Signup failed');
    }

    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  }

  async signupAssistant(data: SignupAssistantData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/signup/assistant`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Signup failed');
    }

    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Login failed');
    }

    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  }

  async getCurrentUser(): Promise<{ status: string; data: { user: User } }> {
    const response = await fetch(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch user');
    }

    return result;
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  // Task endpoints
  async createTask(data: CreateTaskData): Promise<{ status: string; message: string; data: { task: Task } }> {
    const response = await fetch(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to create task');
    }

    return result;
  }

  async getTasks(filters?: TaskFilters): Promise<{ status: string; results: number; data: { tasks: Task[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.priority) queryParams.append('priority', filters.priority);
    if (filters?.category) queryParams.append('category', filters.category);

    const response = await fetch(`${API_BASE_URL}/tasks?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch tasks');
    }

    return result;
  }

  async getTaskById(taskId: string): Promise<{ status: string; data: { task: Task } }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch task');
    }

    return result;
  }

  async updateTask(taskId: string, data: UpdateTaskData): Promise<{ status: string; message: string; data: { task: Task } }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update task');
    }

    return result;
  }

  async deleteTask(taskId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to delete task');
    }

    return result;
  }

  // Dashboard endpoints
  async getExecutiveDashboard(): Promise<{ status: string; data: ExecutiveDashboard }> {
    const response = await fetch(`${API_BASE_URL}/dashboard/executive`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      console.error('Dashboard API Error:', {
        status: response.status,
        statusText: response.statusText,
        result
      });
      throw new Error(result.message || `Failed to fetch executive dashboard: ${response.status}`);
    }

    return result;
  }

  async getAssistantDashboard(): Promise<{ status: string; data: AssistantDashboard }> {
    const response = await fetch(`${API_BASE_URL}/dashboard/assistant`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch assistant dashboard');
    }

    return result;
  }

  // Assistants endpoints
  async getAssistants(filters?: AssistantFilters): Promise<{ status: string; results: number; data: { assistants: Assistant[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.specialization) queryParams.append('specialization', filters.specialization);
    if (filters?.minRating) queryParams.append('minRating', filters.minRating.toString());
    if (filters?.maxHourlyRate) queryParams.append('maxHourlyRate', filters.maxHourlyRate.toString());

    const response = await fetch(`${API_BASE_URL}/assistants?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch assistants');
    }

    return result;
  }

  async getAssistantById(assistantId: string): Promise<{ status: string; data: { assistant: Assistant } }> {
    const response = await fetch(`${API_BASE_URL}/assistants/${assistantId}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch assistant');
    }

    return result;
  }

  async updateAssistantAvailability(
    assistantId: string,
    data: { isAvailable?: boolean; hourlyRate?: number; specialization?: string }
  ): Promise<{ status: string; message: string; data: { assistant: Assistant } }> {
    const response = await fetch(`${API_BASE_URL}/assistants/${assistantId}/availability`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to update availability');
    }

    return result;
  }

  // Team management endpoints
  async getCompanyAssistants(): Promise<TeamAssistantsResponse> {
    const response = await fetch(`${API_BASE_URL}/team/assistants`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch company assistants');
    }

    return result;
  }

  async getPendingVerifications(): Promise<PendingVerificationsResponse> {
    const response = await fetch(`${API_BASE_URL}/team/pending-verifications`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch pending verifications');
    }

    return result;
  }

  async verifyAssistant(assistantId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/team/verify/${assistantId}`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to verify assistant');
    }

    return result;
  }

  async rejectAssistant(assistantId: string): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/team/reject/${assistantId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to reject assistant');
    }

    return result;
  }

  async inviteAssistant(data: InviteAssistantData): Promise<{ status: string; message: string }> {
    const response = await fetch(`${API_BASE_URL}/team/invite`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to invite assistant');
    }

    return result;
  }

  // Available assistants for task assignment (company-scoped)
  async getAvailableAssistants(filters?: AssistantFilters): Promise<{ status: string; results: number; data: { assistants: Assistant[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.specialization) queryParams.append('specialization', filters.specialization);
    if (filters?.minRating) queryParams.append('minRating', filters.minRating.toString());
    if (filters?.maxHourlyRate) queryParams.append('maxHourlyRate', filters.maxHourlyRate.toString());

    const response = await fetch(`${API_BASE_URL}/assistants/available?${queryParams}`, {
      method: 'GET',
      headers: this.getAuthHeaders(),
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Failed to fetch available assistants');
    }

    return result;
  }
}

export const api = new ApiClient();