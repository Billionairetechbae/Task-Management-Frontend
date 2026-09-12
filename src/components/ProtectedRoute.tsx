import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { preserveAuthReturnPath } from '@/lib/authReturnPath';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: ('executive' | 'manager' | 'team_member')[];
}

export const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    preserveAuthReturnPath(returnTo);
    return <Navigate to="/" replace state={{ returnTo }} />;
  }

  // Only allow workspace accounts
  if ((user as any)?.accountType === "admin") {
    return <Navigate to="/" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as any)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <>{children}</>;
};
