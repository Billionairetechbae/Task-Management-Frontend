import { useState } from "react";
import { Project, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save } from "lucide-react";

interface ProjectSettingsTabProps {
  project: Project;
  onRefresh: () => void;
}

const ProjectSettingsTab = ({ project, onRefresh }: ProjectSettingsTabProps) => {
  const { toast } = useToast();
  const settings = project.settings || {};
  const [form, setForm] = useState({
    color: (settings.color as string) || "#7c3aed",
    notes: (settings.notes as string) || "",
    labels: (settings.labels as string) || "",
    custom: (settings.custom as string) || "",
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateProjectSettings(project.id, {
        color: form.color,
        notes: form.notes,
        labels: form.labels.split(",").map(l => l.trim()).filter(Boolean).join(", "),
        custom: form.custom,
      });
      toast({ title: "Settings saved" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <Card className="shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Project Color</Label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer"
              />
              <Input
                value={form.color}
                onChange={e => setForm(prev => ({ ...prev, color: e.target.value }))}
                className="w-32 h-9 text-sm font-mono"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Project Notes</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Add internal notes about this project..."
            value={form.notes}
            onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
            rows={4}
            className="text-sm"
          />
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Labels</CardTitle>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="design, frontend, urgent (comma-separated)"
            value={form.labels}
            onChange={e => setForm(prev => ({ ...prev, labels: e.target.value }))}
            className="text-sm"
          />
          <p className="text-xs text-muted-foreground mt-1.5">Separate labels with commas</p>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-medium">Custom Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Any additional project configuration..."
            value={form.custom}
            onChange={e => setForm(prev => ({ ...prev, custom: e.target.value }))}
            rows={3}
            className="text-sm"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Save Settings
        </Button>
      </div>
    </div>
  );
};

export default ProjectSettingsTab;
