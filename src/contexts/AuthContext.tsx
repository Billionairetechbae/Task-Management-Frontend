import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, User, WorkspaceRole } from '@/lib/api';

interface Workspace {
  id: string;
  name: string;
  role: WorkspaceRole;
  status?: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  activeCompanyId: string | null;
  workspaceRole: WorkspaceRole | null;
  workspaces: Workspace[];
  setActiveCompanyId: (id: string | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => {
    const stored = localStorage.getItem('activeCompanyId');
    return stored || null;
  });
  const [workspaceRole, setWorkspaceRole] = useState<WorkspaceRole | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);

  const initializeWorkspaceState = (nextUser: User | null) => {
    if (!nextUser) {
      setActiveCompanyIdState(null);
      setWorkspaceRole(null);
      setWorkspaces([]);
      localStorage.removeItem('activeCompanyId');
      return;
    }

    const stored = localStorage.getItem('activeCompanyId');
    const resolved = stored || nextUser.companyId || null;

    if (resolved) {
      localStorage.setItem('activeCompanyId', resolved);
    } else {
      localStorage.removeItem('activeCompanyId');
    }

    setActiveCompanyIdState(resolved);

    let role: WorkspaceRole | null = null;
    if (nextUser.role === 'admin') {
      role = 'owner';
    } else if (nextUser.role === 'executive') {
      role = 'owner';
    } else if (nextUser.role === 'manager') {
      role = 'manager';
    } else if (nextUser.role === 'team_member') {
      role = 'member';
    }

    setWorkspaceRole(role);

    if (nextUser.companyId || nextUser.company) {
      const workspaceId = nextUser.companyId || nextUser.company?.id || resolved;
      if (workspaceId) {
        const workspaceName = nextUser.company?.name || 'Workspace';
        setWorkspaces([
          {
            id: workspaceId,
            name: workspaceName,
            role: role || 'member',
            status: nextUser.isActive ? 'active' : 'inactive',
          },
        ]);
      } else {
        setWorkspaces([]);
      }
    } else {
      setWorkspaces([]);
    }
  };

  const refreshUser = async () => {
    const token =
      localStorage.getItem('auth_token') || localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const response = await api.getCurrentUser();
      const fetchedUser = response.data.user;
      setUser(fetchedUser);
      initializeWorkspaceState(fetchedUser);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      setUser(null);
      initializeWorkspaceState(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password });
    const loggedInUser = response.data.user;
    setUser(loggedInUser);
    initializeWorkspaceState(loggedInUser);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    initializeWorkspaceState(null);
  };

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) {
      localStorage.setItem('activeCompanyId', id);
    } else {
      localStorage.removeItem('activeCompanyId');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        refreshUser,
        setUser,
        activeCompanyId,
        workspaceRole,
        workspaces,
        setActiveCompanyId,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
