import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect, useState } from "react";
import { useAppBootstrap } from "@/hooks/useAppBootstrap";


import Login from "./pages/Login";
import WhatsAppConnect from "./pages/WhatsAppConnect";
import McpAuthorization from "./pages/McpAuthorization";
import SignupExecutive from "./pages/SignupExecutive";
import SignupTeamMember from "./pages/SignupTeamMember";
import SignupManager from "./pages/SignupManager";
import SignupExecutiveJoin from "./pages/SignupExecutiveJoin";

import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardManager from "./pages/DashboardManager";
import DashboardRoleRouter from "./pages/DashboardRoleRouter";

import AllTasks from "./pages/AllTasks";
import TaskDetails from "./pages/TaskDetails";
import TaskWorkbench from "./pages/TaskWorkbench";
import TeamManagement from "./pages/TeamManagement";
import CompanyProfile from "./pages/CompanyProfile";
import WorkspaceCustomization from "./pages/WorkspaceCustomization";
import TeamDirectory from "./pages/TeamDirectory";
import TeamMemberProfile from "./pages/TeamMemberProfile";
import Teams from "./pages/Teams";

import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import TeamMembers from "./pages/TeamMembers";

import { ProtectedRoute } from "./components/ProtectedRoute";
import TaskDetailsRedirect from "./components/TaskDetailsRedirect";
import OnboardingProfileModal from "./components/OnboardingProfileModal";
import { api } from "./lib/api";
import { useAuth } from "./contexts/AuthContext";

import Signup from "./pages/Signup";
import Invite from "./pages/Invite";
import ActivateAccount from "./pages/ActivateAccount";
import VerifyEmailSetup from "./pages/VerifyEmailSetup";
import ClaimOwnership from "./pages/ClaimOwnership";
import NotificationsPage from "./pages/Notifications";
import Projects from "./pages/Projects";
import ProjectDetails from "./pages/ProjectDetails";
import ProjectInvite from "./pages/ProjectInvite";
import Board from "./pages/Board";
import OnboardingTour from "@/components/OnboardingTour";
import OnboardingFlowController from "@/components/OnboardingFlowController";
import AuthGoogleCallback from "./pages/AuthGoogleCallback";
const AIHub = lazy(() => import("./pages/AIHub"));
const Harmony = lazy(() => import("./pages/Harmony"));
const WorkspaceOnboarding = lazy(() => import("./pages/WorkspaceOnboarding"));
const Templates = lazy(() => import("./pages/Templates"));
const Drive = lazy(() => import("./pages/Drive"));
const WorkspaceAccessRequests = lazy(() => import("@/pages/WorkspaceAccessRequests"));
const WorkspaceJoinRequests = lazy(() => import("@/pages/WorkspaceJoinRequests"));
const ProjectHealth = lazy(() => import("@/pages/ProjectHealth"));
const ProjectPortfolio = lazy(() => import("@/pages/ProjectPortfolio"));
const Workload = lazy(() => import("@/pages/Workload"));
const ClientView = lazy(() => import("@/pages/ClientView"));
const ExternalPortal = lazy(() => import("@/pages/ExternalPortal"));
const ResourceAccessRequests = lazy(() => import("@/pages/ResourceAccessRequests"));
const SharedWithMe = lazy(() => import("@/pages/SharedWithMe"));
const WorkspaceInsights = lazy(() => import("@/pages/WorkspaceInsights"));
const WorkspaceActivity = lazy(() => import("@/pages/WorkspaceActivity"));
const WorkspaceAutomations = lazy(() => import("@/pages/WorkspaceAutomations"));
const WorkspaceGovernance = lazy(() => import("@/pages/WorkspaceGovernance"));
const WorkspaceSubscription = lazy(() => import("@/pages/WorkspaceSubscription"));
const TimeTracking = lazy(() => import("@/pages/TimeTracking"));
const AuditExport = lazy(() => import("@/pages/AuditExport"));
const ExecutiveAssistanceRequests = lazy(() => import("@/pages/ExecutiveAssistanceRequests"));
const Integrations = lazy(() => import("./pages/Integrations"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Help = lazy(() => import("./pages/Help"));
const Trash = lazy(() => import("./pages/Trash"));

const RouteFallback = () => <div className="min-h-[50vh] flex items-center justify-center text-sm text-muted-foreground">Loading page…</div>;

const App = () => {
  const { user, loading } = useAuth();
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);

  // Warm caches for dashboard / projects / tasks right after login.
  useAppBootstrap();



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
      <OnboardingFlowController />

      <OnboardingProfileModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onSuccess={() => setShowOnboardingModal(false)}
      />

      <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* PUBLIC ROUTES */}
        <Route path="/" element={<Login />} />
        <Route path="/whatsapp/connect" element={<WhatsAppConnect />} />
        <Route path="/mcp/authorize" element={<ProtectedRoute><McpAuthorization /></ProtectedRoute>} />
        <Route path="/auth/google/callback" element={<AuthGoogleCallback />} />
        <Route path="/integrations/google/callback" element={<AuthGoogleCallback />} />
        <Route path="/signup-executive" element={<SignupExecutive />} />
        <Route path="/signup-team_member" element={<SignupTeamMember />} />
        <Route path="/signup-manager" element={<SignupManager />} />
        <Route path="/signup-executive-join" element={<SignupExecutiveJoin />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup-with-invite" element={<Invite />} />
        <Route path="/activate-account" element={<ActivateAccount />} />
        <Route path="/claim-ownership" element={<ClaimOwnership />} />
        <Route path="/invite/:token" element={<Invite />} />
        <Route path="/verify-email/setup" element={<VerifyEmailSetup />} />
        <Route path="/verify-email/:token" element={<Login />} />
        <Route path="/forgot-password" element={<Login />} />
        <Route path="/reset-password/:token" element={<Login />} />
        <Route path="/project-invite/:token" element={<ProjectInvite />} />
        <Route path="/client-view/:token" element={<ClientView />} />
        <Route path="/external/project/:shareReference" element={<ExternalPortal />} />
        <Route path="/external/task/:shareReference" element={<ExternalPortal />} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/board" element={<ProtectedRoute><Board /></ProtectedRoute>} />
        <Route path="/help" element={<Help />} />

        {/* TeamMembers Page */}
        <Route
          path="/team_members"
          element={
            <ProtectedRoute>
              <TeamMembers />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Settings />
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
              <DashboardRoleRouter />
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
              <DashboardManager />
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
        <Route path="/workspace-insights" element={<ProtectedRoute><WorkspaceInsights /></ProtectedRoute>} />

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
        <Route path="/shared-with-me" element={<ProtectedRoute><SharedWithMe /></ProtectedRoute>} />
        <Route path="/shared-with-me/:resourceType/:resourceId" element={<ProtectedRoute><SharedWithMe /></ProtectedRoute>} />

        <Route
          path="/workspace-access"
          element={
            <ProtectedRoute>
              <WorkspaceAccessRequests />
            </ProtectedRoute>
          }
        />
        <Route path="/settings/workspace/join-requests" element={<ProtectedRoute><WorkspaceJoinRequests /></ProtectedRoute>} />

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

        {/* Backward-compatible redirect: legacy /tasks/:id -> canonical /task-details/:id */}
        <Route path="/tasks/:id" element={<TaskDetailsRedirect />} />

        <Route
          path="/team-management"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <TeamManagement />
            </ProtectedRoute>
          }
        />

        <Route path="/teams/*" element={<ProtectedRoute><Teams /></ProtectedRoute>} />

        <Route
          path="/company-profile"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
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
          path="/projects/portfolio"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <ProjectPortfolio />
            </ProtectedRoute>
          }
        />
        <Route
          path="/templates"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <Templates />
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
        <Route path="/trash" element={<ProtectedRoute><Trash /></ProtectedRoute>} />

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
          path="/workload"
          element={
            <ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}>
              <Workload />
            </ProtectedRoute>
          }
        />
        <Route path="/time" element={<ProtectedRoute allowedRoles={["executive", "manager", "team_member"]}><TimeTracking /></ProtectedRoute>} />

        <Route
          path="/audit-exports"
          element={
            <ProtectedRoute>
              <AuditExport />
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings/integrations"
          element={
            <ProtectedRoute>
              <Integrations />
            </ProtectedRoute>
          }
        />
        <Route path="/settings/workspace/customization" element={<ProtectedRoute><WorkspaceCustomization /></ProtectedRoute>} />
        <Route path="/settings/workspace/activity" element={<ProtectedRoute><WorkspaceActivity /></ProtectedRoute>} />
        <Route path="/settings/workspace/automations" element={<ProtectedRoute><WorkspaceAutomations /></ProtectedRoute>} />
        <Route path="/settings/workspace/governance" element={<ProtectedRoute><WorkspaceGovernance /></ProtectedRoute>} />
        <Route path="/settings/workspace/subscription" element={<ProtectedRoute><WorkspaceSubscription /></ProtectedRoute>} />
        <Route
          path="/integrations"
          element={
            <ProtectedRoute>
              <Integrations />
            </ProtectedRoute>
          }
        />

        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="*" element={<NotFound />} />

      </Routes>
      </Suspense>
    </>
  );
};

export default App;
