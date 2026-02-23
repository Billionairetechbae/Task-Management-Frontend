import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Building2,
  Settings,
  Bell,
  User,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  TrendingUp,
  Search,
  Paperclip,
  Bot,
  UserCircle,
  Crown,
  Briefcase,
} from "lucide-react";
import WorkspaceSwitcher from "@/components/WorkspaceSwitcher";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Define navigation items based on role
  const getNavItems = (): NavItem[] => {
    const role = user?.role;

    if (role === "admin") {
      return [
        { label: "Dashboard", href: "/dashboard-admin", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Users", href: "/admin/users", icon: <Users className="w-5 h-5" /> },
        { label: "Companies", href: "/admin/companies", icon: <Building2 className="w-5 h-5" /> },
        { label: "Assistance Requests", href: "/admin/assistance-requests", icon: <Paperclip className="w-5 h-5" /> },
        { label: "All Tasks", href: "/admin/tasks", icon: <Briefcase className="w-5 h-5" /> },
        { label: "Analytics", href: "/admin/analytics", icon: <TrendingUp className="w-5 h-5" /> },
        { label: "Global Search", href: "/admin/search", icon: <Search className="w-5 h-5" /> },
        { label: "Deleted Users", href: "/admin/deleted/users", icon: <Users className="w-5 h-5" /> },
        { label: "Deleted Companies", href: "/admin/deleted/companies", icon: <Building2 className="w-5 h-5" /> },
        { label: "System Logs", href: "/admin/logs", icon: <Settings className="w-5 h-5" /> },
      ];
    }

    if (role === "executive") {
      return [
        { label: "Dashboard", href: "/dashboard-executive", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Hire Talent", href: "/assistance-requests", icon: <Users className="w-5 h-5" /> },
        { label: "Team Directory", href: "/team-directory", icon: <Users className="w-5 h-5" /> },
        { label: "Team Management", href: "/team-management", icon: <Crown className="w-5 h-5" /> },
        { label: "TeamMembers", href: "/team_members", icon: <UserCircle className="w-5 h-5" /> },
        { label: "Company Profile", href: "/company-profile", icon: <Building2 className="w-5 h-5" /> },
        { label: "AI Hub", href: "/ai-hub", icon: <Bot className="w-5 h-5" /> },
      ];
    }

    if (role === "manager") {
      return [
        { label: "Dashboard", href: "/dashboard-manager", icon: <LayoutDashboard className="w-5 h-5" /> },
        { label: "Team Directory", href: "/team-directory", icon: <Users className="w-5 h-5" /> },
        { label: "TeamMembers", href: "/team_members", icon: <UserCircle className="w-5 h-5" /> },
      ];
    }

    // TeamMember
    return [
      { label: "Dashboard", href: "/dashboard-team_member", icon: <LayoutDashboard className="w-5 h-5" /> },
      { label: "My Tasks", href: "/dashboard-team_member", icon: <ClipboardList className="w-5 h-5" /> },
      // { label: "Team Directory", href: "/team-directory", icon: <Users className="w-5 h-5" /> },
    ];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    return location.pathname === href;
  };

  const getRoleLabel = () => {
    switch (user?.role) {
      case "admin": return "Platform Admin";
      case "executive": return "Executive";
      case "manager": return "Manager";
      case "team_member": return "TeamMember";
      default: return "User";
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Logo className={cn("transition-all", sidebarOpen ? "h-8" : "h-6")} />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="hidden md:flex h-8 w-8"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <ChevronLeft className={cn("h-4 w-4 transition-transform", !sidebarOpen && "rotate-180")} />
          </Button>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-4">
        <nav className="px-3 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href + item.label}
              to={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                isActive(item.href)
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                !sidebarOpen && "justify-center px-2"
              )}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
              {sidebarOpen && item.badge && item.badge > 0 && (
                <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                  {item.badge}
                </span>
              )}
            </Link>
          ))}
        </nav>
      </ScrollArea>

      {/* User Section */}
      <div className="p-4 border-t border-sidebar-border">
        <div className={cn("flex items-center gap-3", !sidebarOpen && "justify-center")}>
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate">{getRoleLabel()}</p>
            </div>
          )}
        </div>

        <div className={cn("mt-4 space-y-1", !sidebarOpen && "flex flex-col items-center")}>
          <Link
            to="/profile"
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-sidebar-accent",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            <Settings className="w-4 h-4" />
            {sidebarOpen && <span>Settings</span>}
          </Link>
          <button
            onClick={() => {
              logout();
              setMobileOpen(false);
            }}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors hover:bg-destructive/10 text-destructive w-full",
              !sidebarOpen && "justify-center px-2"
            )}
          >
            <LogOut className="w-4 h-4" />
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 fixed inset-y-0 left-0 z-30",
          sidebarOpen ? "w-64" : "w-[72px]"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-sidebar border-r border-sidebar-border transform transition-transform duration-300 md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="absolute top-4 right-4">
          <Button
            variant="ghost"
            size="icon"
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
          sidebarOpen ? "md:ml-64" : "md:ml-[72px]"
        )}
      >
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
          <div className="flex items-center justify-between px-4 sm:px-6 h-16">
            <div className="flex items-center gap-4">
              {/* Mobile Menu Button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </Button>

              {/* Page Title - Can be customized per page */}
              <div className="hidden sm:block">
                <h1 className="text-lg font-semibold capitalize">
                  {location.pathname.split("/").pop()?.replace(/-/g, " ") || "Dashboard"}
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">
              <WorkspaceSwitcher />
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full" />
              </Button>
              <Button variant="outline" size="sm" asChild className="hidden sm:flex gap-2">
                <Link to="/profile">
                  <User className="h-4 w-4" />
                  Profile
                </Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
