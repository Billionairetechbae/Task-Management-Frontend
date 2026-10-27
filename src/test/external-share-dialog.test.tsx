import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  api: { listExternalShares: vi.fn(), createExternalShare: vi.fn(), updateExternalShare: vi.fn(), resendExternalShare: vi.fn(), revokeExternalShare: vi.fn() },
  toast: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

import ExternalShareDialog from "@/components/external/ExternalShareDialog";

const share = { id: "g1", email: "reviewer@agency.com", permission: "viewer", status: "active", resourceType: "project", resourceId: "p1", visibleTaskIds: [], expiresAt: null, activatedAt: null, lastAccessedAt: null, createdAt: "2026-10-27T00:00:00Z" };

beforeEach(() => {
  Object.values(mocks.api).forEach((f) => f.mockReset());
  mocks.toast.mockReset();
  mocks.api.listExternalShares.mockResolvedValue({ data: { shares: [share] } });
});

const open = () => render(<ExternalShareDialog open onOpenChange={() => {}} resourceType="project" resourceId="p1" resourceName="Website Redesign" projectTasks={[{ id: "t1", title: "Mock-ups" }, { id: "t2", title: "Budget" }]} />);

describe("ExternalShareDialog", () => {
  it("lists people with access and sends an invitation with only the explicitly ticked tasks", async () => {
    mocks.api.createExternalShare.mockResolvedValue({ data: { grant: share, emailSent: true } });
    open();
    expect(await screen.findByText("reviewer@agency.com")).toBeInTheDocument();
    expect(screen.getByText(/no admiino account needed/i)).toBeInTheDocument();
    const warning = screen.getByRole("note");
    expect(warning).toHaveTextContent(/description exactly as written/i);
    expect(warning).toHaveTextContent(/read each other's client comments/i);
    expect(warning).toHaveTextContent(/attachments stay private/i);

    await userEvent.type(screen.getByLabelText("Client email address"), "client@company.com");
    await userEvent.click(screen.getByRole("checkbox", { name: /mock-ups/i }));
    await userEvent.click(screen.getByRole("button", { name: /send invitation/i }));

    await waitFor(() => expect(mocks.api.createExternalShare).toHaveBeenCalledWith({ resourceType: "project", resourceId: "p1", email: "client@company.com", permission: "commenter", visibleTaskIds: ["t1"] }));
    expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Invitation sent" }));
  });

  it("warns when the email could not be delivered and supports resend and revoke", async () => {
    mocks.api.createExternalShare.mockResolvedValue({ data: { grant: share, emailSent: false } });
    mocks.api.resendExternalShare.mockResolvedValue({ data: { emailSent: true } });
    mocks.api.revokeExternalShare.mockResolvedValue({ data: { share } });
    open();
    await userEvent.type(await screen.findByLabelText("Client email address"), "client@company.com");
    await userEvent.click(screen.getByRole("button", { name: /send invitation/i }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.objectContaining({ variant: "destructive", title: expect.stringMatching(/not delivered/i) })));

    const row = (await screen.findByText("reviewer@agency.com")).closest("li") as HTMLElement;
    await userEvent.click(within(row).getByRole("button", { name: /resend/i }));
    await waitFor(() => expect(mocks.api.resendExternalShare).toHaveBeenCalledWith("g1"));
    await userEvent.click(within(row).getByRole("button", { name: /revoke/i }));
    await waitFor(() => expect(mocks.api.revokeExternalShare).toHaveBeenCalledWith("g1"));
  });
});
