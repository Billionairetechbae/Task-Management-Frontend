import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, Team } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface TeamSelectorProps {
  value?: string | null;
  onChange: (teamId: string | null) => void;
  label?: string;
  disabled?: boolean;
}

export default function TeamSelector({ value, onChange, label = "Team", disabled }: TeamSelectorProps) {
  const { activeCompanyId } = useAuth();
  const { toast } = useToast();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setTeams([]);
    if (!activeCompanyId) return;
    setLoading(true);
    api.listTeams()
      .then((response) => {
        if (cancelled) return;
        const nextTeams = response.data.teams || [];
        setTeams(nextTeams);
        if (value && !nextTeams.some((team) => team.id === value)) onChange(null);
      })
      .catch((error: any) => {
        if (cancelled) return;
        onChange(null);
        toast({ title: "Teams unavailable", description: error.message, variant: "destructive" });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? null : next)} disabled={disabled || loading || !activeCompanyId}>
        <SelectTrigger><SelectValue placeholder={loading ? "Loading teams..." : "No team"} /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">No team</SelectItem>
          {teams.map((team) => <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>)}
        </SelectContent>
      </Select>
      {!loading && activeCompanyId && teams.length === 0 && <p className="text-xs text-muted-foreground">No teams are available in this workspace.</p>}
    </div>
  );
}
