// src/pages/AuditExport.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileArchive, FileSpreadsheet, Loader2, ShieldCheck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { canExportWorkspace } from "@/lib/permissions";

const AuditExportContent = () => {
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState<"zip" | "xlsx" | null>(null);

  const workspaceName =
    localStorage.getItem("activeCompanyName") ||
    localStorage.getItem("activeWorkspaceName") ||
    "Active Workspace";
  const workspaceRole = localStorage.getItem("workspaceRole") || undefined;

  const canAccess = canExportWorkspace(workspaceRole as any, user?.role);

  if (!canAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <ShieldCheck className="h-10 w-10 text-muted-foreground/40" />
        <p className="font-semibold">Access restricted</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Audit exports are available to workspace Owner / Admin and global Executive / Admin only.
        </p>
      </div>
    );
  }

  const handleExportZip = async () => {
    try {
      setLoading("zip");
      await api.exportWorkspaceZip();
      toast({ title: "ZIP export completed" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleExportXlsx = async () => {
    try {
      setLoading("xlsx");
      await api.exportWorkspaceWorkbookXlsx();
      toast({ title: "Workbook export completed" });
    } catch (err: any) {
      toast({ title: "Export failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Description */}
      <p className="text-sm text-muted-foreground">
        Download audit exports for{" "}
        <span className="font-medium text-foreground">{workspaceName}</span>.
        Exports include workspace profile, members, tasks, projects, Harmony reports,
        permissions and drive data.
      </p>

      {/* Export cards */}
      <div className="grid sm:grid-cols-2 gap-5">
        {/* Excel workbook */}
        <Card className="rounded-xl border-primary/20 bg-primary/5">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-primary" />
              Excel Workbook
            </h3>
            <p className="text-sm text-muted-foreground">
              Structured audit export in spreadsheet format. Best for compliance
              reviews and reporting.
            </p>
            <Button onClick={handleExportXlsx} disabled={loading !== null} className="w-full">
              {loading === "xlsx" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : (
                "Download Workbook"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* ZIP */}
        <Card className="rounded-xl border-muted bg-muted/30">
          <CardContent className="p-6 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <FileArchive className="h-5 w-5" />
              ZIP (Raw JSON)
            </h3>
            <p className="text-sm text-muted-foreground">
              Developer-friendly export including raw structured data.
            </p>
            <Button
              variant="secondary"
              onClick={handleExportZip}
              disabled={loading !== null}
              className="w-full"
            >
              {loading === "zip" ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating…</>
              ) : (
                "Download ZIP"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/* Standalone page wrapper — kept for the /audit-exports route */
const AuditExport = ({ embedded = false }: { embedded?: boolean }) => {
  const navigate = useNavigate();

  if (embedded) return <AuditExportContent />;

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-3xl mx-auto space-y-8">
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => navigate("/settings?tab=audit")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Settings
        </Button>

        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            Workspace Audit Center
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage and download workspace audit exports.
          </p>
        </div>

        <AuditExportContent />
      </div>
    </div>
  );
};

export default AuditExport;