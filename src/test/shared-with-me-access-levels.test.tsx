import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import SharedWithMe from "@/pages/SharedWithMe";

const apiMock = vi.hoisted(() => ({
  getAuthenticatedSharedResource: vi.fn(),
  getSharedWithMe: vi.fn(),
  getSharedTaskComments: vi.fn(),
  addSharedTaskComment: vi.fn(),
  updateSharedTaskStatus: vi.fn(),
}));
vi.mock("@/lib/api", () => ({ api: apiMock }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/components/dashboard/DashboardLayout", () => ({ default: ({ children }: any) => <div>{children}</div> }));

const caps = {
  viewer: { canView: true, canComment: false, canUpdateTaskStatus: false },
  commenter: { canView: true, canComment: true, canUpdateTaskStatus: false },
  collaborator: { canView: true, canComment: true, canUpdateTaskStatus: true },
};

function projectPayload(level: keyof typeof caps) {
  return {
    data: {
      resourceType: "project", accessLevel: level, capabilities: caps[level],
      project: { name: "Client Project", status: "active", progress: 25, tasks: [{ id: "t1", title: "Draft report", status: "pending" }] },
    },
  };
}

function renderAt(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/shared-with-me" element={<SharedWithMe />} />
        <Route path="/shared-with-me/:resourceType/:resourceId" element={<SharedWithMe />} />
      </Routes>
    </MemoryRouter>
  );
}

async function openComments() {
  await screen.findByText("Draft report");
  fireEvent.click(screen.getByRole("button", { name: /comments/i }));
  await screen.findByText("No comments yet.");
}

describe("Shared with Me access-level UI", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.getSharedTaskComments.mockResolvedValue({ data: { comments: [] } });
  });

  it("viewer sees display only: no status control, no composer", async () => {
    apiMock.getAuthenticatedSharedResource.mockResolvedValue(projectPayload("viewer"));
    renderAt("/shared-with-me/project/p1");
    await openComments();
    expect(screen.queryByLabelText("Task status")).toBeNull();
    expect(screen.queryByPlaceholderText("Write a comment…")).toBeNull();
  });

  it("commenter gets the composer but no status control, and posting works", async () => {
    apiMock.getAuthenticatedSharedResource.mockResolvedValue(projectPayload("commenter"));
    apiMock.addSharedTaskComment.mockResolvedValue({ data: { comment: { id: "c1", content: "Looks good", author: "Me", isMine: true, createdAt: new Date().toISOString() } } });
    renderAt("/shared-with-me/project/p1");
    await openComments();
    expect(screen.queryByLabelText("Task status")).toBeNull();
    fireEvent.change(screen.getByPlaceholderText("Write a comment…"), { target: { value: "Looks good" } });
    fireEvent.click(screen.getByRole("button", { name: "Comment" }));
    await screen.findByText("Looks good");
    expect(apiMock.addSharedTaskComment).toHaveBeenCalledWith("project", "p1", "t1", { content: "Looks good" });
  });

  it("collaborator gets the status control and composer", async () => {
    apiMock.getAuthenticatedSharedResource.mockResolvedValue(projectPayload("collaborator"));
    renderAt("/shared-with-me/project/p1");
    await openComments();
    expect(screen.getByLabelText("Task status")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Write a comment…")).toBeInTheDocument();
  });

  it("shows an empty state when nothing is shared", async () => {
    apiMock.getSharedWithMe.mockResolvedValue({ data: { resources: [] } });
    renderAt("/shared-with-me");
    await waitFor(() => expect(screen.getByText(/Nothing has been shared with you yet/)).toBeInTheDocument());
  });
});

describe("Shared with Me sidebar", () => {
  const layout = readFileSync("src/components/dashboard/DashboardLayout.tsx", "utf8");
  it("is listed once per nav variant, under the access groups", () => {
    expect(layout.match(/href: "\/shared-with-me"/g)).toHaveLength(3);
  });
  it("is active on the list and detail routes", () => {
    expect(layout).toContain('location.pathname.startsWith("/shared-with-me/")');
  });
});
