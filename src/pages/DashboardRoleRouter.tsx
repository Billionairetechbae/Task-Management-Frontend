import { useAuth } from "@/contexts/AuthContext";
import DashboardExecutive from "@/pages/DashboardExecutive";
import DashboardManager from "@/pages/DashboardManager";

export default function DashboardRoleRouter() {
  const { workspaceRole } = useAuth();
  return workspaceRole === "manager" ? <DashboardManager /> : <DashboardExecutive />;
}
