import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Building2, Bell, CreditCard, Plug, Settings, ShieldCheck, UserRound, LogOut, SlidersHorizontal, Activity } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { SUBSCRIPTION_PATH, canViewSubscription } from "@/lib/workspaceNavigation";

export default function AccountMenu() {
  const { user, logout, workspaceRole, activeWorkspace } = useAuth();
  const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Admiino user";
  const initials = useMemo(() => name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase(), [name]);
  const staff = user?.globalRole === "admin" || user?.globalRole === "super_admin" || user?.platformRole === "admin" || user?.platformRole === "super_admin";
  const workspaceAdmin = workspaceRole === "owner" || workspaceRole === "admin";
  const showSubscription = canViewSubscription(workspaceRole);
  const roleLabel = staff ? (user?.globalRole === "super_admin" || user?.platformRole === "super_admin" ? "Super Admin" : "Platform Admin") : workspaceRole ? workspaceRole[0].toUpperCase() + workspaceRole.slice(1) : null;

  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" size="icon" aria-label="Open account menu" className="h-9 w-9 rounded-full ring-offset-background focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar className="h-8 w-8"><AvatarImage src={user?.profilePictureUrl || undefined} alt="" /><AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback></Avatar>
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" sideOffset={8} className="w-[min(19rem,calc(100vw-1rem))] p-1.5">
      <DropdownMenuLabel className="p-2.5 font-normal">
        <div className="flex min-w-0 items-center gap-3">
          <Avatar className="h-10 w-10 shrink-0"><AvatarImage src={user?.profilePictureUrl || undefined} alt="" /><AvatarFallback className="bg-primary/10 font-semibold text-primary">{initials}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-foreground">{name}</p><p className="truncate text-xs text-muted-foreground">{user?.email || ""}</p>
            <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground"><Building2 className="h-3 w-3 shrink-0" /><span className="truncate">{activeWorkspace?.name || "No active workspace"}</span>{roleLabel && <span className="shrink-0 rounded-full border px-1.5 py-0.5 capitalize">{roleLabel}</span>}</div>
          </div>
        </div>
      </DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Account</DropdownMenuLabel>
      <DropdownMenuItem asChild><Link to="/profile"><UserRound className="mr-2 h-4 w-4" />Account Profile</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/settings"><Settings className="mr-2 h-4 w-4" />Settings</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/notifications"><Bell className="mr-2 h-4 w-4" />Notifications</Link></DropdownMenuItem>
      <DropdownMenuItem asChild><Link to="/settings/integrations"><Plug className="mr-2 h-4 w-4" />Integrations</Link></DropdownMenuItem>
      {workspaceAdmin && <>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2.5 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">Workspace</DropdownMenuLabel>
        <DropdownMenuItem asChild><Link to="/company-profile"><Building2 className="mr-2 h-4 w-4" />Workspace Settings</Link></DropdownMenuItem>
        {showSubscription && <DropdownMenuItem asChild><Link to={SUBSCRIPTION_PATH}><CreditCard className="mr-2 h-4 w-4" />Subscription &amp; Seats</Link></DropdownMenuItem>}
        <DropdownMenuItem asChild><Link to="/settings/workspace/customization"><SlidersHorizontal className="mr-2 h-4 w-4" />Workspace Customization</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/settings/workspace/activity"><Activity className="mr-2 h-4 w-4" />Activity Log</Link></DropdownMenuItem>
        <DropdownMenuItem asChild><Link to="/team-management"><UserRound className="mr-2 h-4 w-4" />Workspace Members</Link></DropdownMenuItem>
      </>}
      {staff && <>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild><a href={`${import.meta.env.VITE_ADMIN_URL || "https://admin.admiino.com"}/admin`}><ShieldCheck className="mr-2 h-4 w-4" />Admin Portal</a></DropdownMenuItem>
      </>}
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => logout()} className="text-destructive focus:bg-destructive/10 focus:text-destructive"><LogOut className="mr-2 h-4 w-4" />Sign out</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}
