import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Sentry } from "@/lib/sentry";

export default function SentryContextBridge() {
  const { user, activeCompanyId } = useAuth();
  const location = useLocation();
  useEffect(() => {
    Sentry.setUser(user?.id ? { id: user.id } : null);
    Sentry.setTag("workspace_id", activeCompanyId || "none");
    Sentry.setTag("route", location.pathname);
  }, [user?.id, activeCompanyId, location.pathname]);
  return null;
}
