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
  login: (email: string, password: string) => Promise<{ isAdmin: boolean }>;
  loginWithGoogleToken: (token: string) => Promise<{ isAdmin: boolean }>;
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
  const [workspaces, setWorkspaces] = useState<Workspace[]>(loadCachedWorkspaces);

  const activeWorkspace = useMemo(() => {
    if (!activeCompanyId) return workspaces[0] || null;
    return workspaces.find((w) => w.id === activeCompanyId) || workspaces[0] || null;
  }, [workspaces, activeCompanyId]);

  const clearAllAuthState = () => {
    setUser(null);
    setActiveCompanyIdState(null);
    setWorkspaceRole(null);
    setWorkspaces([]);
    localStorage.removeItem('auth_token');
    localStorage.removeItem('token');
    localStorage.removeItem('activeCompanyId');
    localStorage.removeItem(WS_STORAGE_KEY);
  };

  const initializeWorkspaceState = (nextUser: User | null, nextWorkspaces: Workspace[] = []) => {
    if (!nextUser) {
      clearAllAuthState();
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
      const fetchedUser = response.data?.user;

      // Check if user is admin account type
      if ((fetchedUser as any)?.accountType === "admin") {
        clearAllAuthState();
        return;
      }

      // Primary source: /me/workspaces
      let wsRaw: any[] = [];
      try {
        const wsRes = await api.getMyWorkspaces();
        const payload = (wsRes as any)?.data ?? {};
        wsRaw = (payload.workspaces ?? (wsRes as any)?.workspaces ?? []) as any[];
      } catch {}

      // Fallback: workspaces embedded in /auth/me or cached
      if (!Array.isArray(wsRaw) || wsRaw.length === 0) {
        const meWs = (response.data as any)?.workspaces ?? (response as any)?.workspaces ?? [];
        const cachedWs = loadCachedWorkspaces();
        const merged = [...meWs];
        cachedWs.forEach((c: any) => {
          const cId = c.id || c.companyId || c.company?.id;
          if (!merged.find((m: any) => (m.companyId || m.company?.id || m.id) === cId)) {
            merged.push(c);
          }
        });
        wsRaw = merged;
      }

      const ws: Workspace[] = (wsRaw || [])
        .map((w: any) => ({
          id: w.companyId || w.company?.id || w.id,
          name: w.company?.name ?? w.name ?? "Workspace",
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
            : w.id
            ? { id: w.id, name: w.name }
            : null,
        }))
        .filter((w: Workspace) => !!w.id);

      saveCachedWorkspaces(ws);
      setUser(fetchedUser);
      initializeWorkspaceState(fetchedUser, ws);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      clearAllAuthState();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const loginWithGoogleToken = async (token: string): Promise<{ isAdmin: boolean }> => {
    // Save the token first
    localStorage.setItem("auth_token", token);
    localStorage.setItem("token", token);

    try {
      // Use refreshUser logic to get current user and workspaces
      const userResponse = await api.getCurrentUser();
      const fetchedUser = userResponse.data?.user;

      // Check if user is admin account type FIRST
      if ((fetchedUser as any)?.accountType === "admin") {
        clearAllAuthState();
        return { isAdmin: true };
      }

      // Primary source: /me/workspaces
      let ws: Workspace[] = [];
      try {
        const wsRes = await api.getMyWorkspaces();
        const payload = (wsRes as any)?.data ?? {};
        const wsRaw = (payload.workspaces ?? (wsRes as any)?.workspaces ?? []) as any[];
        ws = (Array.isArray(wsRaw) ? wsRaw : []).map((w: any) => ({
          id: w.companyId || w.company?.id || w.id,
          name: w.company?.name ?? w.name ?? "Workspace",
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
            : w.id
            ? { id: w.id, name: w.name }
            : null,
        })).filter((w: Workspace) => !!w.id);
      } catch {}

      // Fallback: workspaces embedded in /auth/me or cached
      if (!Array.isArray(ws) || ws.length === 0) {
        const meWs = (userResponse.data as any)?.workspaces || (userResponse as any)?.workspaces || [];
        const cachedWs = loadCachedWorkspaces();
        const merged = [...meWs];
        cachedWs.forEach((c: any) => {
          const cId = c.id || c.companyId || c.company?.id;
          if (!merged.find((m: any) => (m.companyId || m.company?.id || m.id) === cId)) {
            merged.push(c);
          }
        });
        ws = merged.map((w: any) => ({
          id: w.companyId || w.company?.id || w.id,
          name: w.company?.name ?? w.name ?? "Workspace",
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
            : w.id
            ? { id: w.id, name: w.name }
            : null,
        })).filter((w: Workspace) => !!w.id);
      }

      saveCachedWorkspaces(ws);
      setUser(fetchedUser);
      initializeWorkspaceState(fetchedUser, ws);
      return { isAdmin: false };
    } catch (error) {
      console.error("Google login failed:", error);
      clearAllAuthState();
      throw error;
    }
  };

  const login = async (email: string, password: string): Promise<{ isAdmin: boolean }> => {
    const response = await api.login({ email, password });
    const loggedInUser = response?.data?.user;

    // Check if user is admin account type FIRST, before saving ANYTHING
    if ((loggedInUser as any)?.accountType === "admin") {
      // Ensure NO auth state is saved
      clearAllAuthState();
      return { isAdmin: true };
    }

    // Now that we know it's a workspace account, save the token
    if (response.token) {
      localStorage.setItem("auth_token", response.token);
      localStorage.setItem("token", response.token);
    }

    // Normal workspace login flow
    let ws: Workspace[] = [];
    try {
      const wsRes = await api.getMyWorkspaces();
      const payload = (wsRes as any)?.data ?? {};
      const wsRaw = (payload.workspaces ?? (wsRes as any)?.workspaces ?? []) as any[];
      ws = (Array.isArray(wsRaw) ? wsRaw : []).map((w: any) => ({
        id: w.companyId || w.company?.id || w.id,
        name: w.company?.name ?? w.name ?? "Workspace",
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
          : w.id
          ? { id: w.id, name: w.name }
          : null,
      })).filter((w: Workspace) => !!w.id);
    } catch {}

    if (ws.length === 0) {
      const wsRaw = (response?.data as any)?.workspaces || (response as any)?.workspaces || [];
      ws = (Array.isArray(wsRaw) ? wsRaw : []).map((w: any) => ({
        id: w.companyId || w.company?.id,
        name: w.company?.name ?? "Workspace",
        role: (w.role || "member") as WorkspaceRole,
        status: w.status || "active",
        isVerified: !!w.isVerified,
        company: w.company ? { id: w.company.id, name: w.company.name } : null,
      })).filter((w: Workspace) => !!w.id);
    }

    saveCachedWorkspaces(ws);
    setUser(loggedInUser);
    initializeWorkspaceState(loggedInUser, ws);
    return { isAdmin: false };
  };


  const logout = () => {
    api.logout();
    clearAllAuthState();
  };

  const setActiveCompanyId = (id: string | null) => {
    setActiveCompanyIdState(id);
    if (id) {
      localStorage.setItem('activeCompanyId', id);
    } else {
      localStorage.removeItem('activeCompanyId');
    }
    const active = id ? workspaces.find((w) => w.id === id) : workspaces[0] || null;
    setWorkspaceRole(active?.role || null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWithGoogleToken,
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
