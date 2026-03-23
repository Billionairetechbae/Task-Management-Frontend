import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Building2,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  TrendingUp,
  Search,
  Bot,
  UserCircle,
  Crown,
  ListChecks,
  Paperclip,
  FolderKanban,
} from "lucide-react";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";
import NotificationsDropdown from "@/components/notifications/NotificationsDropdown";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  iconComponent?: any;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout, workspaceRole } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getNavItems = (): NavItem[] => {
    const role = user?.role;

    if (role === "admin") {
      return [
        { label: "Overview", href: "/dashboard-admin", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Workspaces", href: "/admin/companies", icon: <Building2 className="w-5 h-5" /> },
        { label: "Users", href: "/admin/users", icon: <Users className="w-5 h-5" /> },
        { label: "Assistance Requests", href: "/admin/assistance-requests", icon: <Paperclip className="w-5 h-5" /> },
        { label: "Invites", href: "/admin/invites", icon: <Paperclip className="w-5 h-5" /> },
        { label: "Tasks", href: "/admin/tasks", icon: <ClipboardList className="w-5 h-5" /> },
        { label: "Analytics", href: "/admin/analytics", icon: <TrendingUp className="w-5 h-5" /> },
        { label: "Search", href: "/admin/search", icon: <Search className="w-5 h-5" /> },
        { label: "Logs", href: "/admin/logs", icon: <Settings className="w-5 h-5" /> },
      ];
    }

    if (workspaceRole === "owner" || workspaceRole === "admin") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Projects", href: "/projects", icon: <FolderKanban className="w-5 h-5" /> },
        { label: "All Tasks", href: "/tasks/all", icon: <ListChecks className="w-5 h-5" /> },
        { label: "Hire Talent", href: "/assistance-requests", icon: <Users className="w-5 h-5" /> },
        { label: "Team Directory", href: "/team-directory", icon: <Users className="w-5 h-5" /> },
        { label: "Team Management", href: "/team-management", icon: <Crown className="w-5 h-5" /> },
        { label: "Team Members", href: "/team_members", icon: <UserCircle className="w-5 h-5" /> },
        { label: "Harmony", href: "/harmony", icon: <Users className="w-5 h-5" /> },
        { label: "Company Profile", href: "/company-profile", icon: <Building2 className="w-5 h-5" /> },
        { label: "AI Hub", href: "/ai-hub", icon: <Bot className="w-5 h-5" /> },
      ];
    }

    if (workspaceRole === "manager") {
      return [
        { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "All Tasks", href: "/tasks/all", icon: <ListChecks className="w-5 h-5" /> },
        { label: "Team Directory", href: "/team-directory", icon: <Users className="w-5 h-5" /> },
        { label: "Team Members", href: "/team_members", icon: <UserCircle className="w-5 h-5" /> },
        { label: "Harmony", href: "/harmony", icon: <Users className="w-5 h-5" /> },
      ];
    }

    return [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: "All Tasks", href: "/tasks/all", icon: <ListChecks className="w-5 h-5" /> },
      { label: "My Tasks", href: "/tasks/my", icon: <ClipboardList className="w-5 h-5" /> },
      { label: "Harmony", href: "/harmony", icon: <Users className="w-5 h-5" /> },
    ];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => location.pathname === href;

  const getRoleLabel = () => {
    if (user?.role === "admin") return "Platform Admin";
    switch (workspaceRole) {
      case "owner": return "Workspace Owner";
      case "admin": return "Workspace Admin";
      case "manager": return "Workspace Manager";
      case "member": return "Workspace Member";
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
          "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 relative",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-soft"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          !sidebarOpen && "justify-center px-2"
        )}
      >
        <span className={cn(
          "transition-transform duration-200",
          !active && "group-hover:scale-110"
        )}>
          {item.icon}
        </span>
        {sidebarOpen && (
          <span className="animate-fade-in truncate">{item.label}</span>
        )}
        {sidebarOpen && item.badge && item.badge > 0 && (
          <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
            {item.badge}
          </span>
        )}
      </Link>
    );

    if (!sidebarOpen) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>{link}</TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-sidebar-border">
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
            <TooltipContent side="right">
              {sidebarOpen ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3 space-y-0.5">
          {navItems.map((item) => (
            <NavItemLink key={item.href + item.label} item={item} />
          ))}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="p-3 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3 px-2 py-2", !sidebarOpen && "justify-center")}>
          <div className="w-8 h-8 bg-sidebar-primary/20 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-4 h-4 text-sidebar-primary" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0 animate-fade-in">
              <p className="font-medium text-sm text-sidebar-accent-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-sidebar-muted truncate">{getRoleLabel()}</p>
            </div>
          )}
        </div>

        <div className={cn("mt-2 space-y-0.5", !sidebarOpen && "flex flex-col items-center")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to="/profile"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
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
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200 text-destructive hover:bg-destructive/10 w-full",
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
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background flex">
        {/* Desktop Sidebar */}
        <aside
          className={cn(
            "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed inset-y-0 left-0 z-30",
            sidebarOpen ? "w-60" : "w-[60px]"
          )}
        >
          <SidebarContent />
        </aside>

        {/* Mobile Sidebar Overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 ease-out md:hidden",
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="absolute top-4 right-4">
            <Button
              variant="ghost"
              size="icon"
              className="text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setMobileOpen(false)}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
          <SidebarContent />
        </aside>

        {/* Main Content */}
        <div
          className={cn(
            "flex-1 flex flex-col transition-all duration-300",
            sidebarOpen ? "md:ml-60" : "md:ml-[60px]"
          )}
        >
          {/* Top Header */}
          <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border">
            <div className="flex items-center justify-between px-4 sm:px-6 h-14">
              <div className="flex items-center gap-3">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="md:hidden h-8 w-8"
                      onClick={() => setMobileOpen(true)}
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Menu</TooltipContent>
                </Tooltip>

                <div className="hidden sm:block">
                  <h1 className="text-base font-semibold capitalize text-foreground">
                    {location.pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <WorkspaceSwitcher />
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

          {/* Page Content */}
          <main className="flex-1 p-4 sm:p-6 lg:p-8 animate-fade-in">
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardLayout;
