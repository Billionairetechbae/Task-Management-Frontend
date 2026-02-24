import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { api, User, WorkspaceRole } from '@/lib/api';

const WS_STORAGE_KEY = "workspaces_cache";

function loadCachedWorkspaces(): any[] {
  try {
    const raw = localStorage.getItem(WS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCachedWorkspaces(ws: any[]) {
  try {
    localStorage.setItem(WS_STORAGE_KEY, JSON.stringify(ws || []));
  } catch {}
}

interface Workspace {
  id: string; // companyId
  name: string; // company.name
  role: WorkspaceRole;
  status: string;
  isVerified?: boolean;
  company?: {
    id: string;
    name: string;
    companyCode?: string;
    industry?: string | null;
  } | null;
}
interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  setUser: (user: User | null) => void;
  activeCompanyId: string | null;
  activeWorkspace: Workspace | null;
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

  const activeWorkspace = useMemo(() => {
    if (!activeCompanyId) return workspaces[0] || null;
    return workspaces.find((w) => w.id === activeCompanyId) || workspaces[0] || null;
  }, [workspaces, activeCompanyId]);

  // const initializeWorkspaceState = (nextUser: User | null) => {
  //   if (!nextUser) {
  //     setActiveCompanyIdState(null);
  //     setWorkspaceRole(null);
  //     setWorkspaces([]);
  //     localStorage.removeItem('activeCompanyId');
  //     return;
  //   }

  //   const stored = localStorage.getItem('activeCompanyId');
  //   const resolved = stored || nextUser.companyId || null;

  //   if (resolved) {
  //     localStorage.setItem('activeCompanyId', resolved);
  //   } else {
  //     localStorage.removeItem('activeCompanyId');
  //   }

  //   setActiveCompanyIdState(resolved);

  //   let role: WorkspaceRole | null = null;
  //   if (nextUser.role === 'admin') {
  //     role = 'owner';
  //   } else if (nextUser.role === 'executive') {
  //     role = 'owner';
  //   } else if (nextUser.role === 'manager') {
  //     role = 'manager';
  //   } else if (nextUser.role === 'team_member') {
  //     role = 'member';
  //   }

  //   setWorkspaceRole(role);

  //   if (nextUser.companyId || nextUser.company) {
  //     const workspaceId = nextUser.companyId || nextUser.company?.id || resolved;
  //     if (workspaceId) {
  //       const workspaceName = nextUser.company?.name || 'Workspace';
  //       setWorkspaces([
  //         {
  //           id: workspaceId,
  //           name: workspaceName,
  //           role: role || 'member',
  //           status: nextUser.isActive ? 'active' : 'inactive',
  //         },
  //       ]);
  //     } else {
  //       setWorkspaces([]);
  //     }
  //   } else {
  //     setWorkspaces([]);
  //   }
  // };

  const initializeWorkspaceState = (nextUser: User | null, nextWorkspaces: Workspace[] = []) => {
    if (!nextUser) {
      setActiveCompanyIdState(null);
      setWorkspaceRole(null);
      setWorkspaces([]);
      localStorage.removeItem("activeCompanyId");
      return;
    }

    setWorkspaces(nextWorkspaces);

    const stored = localStorage.getItem("activeCompanyId");
    const validIds = nextWorkspaces.map((w) => w.id);
    const resolved =
      stored && (validIds.length === 0 || validIds.includes(stored))
        ? stored
        : (nextWorkspaces[0]?.id || nextUser.companyId || null);

    if (resolved) localStorage.setItem("activeCompanyId", resolved);
    else localStorage.removeItem("activeCompanyId");

    setActiveCompanyIdState(resolved);

    // workspaceRole should come from membership role for ACTIVE workspace
    const active = nextWorkspaces.find((w) => w.id === resolved) || nextWorkspaces[0] || null;
    setWorkspaceRole(active?.role || null);
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
      console.log("ME raw response:", response);
      const fetchedUser = response.data?.user;
      const rawWs =
        (response.data as any)?.workspaces ??
        (response as any)?.workspaces ??
        loadCachedWorkspaces();
      const ws: Workspace[] = (Array.isArray(rawWs) ? rawWs : []).map((w: any) => ({
        id: w.companyId || w.company?.id,
        name: w.company?.name ?? "Workspace",
        role: (w.role || "member") as WorkspaceRole,
        status: w.status || "active",
        isVerified: !!w.isVerified,
        company: w.company
          ? {
              id: w.company.id,
              name: w.company.name,
              companyCode: w.company.companyCode,
              industry: w.company.industry ?? null,
            }
          : null,
      })).filter((w: Workspace) => !!w.id);
      console.log("ME normalized workspaces:", ws);
      saveCachedWorkspaces(ws);
      setUser(fetchedUser);
      initializeWorkspaceState(fetchedUser, ws);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      localStorage.removeItem('auth_token');
      localStorage.removeItem('token');
      setUser(null);
      initializeWorkspaceState(null, []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.login({ email, password });
    console.log("LOGIN raw response:", response);

    const loggedInUser = response?.data?.user;
    const wsRaw = (response?.data as any)?.workspaces || (response as any)?.workspaces || [];
    const ws: Workspace[] = (Array.isArray(wsRaw) ? wsRaw : []).map((w: any) => ({
      id: w.companyId || w.company?.id,
      name: w.company?.name ?? "Workspace",
      role: (w.role || "member") as WorkspaceRole,
      status: w.status || "active",
      isVerified: !!w.isVerified,
      company: w.company
        ? {
            id: w.company.id,
            name: w.company.name,
            companyCode: w.company.companyCode,
            industry: w.company.industry ?? null,
          }
        : null,
    })).filter((w: Workspace) => !!w.id);

    console.log("LOGIN normalized workspaces:", ws);
    saveCachedWorkspaces(ws);

    setUser(loggedInUser);
    initializeWorkspaceState(loggedInUser, ws);
  };


  const logout = () => {
    api.logout();
    setUser(null);
    initializeWorkspaceState(null, []);
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
        activeWorkspace,
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
