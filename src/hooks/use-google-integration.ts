import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export const useGoogleIntegrationStatus = () => {
  return useQuery({
    queryKey: ["integration", "google", "status"],
    queryFn: async () => {
      const res = await api.getGoogleIntegrationStatus();
      const connected = Boolean((res as any)?.data?.connected ?? (res as any)?.connected ?? false);
      return { connected };
    },
    staleTime: Infinity,
    cacheTime: Infinity,
    refetchOnWindowFocus: false,
    retry: false,
  });
};

export default useGoogleIntegrationStatus;
