import type { CompanyMember } from "@/lib/api";

/**
 * The ONE definition of "a person who counts as a workspace member" on the client. It mirrors the backend seat policy
 * (Phase 1C): an ACTIVE membership with an internal role (owner/admin/manager/member) and an account that is not deactivated.
 * Invited/pending/rejected/removed rows and guests are not members. The Company Directory lists and counts with this predicate,
 * and the Dashboard shows the backend summary built from the same rule, so the two always reconcile.
 */
export const INTERNAL_ROLES = ["owner", "admin", "manager", "member"] as const;

export function isCountedMember(member: Pick<CompanyMember, "status" | "role" | "user"> | null | undefined): boolean {
  if (!member) return false;
  return member.status === "active"
    && (INTERNAL_ROLES as readonly string[]).includes(String(member.role))
    && (member.user as { isActive?: boolean } | undefined)?.isActive !== false
    && (member.user as { invitationStatus?: string } | undefined)?.invitationStatus !== "removed";
}

export interface RoleCounts { workspaceMembers: number; owners: number; admins: number; managers: number; members: number }

/** One person is counted once even if the list contains duplicate rows for them. */
export function countByRole(list: CompanyMember[] | undefined | null): RoleCounts {
  const seen = new Set<string>();
  const counts: RoleCounts = { workspaceMembers: 0, owners: 0, admins: 0, managers: 0, members: 0 };
  for (const member of list || []) {
    if (!isCountedMember(member) || seen.has(member.userId)) continue;
    seen.add(member.userId);
    counts.workspaceMembers += 1;
    if (member.role === "owner") counts.owners += 1;
    else if (member.role === "admin") counts.admins += 1;
    else if (member.role === "manager") counts.managers += 1;
    else counts.members += 1;
  }
  return counts;
}
