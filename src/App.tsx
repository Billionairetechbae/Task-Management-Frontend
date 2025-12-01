import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import SignupExecutive from "./pages/SignupExecutive";
import SignupAssistant from "./pages/SignupAssistant";
import SignupManager from "./pages/SignupManager";
import SignupExecutiveJoin from "./pages/SignupExecutiveJoin";

import Profile from "./pages/Profile";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardManager from "./pages/DashboardManager";
import DashboardAssistant from "./pages/DashboardAssistant";
import DashboardAdmin from "./pages/DashboardAdmin";

import AIHub from "./pages/AIHub";
import TaskDetails from "./pages/TaskDetails";
import TeamManagement from "./pages/TeamManagement";
import CompanyProfile from "./pages/CompanyProfile";
import TeamDirectory from "./pages/TeamDirectory";
import TeamMemberProfile from "./pages/TeamMemberProfile";

import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

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


const App = () => (
  <>
    <Toaster />
    <Sonner />

    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/" element={<Login />} />
      <Route path="/signup-executive" element={<SignupExecutive />} />
      <Route path="/signup-assistant" element={<SignupAssistant />} />
      <Route path="/signup-manager" element={<SignupManager />} />
      <Route path="/signup-executive-join" element={<SignupExecutiveJoin />} />

      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard-executive"
        element={
          <ProtectedRoute allowedRoles={["executive"]}>
            <DashboardExecutive />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard-manager"
        element={
          <ProtectedRoute allowedRoles={["manager"]}>
            <DashboardManager />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard-assistant"
        element={
          <ProtectedRoute allowedRoles={["assistant"]}>
            <DashboardAssistant />
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
        path="/ai-hub"
        element={
          <ProtectedRoute allowedRoles={["executive", "manager", "assistant"]}>
            <AIHub />
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


      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

export default App;
