import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

import { AuthProvider } from "@/contexts/AuthContext";
import { WebSocketProvider } from "@/contexts/WebSocketContext"; // Add this import
import { NotificationsProvider } from "@/contexts/NotificationsContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter } from "react-router-dom";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { initializeSentry } from "@/lib/sentry";
import SentryContextBridge from "@/components/SentryContextBridge";

initializeSentry();

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary><QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <BrowserRouter>
          <SentryContextBridge />
          <WebSocketProvider>
            <NotificationsProvider>
              <App />
            </NotificationsProvider>
          </WebSocketProvider>
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider></AppErrorBoundary>
);
