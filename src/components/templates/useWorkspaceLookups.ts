import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type Member = { id: string; name: string };

/** Active workspace members and teams for the template pickers (the backend re-validates everything at use time). */
export function useWorkspaceLookups(enabled: boolean) {
  const members = useQuery({
    queryKey: ["template-members"], enabled, staleTime: 60_000,
    queryFn: async (): Promise<Member[]> => {
      const res: any = await api.getCompanyTeam();
      const list: any[] = res?.data?.members ?? res?.data?.team_members ?? [];
      return list.filter((m) => m.status !== "removed" && m.user?.id).map((m) => ({ id: m.user.id, name: `${m.user.firstName ?? ""} ${m.user.lastName ?? ""}`.trim() || m.user.email || m.user.id }));
    },
  });
  const teams = useQuery({
    queryKey: ["template-teams"], enabled, staleTime: 60_000,
    queryFn: async () => ((await api.listTeams())?.data?.teams ?? []).map((t: any) => ({ id: t.id as string, name: t.name as string })),
  });
  return { members: members.data ?? [], teams: teams.data ?? [] };
}
