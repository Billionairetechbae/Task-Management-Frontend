import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SubtaskList from "@/components/tasks/SubtaskList";

const apiMock = vi.hoisted(() => ({
  getTeam: vi.fn(),
  createTaskSubtask: vi.fn(),
  getTaskSubtasks: vi.fn(),
  updateTaskSubtask: vi.fn(),
  deleteTaskSubtask: vi.fn(),
}));

vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("SubtaskList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getTeam.mockResolvedValue({ data: { team: { memberLinks: [] } } });
    apiMock.createTaskSubtask.mockResolvedValue({
      data: {
        task: {
          id: "persisted-subtask",
          taskId: "parent-task",
          parentTaskId: "parent-task",
          title: "Analyse the data",
          status: "pending",
          priority: "medium",
        },
      },
    });
  });

  it("creates a title-only subtask and links to the persisted task returned as data.task", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SubtaskList
          taskId="parent-task"
          parentTeamId="team-1"
          initialSubtasks={[]}
          canCreate
        />
      </MemoryRouter>,
    );

    await user.click(screen.getByRole("button", { name: "Add subtask" }));
    await user.type(screen.getByLabelText("Title *"), "Analyse the data");
    await user.click(screen.getByRole("button", { name: "Create sub-task" }));

    await waitFor(() => {
      expect(apiMock.createTaskSubtask).toHaveBeenCalledWith(
        "parent-task",
        expect.objectContaining({ title: "Analyse the data" }),
      );
    });
    const createdLink = await screen.findByRole("link", { name: /Analyse the data/i });
    expect(createdLink).toHaveAttribute(
      "href",
      "/teams/team-1/tasks/parent-task/subtasks/persisted-subtask",
    );
    expect(screen.getByText("0/1 completed")).toBeInTheDocument();
  });
});
