import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({
  get: vi.fn(), preview: vi.fn(), create: vi.fn(), update: vi.fn(), pause: vi.fn(), resume: vi.fn(), stop: vi.fn(), useDetails: vi.fn(),
  toast: vi.fn(), handlers: {} as Record<string, () => void>,
}));

vi.mock("@/lib/api", () => ({
  api: {
    getTaskRecurrence: h.get, previewTaskRecurrence: h.preview, createTaskRecurrence: h.create, updateTaskRecurrence: h.update,
    pauseTaskRecurrence: h.pause, resumeTaskRecurrence: h.resume, stopTaskRecurrence: h.stop, useTaskDetailsForFutureOccurrences: h.useDetails,
  },
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: h.toast }) }));
vi.mock("@/contexts/WebSocketContext", () => ({
  useWebSocket: () => ({ on: (e: string, fn: () => void) => { h.handlers[e] = fn; }, off: (e: string) => { delete h.handlers[e]; } }),
}));

import TaskRecurrenceSection from "../components/tasks/TaskRecurrenceSection";
import { getBrowserTimeZone } from "../lib/recurrenceForm";

const rec = (over: any = {}) => ({
  id: "r1", status: "active", pausedReason: null, timezone: "Africa/Lagos", frequency: "weekly", interval: 1, byWeekday: [5], byMonthDay: null, localTime: "17:00",
  startsAt: "2026-10-16T16:00:00.000Z", endsAt: null, maxOccurrences: null, occurrencesGenerated: 3, nextOccurrenceAt: "2026-10-23T16:00:00.000Z", lastGeneratedAt: null,
  lastRunNote: null, summary: "Weekly on Fri at 17:00",
  upcoming: ["2026-10-23T16:00:00.000Z", "2026-10-30T16:00:00.000Z", "2026-11-06T16:00:00.000Z", "2026-11-13T16:00:00.000Z", "2026-11-20T16:00:00.000Z"], template: { title: "x" }, ...over,
});
const series = (over: any = {}, occurrence: any = { sequence: 1, occurrenceAt: "2026-10-16T16:00:00.000Z", status: "generated", isSource: true }, canManage = true) =>
  ({ status: "success", data: { recurrence: rec(over), occurrence, canManageRecurrence: canManage } });
const none = (canManage = true) => ({ status: "success", data: { recurrence: null, occurrence: null, canManageRecurrence: canManage } });

function renderSection(props: { taskDeadline?: string | null } = { taskDeadline: "2026-10-16T16:00:00.000Z" }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><TaskRecurrenceSection taskId="t1" {...props} /></QueryClientProvider>);
}

beforeEach(() => {
  for (const m of [h.get, h.preview, h.create, h.update, h.pause, h.resume, h.stop, h.useDetails, h.toast]) m.mockReset();
  for (const k of Object.keys(h.handlers)) delete h.handlers[k];
  h.preview.mockResolvedValue({ status: "success", data: { summary: "Weekly on Fri at 17:00", occurrences: ["2026-10-23T16:00:00.000Z", "2026-10-30T16:00:00.000Z"] } });
});

describe("TaskRecurrenceSection", () => {
  it("a non-recurring task offers 'Make recurring' to managers and renders nothing for everyone else", async () => {
    h.get.mockResolvedValue(none(true));
    const { unmount } = renderSection();
    expect(await screen.findByRole("button", { name: "Make recurring" })).toBeInTheDocument();
    expect(screen.getByText(/Not repeating/)).toBeInTheDocument();
    unmount();
    h.get.mockResolvedValue(none(false));
    const { container } = renderSection();
    await waitFor(() => expect(h.get).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(container.querySelector("section")).toBeNull());
  });

  it("Make recurring: sends the BROWSER timezone and structured fields, previews with the same payload, and renders the source as occurrence #1", async () => {
    h.get.mockResolvedValue(none(true));
    h.create.mockResolvedValue(series());
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: "Make recurring" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.selectOptions(within(dialog).getByLabelText("Repeat"), "weekdays");
    // the editor debounces form changes before asking the server's schedule engine for a preview
    await waitFor(() => expect(h.preview).toHaveBeenCalledWith("t1", expect.objectContaining({ timezone: getBrowserTimeZone(), frequency: "weekly", interval: 1, byWeekday: [1, 2, 3, 4, 5] })));
    expect(await within(dialog).findByTestId("preview-summary")).toHaveTextContent("Weekly on Fri at 17:00");
    expect(within(dialog).getByTestId("preview-list").children).toHaveLength(2);
    expect(within(dialog).getByText(new RegExp(`Timezone: ${getBrowserTimeZone().replace("/", "\\/")}`))).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Make recurring" }));
    await waitFor(() => expect(h.create).toHaveBeenCalledWith("t1", expect.objectContaining({ timezone: getBrowserTimeZone(), frequency: "weekly", byWeekday: [1, 2, 3, 4, 5] })));
    expect(await screen.findByTestId("recurrence-occurrence")).toHaveTextContent("original task: occurrence #1");
    expect(screen.getByTestId("recurrence-summary")).toHaveTextContent("Weekly on Fri at 17:00");
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Task is now recurring" }));
  });

  it("a task with no due date must be given an explicit start before it can be saved", async () => {
    h.get.mockResolvedValue(none(true));
    h.create.mockResolvedValue(series());
    renderSection({ taskDeadline: null });
    await userEvent.click(await screen.findByRole("button", { name: "Make recurring" }));
    const dialog = await screen.findByRole("dialog");
    const submit = within(dialog).getByRole("button", { name: "Make recurring" });
    expect(submit).toBeDisabled();
    expect(within(dialog).getByText(/no due date yet/)).toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("Series start"), "2026-11-02T09:30");
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
    await waitFor(() => expect(h.create).toHaveBeenCalledWith("t1", expect.objectContaining({ startsAt: new Date("2026-11-02T09:30").toISOString() })));
  });

  it("selected weekdays and 'ends after N' are sent; the total includes the first task", async () => {
    h.get.mockResolvedValue(none(true));
    h.create.mockResolvedValue(series());
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: "Make recurring" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Mon" }));
    await userEvent.click(within(dialog).getByRole("radio", { name: "After" }));
    const total = within(dialog).getByLabelText("Total occurrences");
    await userEvent.clear(total); await userEvent.type(total, "5");
    expect(within(dialog).getByText(/Counts this task as #1/)).toBeInTheDocument();
    await userEvent.click(within(dialog).getByRole("button", { name: "Make recurring" }));
    await waitFor(() => expect(h.create).toHaveBeenCalledTimes(1));
    const sent = h.create.mock.calls[0][1];
    expect(sent.maxOccurrences).toBe(5);
    expect(sent.byWeekday).toContain(1);
  });

  it("a rejected save shows the server message and keeps the editor open", async () => {
    h.get.mockResolvedValue(none(true));
    h.create.mockRejectedValue(new Error("The series creator no longer has permission to create tasks."));
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: "Make recurring" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Make recurring" }));
    await waitFor(() => expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Couldn't save recurrence", variant: "destructive", description: expect.stringContaining("permission") })));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows summary, status, repeat/every/on/starts/time/ends/next occurrence and the next five", async () => {
    h.get.mockResolvedValue(series({ maxOccurrences: 8 }, { sequence: 7, occurrenceAt: "2026-11-27T16:00:00.000Z", status: "generated", isSource: false }));
    renderSection();
    expect(await screen.findByTestId("recurrence-summary")).toHaveTextContent("Weekly on Fri at 17:00");
    expect(screen.getByTestId("recurrence-status")).toHaveTextContent("Active");
    expect(screen.getByTestId("recurrence-occurrence")).toHaveTextContent("Occurrence #7 of this series");
    for (const label of ["Repeat", "Every", "On", "Starts", "Time", "Ends", "Next occurrence"]) expect(screen.getByText(label, { selector: "dt" })).toBeInTheDocument();
    expect(screen.getByText("Fri")).toBeInTheDocument();
    expect(screen.getByText("17:00 (Africa/Lagos)")).toBeInTheDocument();
    expect(screen.getByText(/After 8 occurrences \(including the first\)/)).toBeInTheDocument();
    expect(screen.getByTestId("recurrence-upcoming").children).toHaveLength(5);
    expect(screen.getByTestId("recurrence-next")).not.toHaveTextContent("—");
  });

  it("Edit is prefilled, previews against the stored timezone, and PATCHes without recreating anything", async () => {
    h.get.mockResolvedValue(series());
    h.update.mockResolvedValue(series({ interval: 2, summary: "Every 2 weeks on Fri at 17:00" }));
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: /Edit/ }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText("Repeat")).toHaveValue("weekly");
    expect(within(dialog).getByLabelText("Time")).toHaveValue("17:00");
    expect(within(dialog).queryByLabelText("Series start")).toBeNull();
    const every = within(dialog).getByLabelText("Every"); await userEvent.clear(every); await userEvent.type(every, "2");
    await waitFor(() => expect(h.preview).toHaveBeenLastCalledWith("t1", expect.objectContaining({ interval: 2, timezone: "Africa/Lagos" })));
    await userEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(h.update).toHaveBeenCalledWith("t1", expect.objectContaining({ interval: 2, localTime: "17:00" })));
    expect(h.update.mock.calls[0][1]).not.toHaveProperty("timezone");
    expect(h.create).not.toHaveBeenCalled();
    expect(await screen.findByTestId("recurrence-summary")).toHaveTextContent("Every 2 weeks on Fri at 17:00");
  });

  it("Pause -> Resume; paused shows the reason; Resume only exists while paused", async () => {
    h.get.mockResolvedValue(series());
    h.pause.mockResolvedValue(series({ status: "paused", pausedReason: "MANUAL" }));
    h.resume.mockResolvedValue(series());
    renderSection();
    expect(screen.queryByRole("button", { name: /Resume/ })).toBeNull();
    await userEvent.click(await screen.findByRole("button", { name: /Pause/ }));
    await waitFor(() => expect(h.pause).toHaveBeenCalledWith("t1"));
    expect(await screen.findByTestId("recurrence-status")).toHaveTextContent("Paused");
    expect(screen.getByTestId("recurrence-paused-notice")).toHaveTextContent("Paused by a manager");
    expect(screen.queryByRole("button", { name: /^Pause/ })).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: /Resume/ }));
    await waitFor(() => expect(h.resume).toHaveBeenCalledWith("t1", { takeOwnership: false }));
    expect(await screen.findByTestId("recurrence-status")).toHaveTextContent("Active");
  });

  it("an automatic pause explains why and offers an EXPLICIT 'take over' choice on resume (never silent)", async () => {
    h.get.mockResolvedValue(series({ status: "paused", pausedReason: "CREATOR_NOT_IN_WORKSPACE", lastRunNote: "The series creator is no longer an active member of this workspace." }));
    h.resume.mockResolvedValue(series());
    renderSection();
    expect(await screen.findByTestId("recurrence-paused-notice")).toHaveTextContent("no longer in the workspace");
    await userEvent.click(screen.getByRole("checkbox", { name: /Take over this series/ }));
    await userEvent.click(screen.getByRole("button", { name: /Resume/ }));
    await waitFor(() => expect(h.resume).toHaveBeenCalledWith("t1", { takeOwnership: true }));
  });

  it("Stop needs confirmation and is terminal: no Pause/Resume/Edit afterwards", async () => {
    h.get.mockResolvedValue(series());
    h.stop.mockResolvedValue(series({ status: "stopped", nextOccurrenceAt: null, upcoming: [] }));
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: /Stop recurrence/ }));
    expect(h.stop).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Keep" }));
    expect(h.stop).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: /Stop recurrence/ }));
    await userEvent.click(screen.getByRole("button", { name: "Confirm stop" }));
    await waitFor(() => expect(h.stop).toHaveBeenCalledWith("t1"));
    expect(await screen.findByTestId("recurrence-status")).toHaveTextContent("Stopped");
    for (const name of [/Resume/, /^Pause/, /Edit/, /Stop recurrence/, /Use this task/]) expect(screen.queryByRole("button", { name })).toBeNull();
    expect(screen.getByText(/no more will be created/)).toBeInTheDocument();
  });

  it("'Use this task's details for future occurrences' calls the dedicated endpoint (no bulk rewrite)", async () => {
    h.get.mockResolvedValue(series({}, { sequence: 3, occurrenceAt: "2026-10-30T16:00:00.000Z", status: "generated", isSource: false }));
    h.useDetails.mockResolvedValue(series());
    renderSection();
    await userEvent.click(await screen.findByRole("button", { name: /Use this task's details for future occurrences/ }));
    await waitFor(() => expect(h.useDetails).toHaveBeenCalledWith("t1"));
    expect(h.update).not.toHaveBeenCalled();
    expect(h.toast).toHaveBeenCalledWith(expect.objectContaining({ title: "Future occurrences will use this task's details" }));
  });

  it("without permission the series is visible but there are no controls", async () => {
    h.get.mockResolvedValue(series({}, undefined, false));
    renderSection();
    expect(await screen.findByTestId("recurrence-summary")).toBeInTheDocument();
    for (const name of [/Edit/, /Pause/, /Resume/, /Stop/, /Use this task/, /Make recurring/]) expect(screen.queryByRole("button", { name })).toBeNull();
  });

  it("a completed series shows as finished with no controls", async () => {
    h.get.mockResolvedValue(series({ status: "completed", nextOccurrenceAt: null, upcoming: [] }));
    renderSection();
    expect(await screen.findByTestId("recurrence-status")).toHaveTextContent("Completed");
    expect(screen.getByText(/has finished/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
  });

  it("refreshes in realtime when a task_updated event arrives", async () => {
    h.get.mockResolvedValueOnce(series());
    h.get.mockResolvedValue(series({ status: "paused", pausedReason: "PROJECT_UNAVAILABLE" }));
    renderSection();
    expect(await screen.findByTestId("recurrence-status")).toHaveTextContent("Active");
    h.handlers.task_updated();
    expect(await screen.findByTestId("recurrence-paused-notice")).toHaveTextContent("project is no longer available");
    expect(h.get).toHaveBeenCalledTimes(2);
  });
});

describe("shared pieces", () => {
  it("RepeatBadge only renders for recurring tasks and carries the summary", async () => {
    const { default: RepeatBadge } = await import("../components/tasks/RepeatBadge");
    const { rerender } = render(<RepeatBadge task={{ isRecurring: true, recurrenceSummary: "Weekly on Fri at 17:00", recurrenceSequence: 4 }} />);
    expect(screen.getByTestId("repeat-badge")).toHaveTextContent("#4");
    expect(screen.getByTestId("repeat-badge")).toHaveAttribute("title", "Repeats: Weekly on Fri at 17:00");
    rerender(<RepeatBadge task={{ isRecurring: false }} />);
    expect(screen.queryByTestId("repeat-badge")).toBeNull();
    rerender(<RepeatBadge task={undefined} />);
    expect(screen.queryByTestId("repeat-badge")).toBeNull();
  });

  it("activity labels: recurrence_* actions and 'Created automatically from recurring series' (no hidden task information)", async () => {
    const { getTaskActivityPresentation } = await import("../lib/taskActivityMapper");
    expect(getTaskActivityPresentation("recurrence_created")).toMatchObject({ label: "Recurrence created" });
    expect(getTaskActivityPresentation("recurrence_updated", { change: "template" }).detail).toBe("Future occurrences will use this task's details");
    expect(getTaskActivityPresentation("recurrence_paused", { automatic: true }).detail).toBe("Paused automatically");
    expect(getTaskActivityPresentation("recurrence_resumed").label).toBe("Recurrence resumed");
    expect(getTaskActivityPresentation("recurrence_stopped").label).toBe("Recurrence stopped");
    expect(getTaskActivityPresentation("custom_fields_updated", { changedFields: [{ name: "Private note" }] })).toMatchObject({ label: "Custom fields updated" });
    expect(getTaskActivityPresentation("task_created", { source: "recurrence", recurrenceId: "r1", sequence: 4 }).detail).toBe("Created automatically from recurring series");
    expect(getTaskActivityPresentation("task_created", {}).detail).toBeUndefined();
  });

  it("Task Details mounts the standalone section and does not grow recurrence logic inline", async () => {
    const fs = await import("node:fs"); const path = await import("node:path");
    const read = (p: string) => fs.readFileSync(path.join(process.cwd(), p), "utf8");
    const details = read("src/pages/TaskDetails.tsx");
    expect(details).toContain("<TaskRecurrenceSection taskId={task.id}");
    expect(details).not.toMatch(/createTaskRecurrence|updateTaskRecurrence|pauseTaskRecurrence|previewTaskRecurrence/);
    expect(read("src/components/CreateTaskDialog.tsx")).not.toMatch(/recurrence/i); // no recurrence configuration in the create dialog in v1
  });
});
