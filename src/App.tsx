import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import SignupExecutive from "./pages/SignupExecutive";
import SignupTeamMember from "./pages/SignupTeamMember";
import SignupManager from "./pages/SignupManager";
import SignupExecutiveJoin from "./pages/SignupExecutiveJoin";

import Profile from "./pages/Profile";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardAdmin from "./pages/DashboardAdmin";

import AIHub from "./pages/AIHub";
import AllTasks from "./pages/AllTasks";
import TaskDetails from "./pages/TaskDetails";
import TeamManagement from "./pages/TeamManagement";
import CompanyProfile from "./pages/CompanyProfile";
import TeamDirectory from "./pages/TeamDirectory";
import TeamMemberProfile from "./pages/TeamMemberProfile";

import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";
import TeamMembers from "./pages/TeamMembers";

import { ProtectedRoute } from "./components/ProtectedRoute";


// ADMIN PAGES
import AdminUsers from "./pages/admin/AdminUsers";
import AdminUserDetails from "./pages/admin/AdminUserDetails";
import AdminCompanies from "./pages/admin/AdminCompanies";
import AdminCompanyDetails from "./pages/admin/AdminCompanyDetails";
import AdminTasks from "./pages/admin/AdminTasks";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import AdminSearch from "./pages/admin/AdminSearch";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminDeletedUsers from "./pages/admin/AdminDeletedUsers";
import AdminDeletedCompanies from "./pages/admin/AdminDeletedCompanies";
import VerifyEmail from "./pages/VerifyEmail";

import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminInvites from "./pages/admin/AdminInvites";

import { WebSocketStatus } from '@/components/WebSocketStatus';
import TaskDetailsDebug from "./pages/TaskDetailsDebug";

import ExecutiveAssistanceRequests from "@/pages/ExecutiveAssistanceRequests";
import AdminAssistanceRequests from "@/pages/admin/AdminAssistanceRequests";
import OnboardingTour from "@/components/OnboardingTour";

import Harmony from "./pages/Harmony";
import Signup from "./pages/Signup";
import WorkspaceOnboarding from "./pages/WorkspaceOnboarding";
import Invite from "./pages/Invite";
import NotificationsPage from "./pages/Notifications";





const App = () => (
  <>
    <Toaster />
    <Sonner />
    <WebSocketStatus />
    <OnboardingTour />

    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Login />} />
      <Route path="/signup-executive" element={<SignupExecutive />} /> 
      <Route path="/signup-team_member" element={<SignupTeamMember />} />
      <Route path="/signup-manager" element={<SignupManager />} />
      <Route path="/signup-executive-join" element={<SignupExecutiveJoin />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/invite/:token" element={<Invite />} />
      <Route path="/verify-email/:token" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

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
        path="/task-details-debug/:id"
        element={
          <ProtectedRoute>
            <TaskDetailsDebug />
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
        path="/dashboard-admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardAdmin />
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
          <ProtectedRoute allowedRoles={["executive", "manager"]}>
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




      {/* ================= ADMIN ROUTES ================= */}

      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <DashboardAdmin />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users/:userId"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminUserDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/companies"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminCompanies />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/companies/:companyId"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminCompanyDetails />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/tasks"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminTasks />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/invites"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminInvites />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/analytics"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminAnalytics />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/search"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminSearch />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/logs"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminLogs />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/deleted/users"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDeletedUsers />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/deleted/companies"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminDeletedCompanies />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/assistance-requests"
        element={
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminAssistanceRequests />
          </ProtectedRoute>
        }
      />

      <Route
        path="/assistance-requests"
        element={
          <ProtectedRoute allowedRoles={["executive", "admin"]}>
            <ExecutiveAssistanceRequests />
          </ProtectedRoute>
        }
      />


      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

export default App;
