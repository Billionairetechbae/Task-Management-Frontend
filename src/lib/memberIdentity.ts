import type { CompanyMember } from "@/lib/api";

/** Display helpers shared by every assignee entry point. Identity is always the stable user id, never the label. */
export const memberName = (member: Pick<CompanyMember, "user">): string =>
  [member.user?.firstName, member.user?.lastName].filter(Boolean).join(" ").trim() || member.user?.email || "Unnamed user";

/** "Richard Kehinde (richard@example.com)"; the signed-in user is "Me — Kehinde Victor (…)". */
export const memberLabel = (member: Pick<CompanyMember, "user" | "userId">, meId?: string | null): string => {
  const email = member.user?.email;
  return `${member.userId === meId ? "Me — " : ""}${memberName(member)}${email ? ` (${email})` : ""}`;
};

export const memberInitials = (member: Pick<CompanyMember, "user">): string => {
  const { firstName, lastName, email } = member.user || ({} as CompanyMember["user"]);
  return ((firstName?.[0] || "") + (lastName?.[0] || "") || email?.[0] || "?").toUpperCase();
};

/** Active, verified, not deactivated, one entry per user id. Removed, unverified or deactivated accounts are never offered. */
export function assignableMembers(list: CompanyMember[] | undefined | null, meId?: string | null): CompanyMember[] {
  const seen = new Set<string>();
  return (list || [])
    .filter((m) => m?.userId && m.user?.id && m.status !== "removed" && m.isVerified === true && (m.user as { isActive?: boolean }).isActive !== false)
    .filter((m) => (seen.has(m.userId) ? false : (seen.add(m.userId), true)))
    .sort((a, b) => (a.userId === meId ? -1 : b.userId === meId ? 1 : memberName(a).localeCompare(memberName(b))));
}

export const memberMatches = (member: CompanyMember, query: string): boolean => {
  const q = query.trim().toLowerCase();
  return !q || `${memberName(member)} ${member.user?.email || ""}`.toLowerCase().includes(q);
};
