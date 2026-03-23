import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DashboardExecutive from "./DashboardExecutive";

export default function DashboardEntry() {
  const { user } = useAuth();
  if (user?.role === "admin") {
    return <Navigate to="/dashboard-admin" replace />;
  }
  return <DashboardExecutive />;
}

