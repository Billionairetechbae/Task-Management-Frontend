import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";

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

import Unauthorized from "./pages/Unauthorized";
import NotFound from "./pages/NotFound";

import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* PUBLIC ROUTES */}
            <Route path="/" element={<Login />} />
            <Route path="/signup-executive" element={<SignupExecutive />} />
            <Route path="/signup-assistant" element={<SignupAssistant />} />
            <Route path="/signup-manager" element={<SignupManager />} />
            <Route path="/signup-executive-join" element={<SignupExecutiveJoin />} />

            {/* PROFILE */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            {/* EXECUTIVE DASHBOARD */}
            <Route
              path="/dashboard-executive"
              element={
                <ProtectedRoute allowedRoles={["executive"]}>
                  <DashboardExecutive />
                </ProtectedRoute>
              }
            />

            {/* MANAGER DASHBOARD */}
            <Route
              path="/dashboard-manager"
              element={
                <ProtectedRoute allowedRoles={["manager"]}>
                  <DashboardManager />
                </ProtectedRoute>
              }
            />

            {/* ASSISTANT DASHBOARD */}
            <Route
              path="/dashboard-assistant"
              element={
                <ProtectedRoute allowedRoles={["assistant"]}>
                  <DashboardAssistant />
                </ProtectedRoute>
              }
            />

            {/* ADMIN DASHBOARD */}
            <Route
              path="/dashboard-admin"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <DashboardAdmin />
                </ProtectedRoute>
              }
            />

            {/* AI HUB */}
            <Route
              path="/ai-hub"
              element={
                <ProtectedRoute allowedRoles={["executive", "manager", "assistant"]}>
                  <AIHub />
                </ProtectedRoute>
              }
            />

            {/* TASK DETAILS */}
            <Route
              path="/task-details/:id"
              element={
                <ProtectedRoute>
                  <TaskDetails />
                </ProtectedRoute>
              }
            />

            {/* TEAM MANAGEMENT (executive + manager) */}
            <Route
              path="/team-management"
              element={
                <ProtectedRoute allowedRoles={["executive", "manager"]}>
                  <TeamManagement />
                </ProtectedRoute>
              }
            />

            {/* COMPANY PROFILE — ONLY EXECUTIVE */}
            <Route
              path="/company-profile"
              element={
                <ProtectedRoute allowedRoles={["executive"]}>
                  <CompanyProfile />
                </ProtectedRoute>
              }
            />

            {/* SYSTEM ROUTES */}
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
