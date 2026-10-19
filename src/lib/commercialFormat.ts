// Presentation helpers for the workspace Subscription & Seats views. Amounts are integer cents; nothing here calculates a price.
export const formatUsd = (cents: number | null | undefined): string => {
  const value = Number.isFinite(cents as number) ? Math.trunc(cents as number) : 0;
  const abs = Math.abs(value);
  const whole = Math.floor(abs / 100).toLocaleString("en-US");
  const fraction = abs % 100;
  return `${value < 0 ? "-" : ""}$${whole}${fraction ? `.${String(fraction).padStart(2, "0")}` : ""}`;
};

export const seatLabel = (count: number) => `${count} ${count === 1 ? "seat" : "seats"}`;

export const COMMERCIAL_STATUS_COPY: Record<string, string> = {
  free: "Free", trial: "Trial", active: "Active", payment_pending: "Payment pending", overdue: "Payment overdue", grace_period: "Grace period", suspended: "Subscription paused", cancelled: "Cancelled", custom: "Custom arrangement",
};

export const GUIDE_BILLING_URL = "https://www.admiino.com/guide/plans-and-billing";
