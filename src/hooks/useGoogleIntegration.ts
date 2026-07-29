import { useCallback, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  googleIntegrationService,
  type GoogleIntegrationStatus,
} from "@/services/googleIntegrationService";

export const GOOGLE_INTEGRATION_QUERY_KEY = ["google-integration", "status"];

export const useGoogleIntegration = () => {
  const queryClient = useQueryClient();

  const statusQuery = useQuery<GoogleIntegrationStatus>({
    queryKey: GOOGLE_INTEGRATION_QUERY_KEY,
    queryFn: () => googleIntegrationService.getStatus(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
    retry: (failureCount, err: any) => {
      if (err?.status === 401 || err?.status === 403) return false;
      return failureCount < 2;
    },
  });

  const connectMutation = useMutation({
    mutationFn: () => googleIntegrationService.redirectToConnect(),
    onError: (err: any) => {
      toast.error("Could not start Google sign-in", {
        description: err?.message || "Please try again later.",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: () => googleIntegrationService.disconnect(),
    onSuccess: () => {
      toast.success("Google Drive disconnected");
      queryClient.invalidateQueries({ queryKey: GOOGLE_INTEGRATION_QUERY_KEY });
    },
    onError: (err: any) => {
      toast.error("Failed to disconnect Google Drive", {
        description: err?.message || "Please try again later.",
      });
    },
  });

  const refresh = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: GOOGLE_INTEGRATION_QUERY_KEY });
  }, [queryClient]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleResult = params.get("google");
    if (googleResult === "connected") {
      toast.success("Google Drive connected successfully");
      refresh();
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      window.history.replaceState({}, "", url.toString());
    } else if (googleResult === "error" || params.get("google_error")) {
      toast.error("Google Drive connection failed", {
        description: params.get("google_error") || "Authentication was not completed.",
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("google");
      url.searchParams.delete("google_error");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const status: GoogleIntegrationStatus = (statusQuery.data as GoogleIntegrationStatus) ?? { connected: false, scopes: [] };

  return {
    status,
    isConnected: Boolean(status.connected),
    statusLoading: statusQuery.isLoading || statusQuery.isFetching,
    statusError: statusQuery.error as any,
    connect: () => connectMutation.mutate(),
    connectLoading: connectMutation.isPending,
    disconnect: () => disconnectMutation.mutate(),
    disconnectLoading: disconnectMutation.isPending,
    refresh,
  };
};

export default useGoogleIntegration;
