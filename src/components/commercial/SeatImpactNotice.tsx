import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { api } from "@/lib/api";
import { formatUsd } from "@/lib/commercialFormat";

/**
 * Shown inside the invite dialog for owners/admins. It describes what accepting the invitation WOULD do to the seat count;
 * a pending invitation is never an active seat and nothing is charged for sending it. It never blocks the invitation.
 */
export default function SeatImpactNotice({ active }: { active: boolean }) {
  const { activeCompanyId, workspaceRole } = useAuth();
  const permitted = ["owner", "admin"].includes(String(workspaceRole));
  const { data, isLoading } = useQuery({
    queryKey: ["workspace-seat-impact", activeCompanyId],
    queryFn: () => api.getWorkspaceSeatImpact(1),
    enabled: Boolean(active && activeCompanyId && permitted),
    staleTime: 0,
    retry: false,
  });
  if (!permitted || !active) return null;
  if (isLoading) return <p className="text-xs text-muted-foreground" aria-live="polite">Checking seat usage…</p>;
  const impact = data?.data;
  if (!impact) return null; // Fail quiet: seat information must never get in the way of inviting someone.
  const adds = impact.estimatedMonthlyCentsAfterAcceptance !== impact.currentEstimatedMonthlyCents;
  return (
    <div role="note" aria-label="Seat impact" className="rounded-lg border bg-muted/40 p-3 text-xs leading-relaxed text-muted-foreground">
      <p>
        Your workspace currently has <strong className="text-foreground">{impact.currentActiveSeats}</strong> active {impact.currentActiveSeats === 1 ? "seat" : "seats"} ({impact.includedSeats} included).
        {" "}Accepting this invitation would increase active seats to <strong className="text-foreground">{impact.activeSeatsAfterAcceptance}</strong>
        {adds
          ? <> and the estimated monthly charge to <strong className="text-foreground">{formatUsd(impact.estimatedMonthlyCentsAfterAcceptance)}</strong>.</>
          : <> with no change to the estimated monthly charge ({formatUsd(impact.estimatedMonthlyCentsAfterAcceptance)}).</>}
      </p>
      <p className="mt-1">You are not charged for sending an invitation. A seat is counted only once the invitation is accepted.</p>
    </div>
  );
}
