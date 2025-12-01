import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

const AdminLogs = () => {
  const { toast } = useToast();
  const [logs, setLogs] = useState<string | null>(null);

  const loadLogs = async () => {
    try {
        const response = await api.adminGetSystemLogs();
        setLogs(JSON.stringify(response, null, 2));
    } catch (err: any) {
      toast({
        title: "Logs unavailable",
        description: err.message,
        variant: "destructive",
      });
      setLogs("No logs available.");
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="min-h-screen bg-background p-6">

      <h2 className="text-3xl font-bold mb-6 flex items-center gap-2">
        <FileText className="w-8 h-8 text-primary" />
        System Logs
      </h2>

      <div className="bg-card border border-border rounded-xl p-6">
        <pre className="text-xs whitespace-pre-wrap">
          {logs || "Loading logs..."}
        </pre>
      </div>

      <Button className="mt-6" onClick={loadLogs}>
        Refresh Logs
      </Button>

    </div>
  );
};

export default AdminLogs;
