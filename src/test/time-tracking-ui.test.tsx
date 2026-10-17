import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  api: {
    getActiveTimeTimer: vi.fn(), startTimeTimer: vi.fn(), stopTimeTimer: vi.fn(), cancelTimeTimer: vi.fn(),
    getTimeEntries: vi.fn(), getTimeTrackingSummary: vi.fn(), createManualTimeEntry: vi.fn(), updateTimeEntry: vi.fn(), deleteTimeEntry: vi.fn(),
  },
  toast: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api: mocks.api }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ activeCompanyId: "company-1", workspaceRole: "member" }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

import TaskTimePanel from "@/components/time/TaskTimePanel";
import ManualTimeEntryDialog from "@/components/time/ManualTimeEntryDialog";
import GlobalTimerIndicator from "@/components/time/GlobalTimerIndicator";

function wrapper(children: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter>{children}</MemoryRouter></QueryClientProvider>);
}

describe("Time Tracking task UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.api.getActiveTimeTimer.mockResolvedValue({ data: { timer: null } });
    mocks.api.getTimeEntries.mockResolvedValue({ data: { entries: [] } });
    mocks.api.getTimeTrackingSummary.mockResolvedValue({ data: { totalSeconds: 0, billableSeconds: 0 } });
    mocks.api.startTimeTimer.mockResolvedValue({ data: { entry: { id: "entry-1" } } });
    mocks.api.createManualTimeEntry.mockResolvedValue({ data: { entry: { id: "manual-1" } } });
    mocks.api.updateTimeEntry.mockResolvedValue({ data: { entry: { id: "manual-1" } } });
  });

  it("starts a Task timer through the backend", async () => {
    wrapper(<TaskTimePanel taskId="task-1" taskTitle="Prepare report" />);
    await userEvent.click(await screen.findByRole("button", { name: "Start" }));
    await waitFor(() => expect(mocks.api.startTimeTimer).toHaveBeenCalledWith({ taskId: "task-1" }));
  });

  it("restores a running timer from the active-timer endpoint after mounting", async () => {
    mocks.api.getActiveTimeTimer.mockResolvedValue({ data: { timer: { id: "entry-2", taskId: "task-1", taskTitleSnapshot: "Prepare report", startedAt: new Date(Date.now() - 65000).toISOString(), endedAt: null, durationSeconds: 0 } } });
    wrapper(<TaskTimePanel taskId="task-1" taskTitle="Prepare report" />);
    expect(await screen.findByText("Timer running")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Stop" })).toBeInTheDocument();
  });

  it("shows the persistent shell timer with its Task destination and stop control", async () => {
    mocks.api.getActiveTimeTimer.mockResolvedValue({ data: { timer: { id: "entry-3", taskId: "task-1", taskTitleSnapshot: "Prepare report", startedAt: new Date(Date.now() - 65000).toISOString(), endedAt: null, durationSeconds: 0 } } });
    wrapper(<GlobalTimerIndicator />);
    expect(await screen.findByRole("link", { name: "Prepare report" })).toHaveAttribute("href", "/task-details/task-1");
    await userEvent.click(screen.getByRole("button", { name: "Stop running timer" }));
    await waitFor(() => expect(mocks.api.stopTimeTimer).toHaveBeenCalledWith("entry-3"));
  });

  it("submits a manual duration, selected date, note and billable flag", async () => {
    wrapper(<ManualTimeEntryDialog taskId="task-1" taskTitle="Prepare report" open onOpenChange={vi.fn()} />);
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Hours" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Hours" }), "1");
    await userEvent.clear(screen.getByRole("spinbutton", { name: "Minutes" }));
    await userEvent.type(screen.getByRole("spinbutton", { name: "Minutes" }), "15");
    await userEvent.type(screen.getByPlaceholderText("What did you work on?"), "Reviewing the deliverable");
    await userEvent.click(screen.getByRole("checkbox", { name: /billable time/i }));
    await userEvent.click(screen.getByRole("button", { name: "Save time" }));
    await waitFor(() => expect(mocks.api.createManualTimeEntry).toHaveBeenCalledWith(expect.objectContaining({ taskId: "task-1", durationSeconds: 4500, note: "Reviewing the deliverable", billable: true })));
  });

  it("edits a completed entry without changing the stored time date or duration for timer entries", async () => {
    const entry = { id: "timer-1", taskId: "task-1", entryDate: "2026-10-17", durationSeconds: 3600, note: "Original note", billable: false, source: "timer", endedAt: "2026-10-17T11:00:00.000Z" } as any;
    wrapper(<ManualTimeEntryDialog taskId="task-1" taskTitle="Prepare report" entry={entry} open onOpenChange={vi.fn()} />);
    expect(screen.queryByRole("spinbutton", { name: "Hours" })).not.toBeInTheDocument();
    await userEvent.clear(screen.getByPlaceholderText("What did you work on?"));
    await userEvent.type(screen.getByPlaceholderText("What did you work on?"), "Updated note");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(mocks.api.updateTimeEntry).toHaveBeenCalledWith("timer-1", { note: "Updated note", billable: false }));
  });
});
