import { Info } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import CustomFieldsManager from "@/components/customFields/CustomFieldsManager";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export default function WorkspaceCustomization() {
  const { workspaceRole } = useAuth();
  const canManage = ["owner", "admin", "manager"].includes(String(workspaceRole));
  return <DashboardLayout>
    <div className="mx-auto w-full max-w-6xl space-y-6 py-5">
      <header className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-2"><h1 className="text-2xl font-semibold tracking-tight">Workspace customization</h1>
            <TooltipProvider delayDuration={200}><Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" aria-label="About workspace customization"><Info className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent side="right" className="max-w-xs">Customize the reusable information your workspace tracks across tasks and projects.</TooltipContent></Tooltip></TooltipProvider>
          </div>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Set up workspace-level fields that fit the way your team works. Managers can create and manage task and project fields.</p>
        </div>
        <a href="https://www.admiino.com/guide#custom-fields" target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">Learn more in the Guide</a>
      </header>

      <section className="rounded-xl border bg-card p-4 sm:p-5" aria-labelledby="custom-fields-heading">
        <div className="mb-4 max-w-3xl">
          <h2 id="custom-fields-heading" className="text-lg font-semibold">Custom fields</h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Custom fields let your workspace track information Admiino does not include by default. Create reusable fields such as Client, Budget, Department, Approval Status or Reference Number and display them across tasks or projects. Task Fields affect tasks; Project Fields affect projects. Fields belong to this workspace. A field’s type and entity scope cannot be changed after creation. Required fields must be filled in when the related task or project is created or updated.</p>
        </div>
        {canManage ? <CustomFieldsManager /> : <div className="rounded-lg border border-dashed p-5 text-sm text-muted-foreground">Only workspace owners, admins and managers can manage custom field definitions.</div>}
      </section>
    </div>
  </DashboardLayout>;
}
