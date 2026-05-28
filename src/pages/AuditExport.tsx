// src/pages/AuditExport.tsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileArchive, FileSpreadsheet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { canExportWorkspace } from "@/lib/permissions";

const AuditExport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const [loading, setLoading] = useState<"zip" | "xlsx" | null>(null);

  const workspaceName =
    localStorage.getItem("activeCompanyName") || "Active Workspace";
  const workspaceRole =
    localStorage.getItem("workspaceRole") || undefined;

  const canAccess = canExportWorkspace(workspaceRole as any, user?.role);

  if (!canAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <CardTitle className="mb-2">Unauthorized</CardTitle>
          <p className="text-sm text-muted-foreground">
            You do not have permission to export this workspace.
          </p>
          <Button className="mt-4" onClick={() => navigate("/profile")}>
            Back to Profile
          </Button>
        </Card>
      </div>
    );
  }

  const handleExportZip = async () => {
    try {
      setLoading("zip");
      await api.exportWorkspaceZip();
      toast({ title: "ZIP export completed" });
    } catch (err: any) {
      toast({
        title: "Export failed",
        description: err.message,
        variant: "destructive",
      });
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
      toast({
        title: "Export failed",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Back Navigation */}
        <Button
          variant="ghost"
          className="flex items-center gap-2"
          onClick={() => navigate("/profile")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Button>

        {/* Page Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight">
            Workspace Audit Center
          </h1>
          <p className="text-muted-foreground">
            Manage and download audit exports for
            <span className="font-medium text-foreground"> {workspaceName}</span>.
          </p>
        </div>

        {/* Export Section */}
        <Card className="rounded-2xl shadow-sm border-muted">
          <CardHeader>
            <CardTitle>Export Workspace Data</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">

            <div className="grid md:grid-cols-2 gap-6">

              {/* Workbook */}
              <Card className="rounded-xl border-primary/20 bg-primary/5">
                <CardContent className="p-6 space-y-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5" />
                    Excel Workbook
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Structured audit export in spreadsheet format.
                    Best for compliance reviews and reporting.
                  </p>
                  <Button
                    onClick={handleExportXlsx}
                    disabled={loading !== null}
                    className="w-full"
                  >
                    {loading === "xlsx" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
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
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      "Download ZIP"
                    )}
                  </Button>
                </CardContent>
              </Card>

            </div>

            <div className="text-xs text-muted-foreground">
              Exports include workspace profile, members, tasks, projects,
              Harmony reports, permissions and drive data.
            </div>

          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default AuditExport;