import type { Team } from "@/lib/api";

type TeamMembershipView = Pick<Team, "id" | "memberLinks">;

export function splitTeamsByActiveMembership<T extends TeamMembershipView>(
  teams: readonly T[],
  userId?: string | null,
) {
  const myTeams: T[] = [];
  const otherTeams: T[] = [];
  for (const team of teams) {
    const isMember = !!userId && team.memberLinks?.some((link) =>
      link.companyMember?.status === "active" &&
      String(link.companyMember.userId || "") === String(userId)
    );
    (isMember ? myTeams : otherTeams).push(team);
  }
  return { myTeams, otherTeams };
}

export function activeTeamMemberCount(team: Pick<Team, "memberLinks">): number {
  return new Set(
    (team.memberLinks || [])
      .filter((link) => link.companyMember?.status === "active")
      .map((link) => link.companyMember?.userId || link.companyMemberId || link.companyMember?.id)
      .filter((id): id is string => !!id)
      .map(String),
  ).size;
}
