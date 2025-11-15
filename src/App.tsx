import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import SignupExecutive from "./pages/SignupExecutive";
import SignupAssistant from "./pages/SignupAssistant";
import Profile from "./pages/Profile";
import DashboardExecutive from "./pages/DashboardExecutive";
import DashboardAssistant from "./pages/DashboardAssistant";
import DashboardAdmin from "./pages/DashboardAdmin";
import AIHub from "./pages/AIHub";
import TaskDetails from "./pages/TaskDetails";
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
            <Route path="/" element={<Login />} />
            <Route path="/signup-executive" element={<SignupExecutive />} />
            <Route path="/signup-assistant" element={<SignupAssistant />} />
            
            <Route path="/profile" element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard-executive" element={
              <ProtectedRoute allowedRoles={['executive']}>
                <DashboardExecutive />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard-assistant" element={
              <ProtectedRoute allowedRoles={['assistant']}>
                <DashboardAssistant />
              </ProtectedRoute>
            } />
            
            <Route path="/dashboard-admin" element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardAdmin />
              </ProtectedRoute>
            } />
            
            <Route path="/ai-hub" element={
              <ProtectedRoute>
                <AIHub />
              </ProtectedRoute>
            } />
            
            <Route path="/task-details" element={
              <ProtectedRoute>
                <TaskDetails />
              </ProtectedRoute>
            } />
            
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
