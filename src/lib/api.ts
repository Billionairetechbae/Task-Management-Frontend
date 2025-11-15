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
}

export const api = new ApiClient();
