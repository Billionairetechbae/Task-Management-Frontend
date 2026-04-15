import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, ClipboardList, Building2, Settings, User, LogOut,
  Menu, X, ChevronLeft, TrendingUp, Search, Bot, UserCircle, Crown,
  ListChecks, Paperclip, Folder, FolderKanban,
} from "lucide-react";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";
import { WebSocketStatus } from "@/components/WebSocketStatus";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  hidePadding?: boolean;
}

const DashboardLayout = ({ children, fullWidth = false, hidePadding = false }: DashboardLayoutProps) => {
  const { user, logout, workspaceRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getNavItems = (): NavItem[] => {
    const role = user?.role;
    if (role === "admin") {
      return [
        { label: "Overview", href: "/dashboard-admin", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { label: "Workspaces", href: "/admin/companies", icon: <Building2 className="w-[18px] h-[18px]" /> },
        { label: "Users", href: "/admin/users", icon: <Users className="w-[18px] h-[18px]" /> },
        { label: "Assistance Requests", href: "/admin/assistance-requests", icon: <Paperclip className="w-[18px] h-[18px]" /> },
        { label: "Invites", href: "/admin/invites", icon: <Paperclip className="w-[18px] h-[18px]" /> },
        { label: "Tasks", href: "/admin/tasks", icon: <ClipboardList className="w-[18px] h-[18px]" /> },
        { label: "Analytics", href: "/admin/analytics", icon: <TrendingUp className="w-[18px] h-[18px]" /> },
        { label: "Search", href: "/admin/search", icon: <Search className="w-[18px] h-[18px]" /> },
        { label: "Logs", href: "/admin/logs", icon: <Settings className="w-[18px] h-[18px]" /> },
      ];
    }
    if (workspaceRole === "owner" || workspaceRole === "admin") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { label: "Projects", href: "/projects", icon: <FolderKanban className="w-[18px] h-[18px]" /> },
        { label: "All Tasks", href: "/tasks/all", icon: <ListChecks className="w-[18px] h-[18px]" /> },
        { label: "Drive", href: "/drive", icon: <Folder className="w-[18px] h-[18px]" /> },
        { label: "Hire Talent", href: "/assistance-requests", icon: <Users className="w-[18px] h-[18px]" /> },
        { label: "Team Directory", href: "/team-directory", icon: <Users className="w-[18px] h-[18px]" /> },
        { label: "Team Management", href: "/team-management", icon: <Crown className="w-[18px] h-[18px]" /> },
        { label: "Team Members", href: "/team_members", icon: <UserCircle className="w-[18px] h-[18px]" /> },
        { label: "Harmony", href: "/harmony", icon: <Users className="w-[18px] h-[18px]" /> },
        { label: "Company Profile", href: "/company-profile", icon: <Building2 className="w-[18px] h-[18px]" /> },
        { label: "AI Hub (Coming Soon)", href: "/ai-hub", icon: <Bot className="w-[18px] h-[18px]" /> },
      ];
    }
    if (workspaceRole === "manager") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
        { label: "Projects", href: "/projects", icon: <FolderKanban className="w-[18px] h-[18px]" /> },
        { label: "All Tasks", href: "/tasks/all", icon: <ListChecks className="w-[18px] h-[18px]" /> },
        { label: "Drive", href: "/drive", icon: <Folder className="w-[18px] h-[18px]" /> },
        { label: "Team Directory", href: "/team-directory", icon: <Users className="w-[18px] h-[18px]" /> },
        { label: "Team Members", href: "/team_members", icon: <UserCircle className="w-[18px] h-[18px]" /> },
        { label: "Harmony", href: "/harmony", icon: <Users className="w-[18px] h-[18px]" /> },
      ];
    }
    return [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-[18px] h-[18px]" /> },
      { label: "Projects", href: "/projects", icon: <FolderKanban className="w-[18px] h-[18px]" /> },
      { label: "All Tasks", href: "/tasks/all", icon: <ListChecks className="w-[18px] h-[18px]" /> },
      { label: "Drive", href: "/drive", icon: <Folder className="w-[18px] h-[18px]" /> },
      { label: "My Tasks", href: "/tasks/my", icon: <ClipboardList className="w-[18px] h-[18px]" /> },
      { label: "Harmony", href: "/harmony", icon: <Users className="w-[18px] h-[18px]" /> },
    ];
  };

  const navItems = getNavItems();
  const isActive = (href: string) => location.pathname === href;

  const getRoleLabel = () => {
    if (user?.role === "admin") return "Platform Admin";
    switch (workspaceRole) {
      case "owner": return "Owner";
      case "admin": return "Admin";
      case "manager": return "Manager";
      case "member": return "Member";
      default: return "User";
    }
  };

  const NavItemLink = ({ item }: { item: NavItem }) => {
    const active = isActive(item.href);
    const link = (
      <Link
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative overflow-hidden",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          !sidebarOpen && "justify-center px-2"
        )}
      >
        <span className={cn("shrink-0 transition-transform duration-200", !active && "group-hover:scale-110")}>
          {item.icon}
        </span>
        {sidebarOpen && <span className="truncate">{item.label}</span>}
        {sidebarOpen && item.badge && item.badge > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-semibold">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (!sidebarOpen) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium text-xs">{item.label}</TooltipContent>
        </Tooltip>
      );
    }
    return link;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo area */}
      <div className={cn("px-4 py-4 border-b border-sidebar-border", !sidebarOpen && "px-2")}>
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo className={cn("transition-all duration-300", sidebarOpen ? "h-7" : "h-5")} />
          </Link>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex h-7 w-7 text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <ChevronLeft className={cn("h-4 w-4 transition-transform duration-300", !sidebarOpen && "rotate-180")} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{sidebarOpen ? "Collapse" : "Expand"}</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Workspace switcher */}
      {sidebarOpen && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <WorkspaceSwitcher />
        </div>
      )}

      {/* Navigation */}
      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-0.5">
          {navItems.map((item) => (
            <NavItemLink key={item.href + item.label} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* User section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3 px-2 py-2 rounded-lg", !sidebarOpen && "justify-center")}>
          <div className="w-8 h-8 bg-sidebar-primary/20 rounded-full flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-sidebar-primary" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px] text-sidebar-accent-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-sidebar-muted truncate">{getRoleLabel()}</p>
            </div>
          )}
        </div>

        <div className={cn("mt-1 space-y-0.5", !sidebarOpen && "flex flex-col items-center")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  !sidebarOpen && "justify-center px-2"
                )}
              >
                <Settings className="w-4 h-4" />
                {sidebarOpen && <span>Settings</span>}
              </Link>
            </TooltipTrigger>
            {!sidebarOpen && <TooltipContent side="right">Settings</TooltipContent>}
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => { logout(); setMobileOpen(false); }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 text-destructive hover:bg-destructive/10 w-full",
                  !sidebarOpen && "justify-center px-2"
                )}
              >
                <LogOut className="w-4 h-4" />
                {sidebarOpen && <span>Logout</span>}
              </button>
            </TooltipTrigger>
            {!sidebarOpen && <TooltipContent side="right">Logout</TooltipContent>}
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background flex w-full">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out fixed inset-y-0 left-0 z-30",
            sidebarOpen ? "w-[240px]" : "w-[56px]"
          )}
        >
          <SidebarContent />
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-[280px] bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="absolute top-3 right-3">
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent h-8 w-8"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <SidebarContent />
        </aside>

        {/* Main content area */}
        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out",
            sidebarOpen ? "md:ml-[240px]" : "md:ml-[56px]"
          )}
        >
          {/* Top header bar */}
          <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border h-14 shrink-0">
            <div className="flex items-center justify-between px-4 sm:px-6 h-full">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileOpen(true)}>
                      <Menu className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Menu</TooltipContent>
                </Tooltip>
                <div className="hidden sm:block">
                  <h1 className="text-sm font-semibold capitalize text-foreground tracking-tight">
                    {location.pathname.split("/").pop()?.replace(/-/g, " ").replace(/_/g, " ") || "Dashboard"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <div className="hidden sm:block">
                  <WorkspaceSwitcher />
                </div>
                <div className="hidden sm:block">
                  <WebSocketStatus />
                </div>
                <NotificationsDropdown />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" asChild className="hidden sm:flex h-8 w-8">
                      <Link to="/profile">
                        <User className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Profile</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className={cn(
            "flex-1 min-w-0",
            !hidePadding && "p-4 sm:p-6",
            !fullWidth && "max-w-[1400px] mx-auto w-full"
          )}>
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardLayout;
