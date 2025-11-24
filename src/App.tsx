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

      <Route path="/unauthorized" element={<Unauthorized />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  </>
);

export default App;
