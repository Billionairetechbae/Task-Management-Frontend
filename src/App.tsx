import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";

import Login from "./pages/Login";
import SignupExecutive from "./pages/SignupExecutive";
import SignupTeamMember from "./pages/SignupTeamMember";
import SignupManager from "./pages/SignupManager";
import SignupExecutiveJoin from "./pages/SignupExecutiveJoin";

import Profile from "./pages/Profile";
import DashboardExecutive from "./pages/DashboardExecutive";

import AIHub from "./pages/AIHub";
import AllTasks from "./pages/AllTasks";
import TaskDetails from "./pages/TaskDetails";
import TaskWorkbench from "./pages/TaskWorkbench";
import TeamManagement from "./pages/TeamManagement";
import CompanyProfile from "./pages/CompanyProfile";
import TeamDirectory from "./pages/TeamDirectory";
import TeamMemberProfile from "./pages/TeamMemberProfile";

import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import TeamMembers from "./pages/TeamMembers";

import { ProtectedRoute } from "./components/ProtectedRoute";
import OnboardingProfileModal from "./components/OnboardingProfileModal";
import { api } from "./lib/api";
import { useAuth } from "./contexts/AuthContext";

import Harmony from "./pages/Harmony";
import Signup from "./pages/Signup";
import WorkspaceOnboarding from "./pages/WorkspaceOnboarding";
import Invite from "./pages/Invite";
import NotificationsPage from "./pages/Notifications";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import Drive from "./pages/Drive";
import ProjectInvite from "./pages/ProjectInvite";
import WorkspaceAccessRequests from "@/pages/WorkspaceAccessRequests";

import ProjectHealth from "@/pages/ProjectHealth";
import ClientView from "@/pages/ClientView";
import ResourceAccessRequests from "@/pages/ResourceAccessRequests";

import AuditExport from "@/pages/AuditExport";
import ExecutiveAssistanceRequests from "@/pages/ExecutiveAssistanceRequests";
import OnboardingTour from "@/components/OnboardingTour";
import AuthGoogleCallback from "./pages/AuthGoogleCallback";
import Integrations from "./pages/Integrations";

const App = () => {
  const { user, loading } = useAuth();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  useEffect(() => {
    if (loading || !user) return;

    const checkOnboarding = async () => {
      try {
        const res = await api.getOnboardingStatus();
        if (res.data.needsGender) {
          setShowOnboardingModal(true);
        }
      } catch (err) {
        console.error("Failed to check onboarding status:", err);
      }
    };

    checkOnboarding();
  }, [user, loading]);

  return (
    <>
      <Toaster />
      <Toaster />
      <Sonner />
      <OnboardingTour />

      <OnboardingProfileModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={() => setShowOnboardingModal(false)}
      />

      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/auth/google/callback" element={<AuthGoogleCallback />} />
        <Route path="/signup-executive" element={<SignupExecutive />} />
        <Route path="/signup-team_member" element={<SignupTeamMember />} />
        <Route path="/signup-manager" element={<SignupManager />} />
        <Route path="/signup-executive-join" element={<SignupExecutiveJoin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-with-invite" element={<Invite />} />
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="/verify-email/:token" element={<Login />} />
        <Route path="/forgot-password" element={<Login />} />
        <Route path="/reset-password/:token" element={<Login />} />
        <Route path="/project-invite/:token" element={<ProjectInvite />} />
        <Route path="/client-view/:token" element={<ClientView />} />

        {/* TeamMembers Page */}
        <Route
          path="/team_members"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager"]}>
              <TeamMembers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardExecutive />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard-executive"
          element={
            <ProtectedRoute>
              <DashboardExecutive />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard-manager"
          element={
            <ProtectedRoute>
              <DashboardExecutive />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard-team_member"
          element={
            <ProtectedRoute>
              <DashboardExecutive />
            </ProtectedRoute>
          }
        />

        <Route
          path="/onboarding/workspace"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <WorkspaceOnboarding />
            </ProtectedRoute>
          }
        />

        <Route
          path="/resource-access"
          element={
            <ProtectedRoute>
              <ResourceAccessRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/workspace-access"
          element={
            <ProtectedRoute>
              <WorkspaceAccessRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ai-hub"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <AIHub />
            </ProtectedRoute>
          }
        />

        <Route
          path="/harmony"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <Harmony />
            </ProtectedRoute>
          }
        />
        <Route
          path="/tasks/all"
          element={
            <ProtectedRoute>
              <AllTasks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks/my"
          element={
            <ProtectedRoute>
              <AllTasks />
            </ProtectedRoute>
          }
        />

        <Route
          path="/tasks/workbench"
          element={
            <ProtectedRoute>
              <TaskWorkbench />
            </ProtectedRoute>
          }
        />

        <Route
          path="/task-details/:id"
          element={
            <ProtectedRoute>
              <TaskDetails />
            </ProtectedRoute>
          }
        />

        <Route
          path="/team-management"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <TeamManagement />
            </ProtectedRoute>
          }
        />

        <Route
          path="/company-profile"
          element={
            <ProtectedRoute allowedRoles={["executive"]}>
              <CompanyProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/team-directory"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager"]}>
              <TeamDirectory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/team-member/:id"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager"]}>
              <TeamMemberProfile />
            </ProtectedRoute>
          }
        />

        <Route
          path="/projects"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <ProjectDetails />
            </ProtectedRoute>
          }
        />
        <Route
          path="/drive"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <Drive />
            </ProtectedRoute>
          }
        />

        <Route
          path="/assistance-requests"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <ExecutiveAssistanceRequests />
            </ProtectedRoute>
          }
        />

        <Route
          path="/project-health"
          element={
            <ProtectedRoute>
              <ProjectHealth />
            </ProtectedRoute>
          }
        />

        <Route
          path="/audit-exports"
          element={
            <ProtectedRoute>
              <AuditExport />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

export default App;
