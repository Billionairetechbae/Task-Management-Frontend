import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type ConnectedStorageItem, type ConnectedStorageTarget } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ConnectedStoragePickerDialog } from "./ConnectedStoragePickerDialog";

// Target-aware entry point for the picker. Renders nothing for clients / guests / external users (who never receive Connected Storage
// metadata) and while the workspace has no active Dropbox connection. Mount it only where the UI already lets the user modify the target;
// the server re-authorizes every request regardless. It selects only: nothing is attached or persisted in Phase 3B.
const INTERNAL_ROLES = ["owner", "admin", "manager", "member"];

export interface ConnectedStoragePickerButtonProps extends ConnectedStorageTarget {
  onSelect: (item: ConnectedStorageItem, connectionId: string) => void;
  label?: string;
  /** Icon-only button (e.g. inside the comment composer). The label stays as the accessible name. */
  iconOnly?: boolean;
  disabled?: boolean;
}

export function ConnectedStoragePickerButton({ onSelect, label = "Add from Dropbox", iconOnly = false, disabled = false, ...target }: ConnectedStoragePickerButtonProps) {
  const { workspaceRole } = useAuth();
  const isInternal = INTERNAL_ROLES.includes(String(workspaceRole));
  const [connectionId, setConnectionId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!isInternal) { setConnectionId(null); return; }
    let cancelled = false;
    api.listConnectedStorageConnections()
      .then((res) => {
        const dropbox = res.data.connections.find((c) => c.provider === "dropbox" && c.status === "active");
        if (!cancelled) setConnectionId(dropbox?.id ?? null);
      })
      .catch(() => { if (!cancelled) setConnectionId(null); });
    return () => { cancelled = true; };
  }, [isInternal]);

  if (!isInternal || !connectionId) return null;
  return (
    <>
      {iconOnly
        ? <Button type="button" variant="outline" size="icon" className="h-8 w-8" onClick={() => setOpen(true)} disabled={disabled} aria-label={label} title={label}><Cloud className="w-3.5 h-3.5" /></Button>
        : <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)} disabled={disabled}><Cloud className="w-4 h-4 mr-2" />{label}</Button>}
      <ConnectedStoragePickerDialog
        open={open}
        onOpenChange={setOpen}
        connectionId={connectionId}
        {...target}
        onSelect={(item) => onSelect(item, connectionId)}
      />
    </>
  );
}

export default ConnectedStoragePickerButton;
