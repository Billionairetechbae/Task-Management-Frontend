import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Logo from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  ChevronDown,
  Bot,
  Crown,
  ListChecks,
  Folder,
  FolderKanban,
  Activity,
  ShieldCheck,
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

interface NavGroup {
  label: string;
  icon?: React.ReactNode;
  items: NavItem[];
}

type NavItemOrGroup = NavItem | NavGroup;

const isNavGroup = (item: NavItemOrGroup): item is NavGroup => {
  return "items" in item;
};

interface DashboardLayoutProps {
  children: React.ReactNode;
  fullWidth?: boolean;
  hidePadding?: boolean;
}

const DashboardLayout = ({
  children,
  fullWidth = true,
  hidePadding = false,
}: DashboardLayoutProps) => {
  const { user, logout, workspaceRole } = useAuth();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const getNavItems = (): NavItemOrGroup[] => {
    if (workspaceRole === "owner" || workspaceRole === "admin") {
      return [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
        },
        {
          label: "Projects",
          items: [
            {
              label: "All Projects",
              href: "/projects",
              icon: <FolderKanban className="w-[18px] h-[18px]" />,
            },
            {
              label: "Create Project",
              href: "/projects?create=true",
              icon: <FolderKanban className="w-[18px] h-[18px]" />,
            },
            {
              label: "Project Health",
              href: "/project-health",
              icon: <Activity className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Tasks",
          items: [
            {
              label: "All Tasks",
              href: "/tasks/all",
              icon: <ListChecks className="w-[18px] h-[18px]" />,
            },
            {
              label: "Task Workbench",
              href: "/tasks/workbench",
              icon: <ClipboardList className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Drive",
          href: "/drive",
          icon: <Folder className="w-[18px] h-[18px]" />,
        },
        {
          label: "Access & Permissions",
          items: [
            {
              label: "Client Access",
              href: "/resource-access",
              icon: <ShieldCheck className="w-[18px] h-[18px]" />,
            },
            {
              label: "Workspace Access",
              href: "/workspace-access",
              icon: <ShieldCheck className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Team",
          items: [
            {
              label: "Hire Talent",
              href: "/assistance-requests",
              icon: <Users className="w-[18px] h-[18px]" />,
            },
            {
              label: "Team Directory",
              href: "/team-directory",
              icon: <Users className="w-[18px] h-[18px]" />,
            },
            {
              label: "Team Management",
              href: "/team-management",
              icon: <Crown className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Harmony",
          href: "/harmony",
          icon: <Users className="w-[18px] h-[18px]" />,
        },
        {
          label: "Company Profile",
          href: "/company-profile",
          icon: <Building2 className="w-[18px] h-[18px]" />,
        },
        {
          label: "AI Hub",
          href: "/ai-hub",
          icon: <Bot className="w-[18px] h-[18px]" />,
        },
      ];
    }

    if (workspaceRole === "manager") {
      return [
        {
          label: "Dashboard",
          href: "/dashboard",
          icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
        },
        {
          label: "Projects",
          items: [
            {
              label: "All Projects",
              href: "/projects",
              icon: <FolderKanban className="w-[18px] h-[18px]" />,
            },
            {
              label: "Project Health",
              href: "/project-health",
              icon: <Activity className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Tasks",
          items: [
            {
              label: "All Tasks",
              href: "/tasks/all",
              icon: <ListChecks className="w-[18px] h-[18px]" />,
            },
            {
              label: "Task Workbench",
              href: "/tasks/workbench",
              icon: <ClipboardList className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Drive",
          href: "/drive",
          icon: <Folder className="w-[18px] h-[18px]" />,
        },
        {
          label: "Access & Permissions",
          items: [
            {
              label: "Client Access",
              href: "/resource-access",
              icon: <ShieldCheck className="w-[18px] h-[18px]" />,
            },
            {
              label: "Workspace Access",
              href: "/workspace-access",
              icon: <ShieldCheck className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Team",
          items: [
            {
              label: "Team Directory",
              href: "/team-directory",
              icon: <Users className="w-[18px] h-[18px]" />,
            },
          ],
        },
        {
          label: "Harmony",
          href: "/harmony",
          icon: <Users className="w-[18px] h-[18px]" />,
        },
      ];
    }

    return [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: <LayoutDashboard className="w-[18px] h-[18px]" />,
      },
      {
        label: "Projects",
        items: [
          {
            label: "All Projects",
            href: "/projects",
            icon: <FolderKanban className="w-[18px] h-[18px]" />,
          },
        ],
      },
      {
        label: "Tasks",
        items: [
          {
            label: "All Tasks",
            href: "/tasks/all",
            icon: <ListChecks className="w-[18px] h-[18px]" />,
          },
          {
            label: "My Tasks",
            href: "/tasks/my",
            icon: <ClipboardList className="w-[18px] h-[18px]" />,
          },
          {
            label: "Task Workbench",
            href: "/tasks/workbench",
            icon: <ClipboardList className="w-[18px] h-[18px]" />,
          },
        ],
      },
      {
        label: "Drive",
        href: "/drive",
        icon: <Folder className="w-[18px] h-[18px]" />,
      },
      {
        label: "Access",
        items: [
          {
            label: "Workspace Access",
            href: "/workspace-access",
            icon: <ShieldCheck className="w-[18px] h-[18px]" />,
          },
          {
            label: "My Access Requests",
            href: "/resource-access",
            icon: <ShieldCheck className="w-[18px] h-[18px]" />,
          },
        ],
      },
      {
        label: "Harmony",
        href: "/harmony",
        icon: <Users className="w-[18px] h-[18px]" />,
      },
    ];
  };

  const navItems = getNavItems();

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return location.pathname === "/dashboard";
    }

    if (href === "/projects") {
      return location.pathname.startsWith("/projects");
    }

    if (href === "/tasks/all") {
      return location.pathname === "/tasks/all";
    }

    if (href === "/workspace-access") {
      return location.pathname === "/workspace-access";
    }

    return location.pathname === href;
  };

  const getRoleLabel = () => {
    switch (workspaceRole) {
      case "owner":
        return "Owner";
      case "admin":
        return "Admin";
      case "manager":
        return "Manager";
      case "member":
        return "Member";
      default:
        return "User";
    }
  };

  const NavItemLink = ({ item, isSubItem = false }: { item: NavItem; isSubItem?: boolean }) => {
    const active = isActive(item.href);

    const link = (
      <Link
        to={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          "group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative overflow-hidden",
          isSubItem && "ml-6",
          active
            ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
            : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
          !sidebarOpen && "justify-center px-2"
        )}
      >
        <span
          className={cn(
            "shrink-0 transition-transform duration-200",
            !active && "group-hover:scale-110"
          )}
        >
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
          <TooltipContent side="right" className="font-medium text-xs">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return link;
  };

  const NavItemGroup = ({ group }: { group: NavGroup }) => {
    const [open, setOpen] = useState(true);
    
    const isAnyActive = group.items.some((item) => isActive(item.href));
    const firstItem = group.items[0];

    if (!sidebarOpen) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={firstItem.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center justify-center px-2 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 relative overflow-hidden",
                  isAnyActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <span
                  className={cn(
                    "shrink-0 transition-transform duration-200",
                    !isAnyActive && "group-hover:scale-110"
                  )}
                >
                  {firstItem.icon}
                </span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-xs">
              {group.label}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Collapsible open={open} onOpenChange={setOpen} className="group">
        <CollapsibleTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 w-full text-left",
              isAnyActive
                ? "bg-sidebar-primary/10 text-sidebar-primary"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
          >
            <ChevronDown className="w-4 h-4 shrink-0 transition-transform duration-200 group-data-[state=closed]:-rotate-90" />
            <span className="truncate">{group.label}</span>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-0.5">
          {group.items.map((item) => (
            <NavItemLink key={item.href + item.label} item={item} isSubItem />
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div
        className={cn(
          "px-4 py-4 border-b border-sidebar-border",
          !sidebarOpen && "px-2"
        )}
      >
        <div className="flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 group">
            <Logo
              className={cn(
                "transition-all duration-300",
                sidebarOpen ? "h-7" : "h-5"
              )}
            />
          </Link>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="hidden md:flex h-7 w-7 text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent"
                onClick={() => setSidebarOpen(!sidebarOpen)}
              >
                <ChevronLeft
                  className={cn(
                    "h-4 w-4 transition-transform duration-300",
                    !sidebarOpen && "rotate-180"
                  )}
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">
              {sidebarOpen ? "Collapse" : "Expand"}
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {sidebarOpen && (
        <div className="px-3 py-3 border-b border-sidebar-border">
          <WorkspaceSwitcher />
        </div>
      )}

      <ScrollArea className="flex-1 py-2">
        <nav className="px-2 space-y-0.5">
          {navItems.map((item, index) => {
            if (isNavGroup(item)) {
              return <NavItemGroup key={`group-${index}-${item.label}`} group={item} />;
            }
            return <NavItemLink key={item.href + item.label} item={item} />;
          })}
        </nav>
      </ScrollArea>

      <div className="p-3 border-t border-sidebar-border">
        <div
          className={cn(
            "flex items-center gap-3 px-2 py-2 rounded-lg",
            !sidebarOpen && "justify-center"
          )}
        >
          <div className="w-8 h-8 bg-sidebar-primary/20 rounded-full flex items-center justify-center shrink-0">
            <User className="w-4 h-4 text-sidebar-primary" />
          </div>

          {sidebarOpen && (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-[13px] text-sidebar-accent-foreground truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-sidebar-muted truncate">
                {getRoleLabel()}
              </p>
            </div>
          )}
        </div>

        <div
          className={cn(
            "mt-1 space-y-0.5",
            !sidebarOpen && "flex flex-col items-center"
          )}
        >
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
            {!sidebarOpen && (
              <TooltipContent side="right">Settings</TooltipContent>
            )}
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => {
                  logout();
                  setMobileOpen(false);
                }}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 text-destructive hover:bg-destructive/10 w-full",
                  !sidebarOpen && "justify-center px-2"
                )}
              >
                <LogOut className="w-4 h-4" />
                {sidebarOpen && <span>Logout</span>}
              </button>
            </TooltipTrigger>
            {!sidebarOpen && (
              <TooltipContent side="right">Logout</TooltipContent>
            )}
          </Tooltip>
        </div>
      </div>
    </div>
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="min-h-screen bg-background flex w-full">
        <aside
          className={cn(
            "hidden md:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-out fixed inset-y-0 left-0 z-30",
            sidebarOpen ? "w-[240px]" : "w-[56px]"
          )}
        >
          <SidebarContent />
        </aside>

        {mobileOpen && (
          <div
            className="fixed inset-0 bg-foreground/40 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

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

        <div
          className={cn(
            "flex-1 flex flex-col min-w-0 transition-all duration-300 ease-out",
            sidebarOpen ? "md:ml-[240px]" : "md:ml-[56px]"
          )}
        >
          <header className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border h-14 shrink-0">
            <div className="flex items-center justify-between px-4 sm:px-6 h-full">
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
                  <h1 className="text-sm font-semibold capitalize text-foreground tracking-tight">
                    {location.pathname
                      .split("/")
                      .pop()
                      ?.replace(/-/g, " ")
                      .replace(/_/g, " ") || "Dashboard"}
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
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      className="hidden sm:flex h-8 w-8"
                    >
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

          <main
            className={cn(
              "flex-1 min-w-0",
              !hidePadding && "p-4 sm:p-6",
              !fullWidth && "max-w-[1400px] mx-auto w-full"
            )}
          >
            {children}
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default DashboardLayout;
