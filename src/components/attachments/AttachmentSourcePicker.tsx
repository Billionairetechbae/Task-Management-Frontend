import { cloneElement, isValidElement, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cloud, HardDrive, Paperclip, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

interface Props {
  onUpload: () => void;
  onGoogleDrive?: () => void;
  showGoogleDrive?: boolean;
  dropboxControl?: React.ReactNode;
  disabled?: boolean;
  compact?: boolean;
}

const INTERNAL_ROLES = new Set(["owner", "admin", "manager", "member"]);

/** One source menu shared by task file and comment attachment entry points. */
export default function AttachmentSourcePicker({ onUpload, onGoogleDrive, showGoogleDrive = true, dropboxControl, disabled = false, compact = false }: Props) {
  const { workspaceRole } = useAuth();
  const internal = INTERNAL_ROLES.has(String(workspaceRole));
  const canConnectDropbox = workspaceRole === "owner" || workspaceRole === "admin";
  const [dropboxAvailable, setDropboxAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const dropboxEntry = isValidElement(dropboxControl) ? cloneElement(dropboxControl as React.ReactElement<any>, {
    onSelect: (...args: any[]) => {
      setOpen(false);
      (dropboxControl.props as any).onSelect?.(...args);
    },
  }) : dropboxControl;

  useEffect(() => {
    if (!internal) { setDropboxAvailable(false); return; }
    let current = true;
    api.listConnectedStorageConnections().then((response) => {
      if (current) setDropboxAvailable(response.data.connections.some((connection) => connection.provider === "dropbox" && connection.status === "active"));
    }).catch(() => { if (current) setDropboxAvailable(false); });
    return () => { current = false; };
  }, [internal]);

  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size={compact ? "icon" : "sm"} disabled={disabled} aria-label="Add attachment" title="Add attachment" className={compact ? "h-8 w-8" : "gap-2"}>
        <Paperclip className="h-4 w-4" />{!compact && <span>Attach</span>}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="end" className="w-72 p-2">
      <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">Choose a source</p>
      <Button type="button" variant="ghost" className="h-10 w-full justify-start gap-3" onClick={() => { setOpen(false); onUpload(); }}><Upload className="h-4 w-4" />Upload from computer</Button>
      {showGoogleDrive && <Button type="button" variant="ghost" className="h-10 w-full justify-start gap-3" onClick={() => { setOpen(false); onGoogleDrive?.(); }}><HardDrive className="h-4 w-4 text-blue-600" />Google Drive</Button>}
      {internal && dropboxAvailable && dropboxEntry}
      {internal && dropboxControl && !dropboxAvailable && (canConnectDropbox
        ? <Button asChild type="button" variant="ghost" className="h-10 w-full justify-start gap-3"><Link to="/settings/integrations"><Cloud className="h-4 w-4" />Connect Dropbox</Link></Button>
        : <p className="px-2 py-2 text-xs text-muted-foreground">A workspace owner or admin must connect Dropbox.</p>)}
    </PopoverContent>
  </Popover>;
}
