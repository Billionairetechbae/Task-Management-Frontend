import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { WorkspaceCommercialOverview, WorkspaceSeatImpact } from "@/lib/api";
import { getSearchNavigation } from "@/components/dashboard/searchNavigation";

const mocks = vi.hoisted(() => ({ role: "owner", getCommercial: vi.fn(), getImpact: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ workspaceRole: mocks.role, activeCompanyId: "company-1" }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <div>{children}</div> }));
vi.mock("@/lib/api", () => ({ api: { getWorkspaceCommercial: mocks.getCommercial, getWorkspaceSeatImpact: mocks.getImpact } }));

import WorkspaceSubscription from "@/pages/WorkspaceSubscription";
import SeatImpactNotice from "@/components/commercial/SeatImpactNotice";

const overview = (o: Partial<WorkspaceCommercialOverview> = {}, usage: Partial<WorkspaceCommercialOverview["usage"]> = {}): WorkspaceCommercialOverview => ({
  plan: { code: "standard", name: "Standard" }, commercialStatus: "active", currency: "USD",
  usage: { activeSeats: 8, includedSeats: 3, additionalSeats: 5, unitPriceCents: 500, fixedMonthlyCents: 0, estimatedMonthlyCents: 2500, contractedMaxSeats: null, ...usage },
  customTerms: false, billingPeriod: { start: "2026-10-01", end: "2026-10-31" }, outstandingCents: 0, paymentStatus: "none",
  estimateNote: "This is an estimate based on current active internal members. It is not an invoice.", billingRecords: [], contactEmail: null, ...o,
});
const impact = (o: Partial<WorkspaceSeatImpact> = {}): WorkspaceSeatImpact => ({ currency: "USD", currentActiveSeats: 3, includedSeats: 3, currentEstimatedMonthlyCents: 0, activeSeatsAfterAcceptance: 4, additionalSeatsAfterAcceptance: 1, estimatedMonthlyCentsAfterAcceptance: 500, note: "", ...o });
const wrap = (node: React.ReactNode) => <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{node}</QueryClientProvider>;
afterEach(() => { cleanup(); vi.clearAllMocks(); mocks.role = "owner"; });

describe("Subscription & Seats page", () => {
  it.each(["member", "manager", "guest", "external_viewer"])("%s sees only an access message and triggers no commercial request", (role) => {
    mocks.role = role; render(wrap(<WorkspaceSubscription />));
    expect(screen.getByText(/owner or admin access is required/i)).toBeInTheDocument(); expect(mocks.getCommercial).not.toHaveBeenCalled();
    expect(screen.queryByText(/estimated monthly/i)).not.toBeInTheDocument();
  });
  it.each(["owner", "admin"])("%s sees Standard plan usage and the estimate with the pricing explanation", async (role) => {
    mocks.role = role; mocks.getCommercial.mockResolvedValue({ data: overview() }); render(wrap(<WorkspaceSubscription />));
    expect(await screen.findByText("Standard plan")).toBeInTheDocument();
    const usage = screen.getByLabelText("Seat usage");
    expect(usage).toHaveTextContent("Active seats8"); expect(usage).toHaveTextContent("Included seats3"); expect(usage).toHaveTextContent("Additional seats5"); expect(usage).toHaveTextContent("Estimated monthly charge$25");
    expect(screen.getByText("Your plan includes 3 seats. Each additional active internal member costs $5 per month.")).toBeInTheDocument();
    expect(screen.getAllByText(/not an invoice/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pending invitations, clients and external collaborators do not use a seat/i)).toBeInTheDocument();
  });
  it("Free plan within the allowance shows no charge", async () => {
    mocks.getCommercial.mockResolvedValue({ data: overview({ plan: { code: "free", name: "Free" }, commercialStatus: "free" }, { activeSeats: 2, additionalSeats: 0, unitPriceCents: 0, estimatedMonthlyCents: 0 }) });
    render(wrap(<WorkspaceSubscription />));
    expect(await screen.findByText("Free plan")).toBeInTheDocument(); expect(screen.getByLabelText("Seat usage")).toHaveTextContent("Estimated monthly charge$0");
    expect(screen.getByText("Your plan includes 3 internal seats at no charge.")).toBeInTheDocument();
  });
  it("Custom plan shows the agreed terms, fixed fee and contracted maximum warning", async () => {
    mocks.getCommercial.mockResolvedValue({ data: overview({ plan: { code: "custom", name: "Custom / Enterprise" }, commercialStatus: "custom", customTerms: true }, { activeSeats: 12, includedSeats: 10, additionalSeats: 2, unitPriceCents: 799, fixedMonthlyCents: 10000, estimatedMonthlyCents: 11598, contractedMaxSeats: 11 }) });
    render(wrap(<WorkspaceSubscription />));
    expect(await screen.findByText("Custom / Enterprise plan")).toBeInTheDocument();
    expect(screen.getByText(/Your agreed terms include 10 seats, then \$7\.99 per additional active internal member per month, plus a fixed \$100 per month/)).toBeInTheDocument();
    expect(screen.getByLabelText("Seat usage")).toHaveTextContent("$115.98"); expect(screen.getByText(/allows up to/i)).toHaveTextContent("above that number");
    expect(screen.getByText(/custom commercial terms agreed with Admiino/i)).toBeInTheDocument();
  });
  it("does not offer self-service payment or plan-change actions, and links to the Guide", async () => {
    mocks.getCommercial.mockResolvedValue({ data: overview({ contactEmail: "billing@example.test" }) }); render(wrap(<WorkspaceSubscription />));
    await screen.findByText("Standard plan");
    expect(screen.queryByRole("button", { name: /pay|upgrade|downgrade|change plan|subscribe|checkout/i })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Learn more in the Guide/i })).toHaveAttribute("href", "https://www.admiino.com/guide/plans-and-billing");
    expect(screen.getByRole("link", { name: "billing@example.test" })).toHaveAttribute("href", "mailto:billing@example.test");
    expect(screen.getByText(/handled by the Admiino team/i)).toBeInTheDocument();
  });
  it("lists issued billing records only and flags overdue ones", async () => {
    mocks.getCommercial.mockResolvedValue({ data: overview({ billingRecords: [{ id: "r1", periodStart: "2026-09-01", periodEnd: "2026-09-30", currency: "USD", totalCents: 2500, status: "issued", dueDate: "2026-09-15", outstandingCents: 2500, isOverdue: true, activeSeats: 8, additionalSeats: 5 }, { id: "r2", periodStart: "2026-08-01", periodEnd: "2026-08-31", currency: "USD", totalCents: 1500, status: "paid", dueDate: "2026-08-15", outstandingCents: 0, isOverdue: false, activeSeats: 6, additionalSeats: 3 }] }) });
    render(wrap(<WorkspaceSubscription />)); expect(await screen.findByText("2026-09")).toBeInTheDocument();
    expect(screen.getByText("Overdue")).toBeInTheDocument(); expect(screen.getByText("Paid")).toBeInTheDocument(); expect(screen.queryByText(/note|reference|recorded by/i)).not.toBeInTheDocument();
  });
  it("shows loading and error states", async () => {
    mocks.getCommercial.mockReturnValue(new Promise(() => {})); const first = render(wrap(<WorkspaceSubscription />));
    expect(screen.getByText(/Loading subscription details/i)).toBeInTheDocument(); first.unmount();
    mocks.getCommercial.mockRejectedValue(new Error("boom")); render(wrap(<WorkspaceSubscription />));
    expect(await screen.findByRole("alert")).toHaveTextContent(/could not be loaded/i);
  });
  it("is discoverable from search for owners/admins only", () => {
    for (const role of ["owner", "admin"]) expect(getSearchNavigation("subscription", role, () => true).Settings?.[0]?.href).toBe("/settings/workspace/subscription");
    for (const role of ["manager", "member", "guest"]) expect(getSearchNavigation("subscription", role, () => true).Settings).toBeUndefined();
  });
});

describe("Invitation seat-impact preview", () => {
  it("tells an owner what accepting would change and that sending is free", async () => {
    mocks.getImpact.mockResolvedValue({ data: impact() }); render(wrap(<SeatImpactNotice active />));
    const note = await screen.findByRole("note", { name: "Seat impact" });
    expect(note).toHaveTextContent("currently has 3 active seats"); expect(note).toHaveTextContent("increase active seats to 4"); expect(note).toHaveTextContent("estimated monthly charge to $5");
    expect(note).toHaveTextContent("not charged for sending an invitation");
  });
  it("says there is no change while still within the included seats", async () => {
    mocks.getImpact.mockResolvedValue({ data: impact({ currentActiveSeats: 1, activeSeatsAfterAcceptance: 2, additionalSeatsAfterAcceptance: 0, estimatedMonthlyCentsAfterAcceptance: 0 }) }); render(wrap(<SeatImpactNotice active />));
    const note = await screen.findByRole("note", { name: "Seat impact" }); expect(note).toHaveTextContent("currently has 1 active seat "); expect(note).toHaveTextContent("no change to the estimated monthly charge ($0)");
  });
  it("shows the real negotiated cost, not a hard-coded price", async () => {
    mocks.getImpact.mockResolvedValue({ data: impact({ currentActiveSeats: 10, activeSeatsAfterAcceptance: 11, currentEstimatedMonthlyCents: 5593, estimatedMonthlyCentsAfterAcceptance: 6392 }) }); render(wrap(<SeatImpactNotice active />));
    expect(await screen.findByRole("note")).toHaveTextContent("$63.92");
  });
  it.each(["member", "manager", "guest"])("%s never requests or sees seat pricing", (role) => {
    mocks.role = role; render(wrap(<SeatImpactNotice active />)); expect(mocks.getImpact).not.toHaveBeenCalled(); expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
  it("does not request anything while the dialog is closed, and stays silent if the lookup fails", async () => {
    render(wrap(<SeatImpactNotice active={false} />)); expect(mocks.getImpact).not.toHaveBeenCalled(); cleanup();
    mocks.getImpact.mockRejectedValue(new Error("nope")); render(wrap(<SeatImpactNotice active />));
    await waitFor(() => expect(mocks.getImpact).toHaveBeenCalled()); await waitFor(() => expect(screen.queryByText(/Checking seat usage/)).not.toBeInTheDocument()); expect(screen.queryByRole("note")).not.toBeInTheDocument();
  });
});
