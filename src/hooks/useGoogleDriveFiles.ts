import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { googleIntegrationService } from "@/services/googleIntegrationService";
import type { GoogleDriveFile } from "@/types/googleDrive";

const QUERY_ROOT = ["google-drive-files"];

export const PAGE_SIZE = 50;

export interface UseGoogleDriveFilesOptions {
  enabled?: boolean;
  pageSize?: number;
}

export const useGoogleDriveFiles = (
  options: UseGoogleDriveFilesOptions = {}
) => {
  const { enabled = true, pageSize = PAGE_SIZE } = options;
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [folderId, setFolderId] = useState<string | undefined>(undefined);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [accumulatedFiles, setAccumulatedFiles] = useState<GoogleDriveFile[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => window.clearTimeout(t);
  }, [query]);

  // Reset pagination cursor + accumulator when query or folder change.
  // Do NOT reset when taskId or dialog open state change → files persist across tasks.
  useEffect(() => {
    setNextPageToken(undefined);
    setAccumulatedFiles([]);
  }, [debouncedQuery, folderId]);

  const pageQuery = useQuery({
    queryKey: [...QUERY_ROOT, { folderId, debouncedQuery, pageToken: nextPageToken ?? "__first__", pageSize }],
    queryFn: async () => {
      return googleIntegrationService.listFiles({
        query: debouncedQuery || undefined,
        folderId,
        pageToken: nextPageToken || undefined,
        pageSize,
      });
    },
    // Only auto-run the "first page" query. Next pages are triggered via setNextPageToken.
    enabled: !nextPageToken ? enabled : false,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: (f, err: any) => {
      if (err?.status === 401 || err?.status === 403) return false;
      return f < 1;
    },
    // Preserve previous rendered data across refetches / cached 304 responses.
    placeholderData: (previousData: any) => previousData,
  });

  useEffect(() => {
    if (!pageQuery.data) return;
    const newFiles = pageQuery.data.files ?? [];
    if (!Array.isArray(newFiles) || newFiles.length === 0) {
      // Empty payload from backend (e.g. 304 not modified) → do NOT overwrite with []
      return;
    }
    if (nextPageToken) {
      // Append to avoid duplicates by fileId
      setAccumulatedFiles((prev) => {
        const seen = new Set(prev.map((p) => p.fileId));
        const extra = newFiles.filter((f) => f.fileId && !seen.has(f.fileId));
        return extra.length ? [...prev, ...extra] : prev;
      });
    } else {
      setAccumulatedFiles(newFiles);
    }
  }, [pageQuery.data, nextPageToken]);

  const files = useMemo<GoogleDriveFile[]>(() => accumulatedFiles, [accumulatedFiles]);

  const hasMore = useMemo<boolean>(() => {
    if (pageQuery.data?.hasMore !== undefined) return Boolean(pageQuery.data.hasMore);
    return Boolean(pageQuery.data?.nextPageToken);
  }, [pageQuery.data]);

  const loadingMore = pageQuery.isFetching && Boolean(nextPageToken);
  const loading = pageQuery.isLoading || (pageQuery.isFetching && !nextPageToken);
  const error = pageQuery.error as any;

  const loadMore = useCallback(() => {
    if (loadingMore || loading || !hasMore) return;
    const token = pageQuery.data?.nextPageToken;
    if (!token) return;
    setNextPageToken(token);
  }, [loadingMore, loading, hasMore, pageQuery.data?.nextPageToken]);

  const refresh = useCallback(() => {
    setNextPageToken(undefined);
    setAccumulatedFiles([]);
    void queryClient.invalidateQueries({ queryKey: QUERY_ROOT });
  }, [queryClient]);

  const reset = useCallback(() => {
    // Note: this does NOT touch the global query cache so other consumers
    // (e.g. other tasks) keep their cached Drive files.
    setQuery("");
    setDebouncedQuery("");
    setFolderId(undefined);
    setNextPageToken(undefined);
    setAccumulatedFiles([]);
  }, []);

  const uploadMutation = useMutation({
    mutationFn: (payload: { file: File | Blob; fileName?: string }) =>
      googleIntegrationService.uploadAdmiinoFile(payload.file, payload.fileName),
    onSuccess: async (data) => {
      // Invalidate all Drive file queries so pickers show the new file immediately.
      try {
        await queryClient.invalidateQueries({ queryKey: QUERY_ROOT });
        await queryClient.refetchQueries({ queryKey: QUERY_ROOT, type: "active" });
      } catch {
        /* ignore */
      }

      if (data?.webViewLink) {
        toast.success("Saved to Google Drive", {
          description: `"${data.name}" uploaded successfully`,
          action: {
            label: "Open in Drive",
            onClick: () => window.open(data.webViewLink as string, "_blank", "noopener,noreferrer"),
          },
        });
      } else {
        toast.success("Saved to Google Drive");
      }
    },
    onError: (err: any) => {
      toast.error("Failed to save to Google Drive", {
        description: err?.message || "Please try again later.",
      });
    },
  });

  return {
    files,
    loading,
    loadingMore,
    error,
    hasMore,
    query,
    setQuery,
    debouncedQuery,
    folderId,
    setFolderId,
    loadMore,
    refresh,
    reset,
    uploadToGoogleDrive: uploadMutation.mutate,
    uploadLoading: uploadMutation.isPending,
    uploadData: uploadMutation.data,
    uploadReset: uploadMutation.reset,
  };
};

export default useGoogleDriveFiles;
