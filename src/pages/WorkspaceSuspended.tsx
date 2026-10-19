import { useNavigate } from "react-router-dom";
import { LifeBuoy, LogOut, PauseCircle, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SupportLauncher from "@/components/support/SupportLauncher";

/**
 * Restricted-access screen for a suspended workspace. It is deliberately self-contained: it needs no workspace API, keeps
 * Support reachable, offers a way to another live workspace, and always allows sign-out (no redirect loops).
 * It never shows why the workspace was suspended or anything about billing.
 */
export default function WorkspaceSuspended() {
  const { suspendedWorkspace, workspaces, setActiveCompanyId, clearSuspendedWorkspace, logout } = useAuth();
  const navigate = useNavigate();
  if (!suspendedWorkspace) return null;
  const others = workspaces.filter((w) => w.id !== suspendedWorkspace.id && w.status !== "removed");

  const switchTo = (id: string) => { setActiveCompanyId(id); clearSuspendedWorkspace(); navigate("/dashboard", { replace: true }); };
  const openSupport = () => window.dispatchEvent(new Event("support:open"));

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-lg">
        <CardContent className="space-y-5 p-8">
          <div className="flex items-start gap-3">
            <PauseCircle aria-hidden className="mt-1 h-7 w-7 text-amber-600" />
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">This workspace is temporarily suspended.</h1>
              <p className="mt-2 text-sm text-muted-foreground">Access to this workspace is temporarily unavailable. Your workspace data has been retained. Please contact your workspace administrator or Admiino Support for assistance.</p>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/40 p-3 text-sm">
            <dt className="text-muted-foreground">Workspace</dt><dd className="col-span-2 font-medium">{suspendedWorkspace.name ?? "Your workspace"}</dd>
            {suspendedWorkspace.reference && (<><dt className="text-muted-foreground">Reference</dt><dd className="col-span-2 font-mono">{suspendedWorkspace.reference}</dd></>)}
          </dl>
          <p className="text-xs text-muted-foreground">Quote the reference when you contact Support so we can help you faster.</p>
          {others.length > 0 && (
            <section aria-label="Switch workspace" className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium"><Repeat className="h-4 w-4" />Switch workspace</p>
              <ul className="space-y-1">{others.map((w) => <li key={w.id}><Button variant="outline" className="w-full justify-start" onClick={() => switchTo(w.id)}>{w.name || "Workspace"}</Button></li>)}</ul>
            </section>
          )}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <Button onClick={openSupport}><LifeBuoy className="mr-2 h-4 w-4" />Contact Support</Button>
            <Button variant="outline" onClick={() => { clearSuspendedWorkspace(); window.location.reload(); }}>Check again</Button>
            <Button variant="ghost" onClick={() => { logout(); navigate("/", { replace: true }); }}><LogOut className="mr-2 h-4 w-4" />Sign out</Button>
          </div>
        </CardContent>
      </Card>
      <SupportLauncher />
    </main>
  );
}
