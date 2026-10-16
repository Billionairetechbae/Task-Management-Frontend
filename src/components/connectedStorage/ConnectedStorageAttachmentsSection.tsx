import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api, type ConnectedStorageAttachment, type ConnectedStorageItem } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { ConnectedStorageAttachmentList } from "./ConnectedStorageAttachmentList";
import { ConnectedStoragePickerButton } from "./ConnectedStoragePickerButton";

// "Dropbox files" block for a Project or a Task. Internal members only: for clients / external / guest roles it renders nothing and
// makes no request (the backend also returns no Connected Storage data to them). It sits next to, and never replaces, the existing
// uploaded-file and Google Drive attachment UI.
const INTERNAL_ROLES = ["owner", "admin", "manager", "member"];

export const connectedStorageQueryKey = (targetType: "project" | "task", targetId: string) => ["connected-storage-attachments", targetType, targetId] as const;

const ATTACH_ERRORS: Record<string, string> = {
  files_only: "Only files can be attached, not folders.",
  not_selectable: "That file can't be attached.",
  not_found: "That file could not be found in Dropbox.",
  reauth_required: "Dropbox needs to be reconnected by a workspace owner or admin.",
  forbidden: "You don't have permission to attach files here.",
  rate_limited: "Dropbox is limiting requests right now. Please try again shortly.",
  provider_unavailable: "Dropbox is temporarily unavailable. Please try again shortly.",
};

export interface ConnectedStorageAttachmentsSectionProps {
  targetType: "project" | "task";
  targetId: string;
  /** UI hint only: shows "Attach from Dropbox" when the user can modify the target. The server re-authorizes every attach. */
  canAttach: boolean;
  /** Attachments already delivered with the Project / Task detail payload (avoids an extra request). */
  initialAttachments?: ConnectedStorageAttachment[];
  title?: string;
}

export function ConnectedStorageAttachmentsSection({ targetType, targetId, canAttach, initialAttachments, title = "Dropbox files" }: ConnectedStorageAttachmentsSectionProps) {
  const { workspaceRole } = useAuth();
  const queryClient = useQueryClient();
  const internal = INTERNAL_ROLES.includes(String(workspaceRole));
  const key = connectedStorageQueryKey(targetType, targetId);

  const query = useQuery({
    queryKey: key,
    queryFn: async () => {
      const res = targetType === "project" ? await api.listProjectConnectedStorageAttachments(targetId) : await api.listTaskConnectedStorageAttachments(targetId);
      return res.data.attachments;
    },
    enabled: internal && !!targetId,
    initialData: initialAttachments,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: key }), [queryClient, key]);

  const attach = async (item: ConnectedStorageItem, connectionId: string) => {
    try {
      // Only identifiers are sent. The server re-reads name / type / size / revision from Dropbox before saving anything.
      const res = await api.attachConnectedStorageItem({ connectionId, providerItemId: item.providerItemId, target: { type: targetType, id: targetId } });
      toast.success(res.data.created ? `Attached ${res.data.attachment.name}` : `${res.data.attachment.name} is already attached`);
      await refresh();
    } catch (err: any) {
      toast.error("Could not attach the file", { description: ATTACH_ERRORS[err?.body?.code as string] || "Something went wrong. Please try again." });
    }
  };

  if (!internal) return null;
  const attachments = query.data ?? [];
  if (!attachments.length && !canAttach) return null;

  return (
    <section className="space-y-2" aria-label={title} data-testid="connected-storage-section">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}{attachments.length ? ` (${attachments.length})` : ""}</h4>
        {canAttach && <ConnectedStoragePickerButton targetType={targetType} targetId={targetId} onSelect={attach} label="Attach from Dropbox" />}
      </div>
      <ConnectedStorageAttachmentList attachments={attachments} onChanged={refresh} />
    </section>
  );
}

export default ConnectedStorageAttachmentsSection;
