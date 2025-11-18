const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://admiino-backend.onrender.com/api/v1';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  company: string;
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
  company: string;
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
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
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
  tasks: Task[];
  stats: {
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    urgentTasks: number;
  };
}

export interface AssistantDashboard {
  tasks: Task[];
  stats: {
    totalTasks: number;
    pendingTasks: number;
    inProgressTasks: number;
    completedTasks: number;
    urgentTasks: number;
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
}

export interface AssistantFilters {
  specialization?: string;
  minRating?: number;
  maxHourlyRate?: number;
}


class ApiClient {
  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('auth_token');
    return {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  }

  private async makeRequest(url: string, options: RequestInit = {}) {
    const response = await fetch(url, {
      ...options,
      credentials: 'include', // Add this for CORS with authentication
      headers: {
        ...this.getAuthHeaders(),
        ...options.headers,
      },
    });

    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.message || 'Request failed');
    }

    return result;
  }

  async signupExecutive(data: SignupExecutiveData): Promise<AuthResponse> {
    const result = await this.makeRequest(`${API_BASE_URL}/auth/signup/executive`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  }

  async signupAssistant(data: SignupAssistantData): Promise<AuthResponse> {
    const result = await this.makeRequest(`${API_BASE_URL}/auth/signup/assistant`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  }

  async login(data: LoginData): Promise<AuthResponse> {
    const result = await this.makeRequest(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      body: JSON.stringify(data),
    });

    if (result.token) {
      localStorage.setItem('auth_token', result.token);
    }

    return result;
  }

  async getCurrentUser(): Promise<{ status: string; data: { user: User } }> {
    return await this.makeRequest(`${API_BASE_URL}/auth/me`, {
      method: 'GET',
    });
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }

  // Task endpoints
  async createTask(data: CreateTaskData): Promise<{ status: string; message: string; data: { task: Task } }> {
    return await this.makeRequest(`${API_BASE_URL}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getTasks(filters?: TaskFilters): Promise<{ status: string; results: number; data: { tasks: Task[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.status) queryParams.append('status', filters.status);
    if (filters?.priority) queryParams.append('priority', filters.priority);
    if (filters?.category) queryParams.append('category', filters.category);

    return await this.makeRequest(`${API_BASE_URL}/tasks?${queryParams}`, {
      method: 'GET',
    });
  }

  async updateTask(taskId: string, data: UpdateTaskData): Promise<{ status: string; message: string; data: { task: Task } }> {
    return await this.makeRequest(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(taskId: string): Promise<{ status: string; message: string }> {
    return await this.makeRequest(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Dashboard endpoints
  async getExecutiveDashboard(): Promise<{ status: string; data: ExecutiveDashboard }> {
    return await this.makeRequest(`${API_BASE_URL}/dashboard/executive`, {
      method: 'GET',
    });
  }

  async getAssistantDashboard(): Promise<{ status: string; data: AssistantDashboard }> {
    return await this.makeRequest(`${API_BASE_URL}/dashboard/assistant`, {
      method: 'GET',
    });
  }

  // Assistants endpoints
  async getAssistants(filters?: AssistantFilters): Promise<{ status: string; results: number; data: { assistants: Assistant[] } }> {
    const queryParams = new URLSearchParams();
    if (filters?.specialization) queryParams.append('specialization', filters.specialization);
    if (filters?.minRating) queryParams.append('minRating', filters.minRating.toString());
    if (filters?.maxHourlyRate) queryParams.append('maxHourlyRate', filters.maxHourlyRate.toString());

    return await this.makeRequest(`${API_BASE_URL}/assistants?${queryParams}`, {
      method: 'GET',
    });
  }

  async getAssistantById(assistantId: string): Promise<{ status: string; data: { assistant: Assistant } }> {
    return await this.makeRequest(`${API_BASE_URL}/assistants/${assistantId}`, {
      method: 'GET',
    });
  }

  async updateAssistantAvailability(
    assistantId: string,
    data: { isAvailable?: boolean; hourlyRate?: number; specialization?: string }
  ): Promise<{ status: string; message: string; data: { assistant: Assistant } }> {
    return await this.makeRequest(`${API_BASE_URL}/assistants/${assistantId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async getTaskById(taskId: string): Promise<{ status: string; data: { task: Task } }> {
    return await this.makeRequest(`${API_BASE_URL}/tasks/${taskId}`, {
      method: 'GET',
    });
  }
}

export const api = new ApiClient();