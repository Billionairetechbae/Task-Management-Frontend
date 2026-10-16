import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, ChevronRight, File as FileIcon, Folder, Loader2, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { api, type ConnectedStorageItem, type ConnectedStorageTarget } from "@/lib/api";

// Provider-neutral picker over a workspace Connected Storage connection (Dropbox is the only implemented provider today).
// It only BROWSES and RETURNS the chosen item's normalized metadata to the caller. It never persists anything and calls no attach API
// (attachment confirmation is Phase 3C). Navigation state is built from authoritative list responses (provider item ids); display paths
// are shown but never used to navigate or authorize.

export const SEARCH_DEBOUNCE_MS = 400;
export const MIN_SEARCH_LENGTH = 2;

export interface ConnectedStoragePickerDialogProps extends ConnectedStorageTarget {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  connectionId: string;
  providerLabel?: string;
  onSelect: (item: ConnectedStorageItem) => void;
}

type ErrorKind = "reconnect" | "rate_limited" | "unavailable" | "forbidden" | "expired" | "generic";
interface PickerError { kind: ErrorKind; message: string; retryAfterSeconds?: number }
interface Crumb { id: string | null; name: string }

function classifyError(err: any): PickerError {
  const status: number | undefined = err?.statusCode ?? err?.status;
  const code: string | undefined = err?.body?.code;
  if (code === "reauth_required" || code === "disconnected") return { kind: "reconnect", message: "Dropbox access needs to be reconnected. Ask a workspace owner or admin to reconnect Dropbox in Settings → Integrations." };
  if (status === 429 || code === "rate_limited") {
    const seconds = Number(err?.body?.retryAfterSeconds) || undefined;
    return { kind: "rate_limited", retryAfterSeconds: seconds, message: `Dropbox is limiting requests right now. Please try again${seconds ? ` in about ${seconds} seconds` : " shortly"}.` };
  }
  if (status === 503 || code === "provider_unavailable") return { kind: "unavailable", message: "Dropbox is temporarily unavailable. Please try again in a moment." };
  if (status === 403) return { kind: "forbidden", message: "You don't have permission to attach files here." };
  if (code === "invalid_cursor") return { kind: "expired", message: "This listing expired. Reload to continue." };
  return { kind: "generic", message: "Something went wrong while loading Dropbox. Please try again." };
}

const formatSize = (bytes: number | null) => {
  if (bytes == null) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
};

export function ConnectedStoragePickerDialog({ open, onOpenChange, connectionId, targetType, targetId, taskId, providerLabel = "Dropbox", onSelect }: ConnectedStoragePickerDialogProps) {
  const rootCrumb: Crumb = useMemo(() => ({ id: null, name: providerLabel }), [providerLabel]);
  const [crumbs, setCrumbs] = useState<Crumb[]>([rootCrumb]);
  const [items, setItems] = useState<ConnectedStorageItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<PickerError | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<ConnectedStorageItem | null>(null);
  const requestId = useRef(0);

  const target: ConnectedStorageTarget = useMemo(() => ({ targetType, targetId, taskId }), [targetType, targetId, taskId]);
  const current = crumbs[crumbs.length - 1];
  const searching = query.length >= MIN_SEARCH_LENGTH;

  // Debounced search: the provider is not called per keystroke.
  useEffect(() => {
    const trimmed = queryInput.trim();
    const timer = setTimeout(() => setQuery(trimmed), trimmed ? SEARCH_DEBOUNCE_MS : 0);
    return () => clearTimeout(timer);
  }, [queryInput]);

  const load = useCallback(async () => {
    const mine = ++requestId.current;
    setLoading(true); setError(null); setItems([]); setCursor(null); setHasMore(false);
    try {
      if (searching) {
        const res = await api.searchConnectedStorage(connectionId, target, query);
        if (mine !== requestId.current) return;
        setItems(res.data.items); setCursor(res.data.cursor); setHasMore(res.data.hasMore);
      } else {
        const res = await api.listConnectedStorageItems(connectionId, target, { parentId: current.id });
        if (mine !== requestId.current) return;
        setItems([...res.data.folders, ...res.data.files]); setCursor(res.data.cursor); setHasMore(res.data.hasMore);
      }
    } catch (err) {
      if (mine === requestId.current) setError(classifyError(err));
    } finally {
      if (mine === requestId.current) setLoading(false);
    }
  }, [connectionId, target, searching, query, current.id]);

  useEffect(() => { if (open) void load(); }, [open, load]);

  // Fresh state for the next opening (reset on close so reopening never flashes a stale folder or fires a second request).
  useEffect(() => {
    if (!open) { requestId.current += 1; setCrumbs([rootCrumb]); setQueryInput(""); setQuery(""); setSelected(null); setItems([]); setCursor(null); setHasMore(false); setError(null); }
  }, [open, rootCrumb]);

  const loadMore = async () => {
    if (!cursor) return;
    const mine = requestId.current;
    setLoadingMore(true); setError(null);
    try {
      if (searching) {
        const res = await api.searchConnectedStorage(connectionId, target, query, cursor);
        if (mine !== requestId.current) return;
        setItems((prev) => [...prev, ...res.data.items]); setCursor(res.data.cursor); setHasMore(res.data.hasMore);
      } else {
        const res = await api.listConnectedStorageItems(connectionId, target, { parentId: current.id, cursor });
        if (mine !== requestId.current) return;
        setItems((prev) => [...prev, ...res.data.folders, ...res.data.files]); setCursor(res.data.cursor); setHasMore(res.data.hasMore);
      }
    } catch (err) {
      setError(classifyError(err));
    } finally {
      setLoadingMore(false);
    }
  };

  const openFolder = (folder: ConnectedStorageItem) => {
    setSelected(null);
    if (searching) { setQueryInput(""); setQuery(""); setCrumbs([rootCrumb, { id: folder.providerItemId, name: folder.name }]); return; } // search hits carry no trusted ancestry
    setCrumbs((prev) => [...prev, { id: folder.providerItemId, name: folder.name }]);
  };
  const goToCrumb = (index: number) => { setSelected(null); setCrumbs((prev) => prev.slice(0, index + 1)); };
  const goBack = () => { setSelected(null); setCrumbs((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev)); };
  const clearSearch = () => { setQueryInput(""); setQuery(""); setSelected(null); };

  const folders = items.filter((item) => item.itemType === "folder");
  const files = items.filter((item) => item.itemType === "file");
  const ordered = [...folders, ...files];
  const showShortHint = queryInput.trim().length > 0 && queryInput.trim().length < MIN_SEARCH_LENGTH;

  const confirm = () => { if (selected?.selectable) { onSelect(selected); onOpenChange(false); } };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl" data-testid="connected-storage-picker">
        <DialogHeader>
          <DialogTitle>Choose a file from {providerLabel}</DialogTitle>
          <DialogDescription>Select one file. Folders are for navigation only.</DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={queryInput} onChange={(e) => setQueryInput(e.target.value)} placeholder={`Search ${providerLabel}…`} className="pl-9 pr-9" aria-label={`Search ${providerLabel}`} maxLength={100} />
          {queryInput && (
            <button type="button" onClick={clearSearch} aria-label="Clear search" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>
          )}
        </div>
        {showShortHint && <p className="text-xs text-muted-foreground">Type at least {MIN_SEARCH_LENGTH} characters to search.</p>}

        {searching ? (
          <div className="flex items-center justify-between text-sm" data-testid="search-banner">
            <span>Search results for “{query}”</span>
            <Button variant="ghost" size="sm" onClick={clearSearch}>Back to folders</Button>
          </div>
        ) : (
          <nav aria-label="Folder path" className="flex items-center gap-1 text-sm flex-wrap">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goBack} disabled={crumbs.length <= 1} aria-label="Back"><ArrowLeft className="w-4 h-4" /></Button>
            {crumbs.map((crumb, index) => (
              <span key={`${crumb.id ?? "root"}-${index}`} className="flex items-center gap-1">
                {index > 0 && <ChevronRight className="w-3 h-3 text-muted-foreground" />}
                {index === crumbs.length - 1
                  ? <span className="font-medium" aria-current="page">{crumb.name}</span>
                  : <button type="button" className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline" onClick={() => goToCrumb(index)}>{crumb.name}</button>}
              </span>
            ))}
          </nav>
        )}

        <div className="border rounded-lg min-h-[240px] max-h-[360px] overflow-y-auto" role="list" aria-label="Items" aria-busy={loading}>
          {loading ? (
            <div className="flex items-center justify-center h-[240px] text-muted-foreground" role="status"><Loader2 className="w-5 h-5 animate-spin mr-2" />Loading…</div>
          ) : error && ordered.length === 0 ? (
            <div className="p-6 text-center space-y-3" role="alert" data-testid={`picker-error-${error.kind}`}>
              <AlertTriangle className="w-6 h-6 mx-auto text-destructive" />
              <p className="text-sm">{error.message}</p>
              {error.kind !== "reconnect" && error.kind !== "forbidden" && (
                <Button variant="outline" size="sm" onClick={() => void load()}>{error.kind === "expired" ? "Reload" : "Try again"}</Button>
              )}
            </div>
          ) : ordered.length === 0 ? (
            <div className="flex items-center justify-center h-[240px] text-sm text-muted-foreground">{searching ? `No results for “${query}”.` : "This folder is empty."}</div>
          ) : (
            <>
              {ordered.map((item) => {
                const isFolder = item.itemType === "folder";
                const isSelected = selected?.providerItemId === item.providerItemId;
                return (
                  <button
                    key={item.providerItemId}
                    type="button"
                    role="listitem"
                    onClick={() => (isFolder ? openFolder(item) : item.selectable ? setSelected(item) : undefined)}
                    disabled={!isFolder && !item.selectable}
                    aria-label={isFolder ? `Open folder ${item.name}` : `${item.selectable ? "Select file" : "Unavailable file"} ${item.name}`}
                    aria-pressed={isFolder ? undefined : isSelected}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm border-b last:border-b-0 hover:bg-muted/60 disabled:opacity-50 disabled:cursor-not-allowed ${isSelected ? "bg-primary/10" : ""}`}
                  >
                    {isFolder ? <Folder className="w-4 h-4 shrink-0 text-amber-500" /> : <FileIcon className="w-4 h-4 shrink-0 text-muted-foreground" />}
                    <span className="flex-1 min-w-0">
                      <span className="block truncate">{item.name}</span>
                      {searching && item.displayPath && <span className="block truncate text-xs text-muted-foreground">{item.displayPath}</span>}
                    </span>
                    {!isFolder && <span className="text-xs text-muted-foreground shrink-0">{formatSize(item.size)}</span>}
                    {isFolder && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                  </button>
                );
              })}
              {error && (
                <div className="p-3 text-center space-y-2 text-sm" role="alert" data-testid={`picker-error-${error.kind}`}>
                  <p>{error.message}</p>
                  {error.kind === "expired"
                    ? <Button variant="outline" size="sm" onClick={() => void load()}>Reload</Button>
                    : error.kind !== "reconnect" && error.kind !== "forbidden" && <Button variant="outline" size="sm" onClick={() => void loadMore()}>Try again</Button>}
                </div>
              )}
              {hasMore && !error && (
                <div className="p-2 text-center">
                  <Button variant="ghost" size="sm" onClick={() => void loadMore()} disabled={loadingMore}>
                    {loadingMore && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        {selected && (
          <div className="rounded-lg border p-3 text-sm bg-muted/40" data-testid="selected-summary">
            <div className="font-medium truncate">{selected.name}</div>
            <div className="text-xs text-muted-foreground flex gap-3 flex-wrap">
              {selected.size != null && <span>{formatSize(selected.size)}</span>}
              {selected.modifiedAt && <span>Modified {new Date(selected.modifiedAt).toLocaleDateString()}</span>}
              {selected.displayPath && <span className="truncate">{selected.displayPath}</span>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={confirm} disabled={!selected?.selectable}>Select</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConnectedStoragePickerDialog;
