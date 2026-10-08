import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useParams } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TeamWorkspacePanel from "@/components/teams/TeamWorkspacePanel";
import TaskDetailsRedirect from "@/components/TaskDetailsRedirect";
import { teamTaskPath } from "@/lib/taskExecutionRoutes";

/**
 * Regression coverage for the production bug where opening a Task from the
 * Team interface (Team Workspace -> Active Assignments) landed on the 404
 * "Oops! Page not found" screen.
 *
 * Root cause: the link pointed at `/tasks/:id`, which is NOT a route in
 * App.tsx. The canonical task-detail route is `/task-details/:id`, so the
 * bad href fell through to the catch-all `path="*"` -> NotFound.
 *
 * These are runtime behavioural tests (real component + real router),
 * not source-string assertions.
 */

const apiMock = vi.hoisted(() => ({
  getTeamWorkspace: vi.fn(),
  postTeamMessage: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

const TASK_ID = "5a056d4e-3e7b-4707-a9eb-fed7d98f640e";

const team = {
  id: "team-1",
  companyId: "workspace-1",
  name: "Marketing",
  description: null,
  leadMemberId: null,
  createdBy: "user-1",
  createdAt: "",
  updatedAt: "",
  memberLinks: [],
} as any;

// Mirrors the real route contract in App.tsx: canonical detail route + catch-all 404.
const TaskDetailsStub = () => {
  const { id } = useParams<{ id: string }>();
  return <div>TaskDetails route:{id}</div>;
};
const NotFoundStub = () => <div>NotFound route</div>;

const renderRouter = (initialPath: string) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/teams" element={<TeamWorkspacePanel team={team} />} />
        <Route path="/task-details/:id" element={<TaskDetailsStub />} />
        <Route path="/teams/:teamId/tasks/:taskId" element={<div>TeamTask route</div>} />
        <Route path="*" element={<NotFoundStub />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  apiMock.getTeamWorkspace.mockResolvedValue({
    data: {
      team,
      messages: [],
      activeAssignments: [
        { id: TASK_ID, title: "Ship the campaign", status: "in_progress", deadline: null, execution: { progressPercent: 40 } },
      ],
      workload: [],
      activity: [],
    },
  });
  apiMock.postTeamMessage.mockResolvedValue({ data: { message: {} } });
});

describe("Team -> Task navigation route contract", () => {
  it("reproduces the bug: the old /tasks/:id path is not a route and renders NotFound", () => {
    renderRouter(`/tasks/${TASK_ID}`);
    expect(screen.getByText("NotFound route")).toBeInTheDocument();
    expect(screen.queryByText(/TaskDetails route:/)).not.toBeInTheDocument();
  });

  it("links an Active Assignment to the dedicated Team Task route", async () => {
    const user = userEvent.setup();
    renderRouter("/teams");

    // Open the Assignments ("Tasks") tab to reveal the assignment links.
    await user.click(await screen.findByRole("tab", { name: /Tasks/i }));

    const link = await screen.findByRole("link", { name: /Ship the campaign/i });
    expect(link).toHaveAttribute("href", teamTaskPath(team.id, TASK_ID));
  });

  it("navigating from the Team workspace opens Team Task View, not the generic workbench", async () => {
    const user = userEvent.setup();
    renderRouter("/teams");

    await user.click(await screen.findByRole("tab", { name: /Tasks/i }));
    const link = await screen.findByRole("link", { name: /Ship the campaign/i });
    await user.click(link);

    expect(await screen.findByText("TeamTask route")).toBeInTheDocument();
    expect(screen.queryByText("NotFound route")).not.toBeInTheDocument();
  });
});

describe("Legacy /tasks/:id backward-compatible redirect", () => {
  it("redirects a direct/pasted/refreshed /tasks/:id URL to the canonical task-details route", () => {
    render(
      <MemoryRouter initialEntries={[`/tasks/${TASK_ID}`]}>
        <Routes>
          <Route path="/tasks/:id" element={<TaskDetailsRedirect />} />
          <Route path="/task-details/:id" element={<TaskDetailsStub />} />
          <Route path="*" element={<NotFoundStub />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByText(`TaskDetails route:${TASK_ID}`)).toBeInTheDocument();
    expect(screen.queryByText("NotFound route")).not.toBeInTheDocument();
  });
});
