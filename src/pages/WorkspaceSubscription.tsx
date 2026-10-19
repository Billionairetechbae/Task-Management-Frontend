import { CreditCard, ExternalLink, ShieldAlert } from "lucide-react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useWorkspaceCommercial } from "@/hooks/useWorkspaceCommercial";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { COMMERCIAL_STATUS_COPY, formatUsd, GUIDE_BILLING_URL } from "@/lib/commercialFormat";

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <div className="rounded-lg bg-muted/40 px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-0.5 text-xl font-semibold tabular-nums">{value}</p>{hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}</div>;
}

export default function WorkspaceSubscription() {
  const { overview, isLoading, isError, error, permitted } = useWorkspaceCommercial();
  // 404/501/503 mean the commercial service is not available for this deployment or workspace: explain, don't show a generic failure.
  const unavailable = isError && [404, 501, 503].includes(Number((error as { statusCode?: number } | null)?.statusCode));

  if (!permitted) {
    return <DashboardLayout><main className="mx-auto max-w-3xl p-6"><Card><CardContent className="flex items-start gap-3 p-6"><ShieldAlert className="mt-0.5 h-5 w-5 text-muted-foreground" /><div><h1 className="font-semibold">Subscription &amp; Seats</h1><p className="mt-1 text-sm text-muted-foreground">Workspace owner or admin access is required to view subscription details.</p></div></CardContent></Card></main></DashboardLayout>;
  }

  const u = overview?.usage;
  const isStandard = overview?.plan.code === "standard";
  const showTerms = overview && (overview.customTerms || !isStandard);

  return <DashboardLayout><main className="mx-auto flex w-full max-w-4xl flex-col gap-5 px-4 py-6 md:px-7">
    <header className="flex items-start gap-3"><CreditCard className="mt-1 h-5 w-5 text-primary" /><div><h1 className="text-2xl font-semibold tracking-tight">Subscription &amp; Seats</h1><p className="mt-1 text-sm text-muted-foreground">See how many seats your workspace uses and what they are estimated to cost.</p></div></header>

    {isLoading && <Card><CardContent className="p-6 text-sm text-muted-foreground">Loading subscription details…</CardContent></Card>}
    {unavailable && <Card><CardContent role="status" className="p-6 text-sm text-muted-foreground">Subscription details are not available for this workspace right now. If you expected to see them, contact Admiino support.</CardContent></Card>}
    {isError && !unavailable && <Card><CardContent role="alert" className="p-6 text-sm text-destructive">Subscription details could not be loaded. Refresh the page or try again shortly.</CardContent></Card>}

    {overview && u && <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2"><CardTitle className="text-lg">{overview.plan.name} plan</CardTitle><span className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground">{COMMERCIAL_STATUS_COPY[overview.commercialStatus] ?? overview.commercialStatus}</span></div>
          <CardDescription>
            {isStandard && !overview.customTerms
              ? `Your plan includes ${u.includedSeats} seats. Each additional active internal member costs ${formatUsd(u.unitPriceCents)} per month.`
              : overview.plan.code === "free"
                ? `Your plan includes ${u.includedSeats} internal seats at no charge.`
                : `Your agreed terms include ${u.includedSeats} seats${u.unitPriceCents ? `, then ${formatUsd(u.unitPriceCents)} per additional active internal member per month` : ""}${u.fixedMonthlyCents ? `, plus a fixed ${formatUsd(u.fixedMonthlyCents)} per month` : ""}.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <section aria-label="Seat usage" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat label="Active seats" value={u.activeSeats} />
            <Stat label="Included seats" value={u.includedSeats} />
            <Stat label="Additional seats" value={u.additionalSeats} />
            <Stat label="Estimated monthly charge" value={formatUsd(u.estimatedMonthlyCents)} hint="Estimate, not an invoice" />
          </section>
          {u.contractedMaxSeats != null && <p className="text-sm text-muted-foreground">Your agreement allows up to <strong className="text-foreground">{u.contractedMaxSeats}</strong> seats.{u.activeSeats > u.contractedMaxSeats && " You are currently above that number — please contact Admiino so we can update your agreement."}</p>}
          <p className="text-sm text-muted-foreground">Billing period: {overview.billingPeriod.start} to {overview.billingPeriod.end}. {overview.estimateNote}</p>
          <p className="text-sm text-muted-foreground">A seat is an active internal member of this workspace. Pending invitations, clients and external collaborators do not use a seat.</p>
        </CardContent>
      </Card>

      {showTerms && overview.customTerms && <Card><CardContent className="p-4 text-sm text-muted-foreground">Your workspace has custom commercial terms agreed with Admiino. The figures above reflect those terms.</CardContent></Card>}

      {overview.billingRecords.length > 0 && <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">Billing records</CardTitle><CardDescription>Records issued by Admiino for your workspace.</CardDescription></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm"><thead className="text-xs text-muted-foreground"><tr><th scope="col" className="py-2 pr-4 font-medium">Period</th><th scope="col" className="py-2 pr-4 font-medium">Amount</th><th scope="col" className="py-2 pr-4 font-medium">Due</th><th scope="col" className="py-2 font-medium">Status</th></tr></thead>
            <tbody>{overview.billingRecords.map((r) => <tr key={r.id} className="border-t"><td className="py-2 pr-4">{r.periodStart.slice(0, 7)}</td><td className="py-2 pr-4 tabular-nums">{formatUsd(r.totalCents)}</td><td className="py-2 pr-4">{r.dueDate || "—"}</td><td className="py-2">{r.isOverdue ? "Overdue" : r.status === "paid" ? "Paid" : r.status === "partially_paid" ? `Partly paid · ${formatUsd(r.outstandingCents)} due` : `Due · ${formatUsd(r.outstandingCents)}`}</td></tr>)}</tbody></table>
        </CardContent>
      </Card>}

      <Card><CardContent className="flex flex-col gap-2 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground">Plan changes and payments are handled by the Admiino team. {overview.contactEmail ? <>Contact <a className="text-primary underline" href={`mailto:${overview.contactEmail}`}>{overview.contactEmail}</a> to change your plan or arrange payment.</> : "Contact Admiino support to change your plan or arrange payment."}</p>
        <a href={GUIDE_BILLING_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary underline">Learn more in the Guide<ExternalLink className="h-3.5 w-3.5" aria-hidden /></a>
      </CardContent></Card>
    </>}
  </main></DashboardLayout>;
}
