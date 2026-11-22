import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  listProjectFiles: vi.fn(),
  createProjectFolder: vi.fn(),
  uploadProjectFiles: vi.fn(),
  updateProjectFolder: vi.fn(),
  updateProjectFile: vi.fn(),
  deleteProjectFile: vi.fn(),
  deleteProjectFolder: vi.fn(),
  downloadDriveFile: vi.fn(),
  triggerBlobDownload: vi.fn(),
  toast: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  api: {
    listProjectFiles: mocks.listProjectFiles,
    createProjectFolder: mocks.createProjectFolder,
    uploadProjectFiles: mocks.uploadProjectFiles,
    updateProjectFolder: mocks.updateProjectFolder,
    updateProjectFile: mocks.updateProjectFile,
    deleteProjectFile: mocks.deleteProjectFile,
    deleteProjectFolder: mocks.deleteProjectFolder,
    downloadDriveFile: mocks.downloadDriveFile,
  },
  triggerBlobDownload: mocks.triggerBlobDownload,
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "member-1" } }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: mocks.toast }) }));

import ProjectFilesManager from "@/components/projects/ProjectFilesManager";
import ProjectBadge from "@/components/projects/ProjectBadge";

const listing = {
  rootFolder: { id: "root", name: "Project Files" },
  folder: { id: "root", name: "Project Files", parentId: null },
  breadcrumbs: [{ id: "root", name: "Project Files" }],
  folders: [{ id: "folder-1", scope: "workspace" as const, projectId: "project-1", name: "Contracts", parentId: "root", createdAt: "", updatedAt: "" }],
  folderOptions: [
    { id: "root", name: "Project Files", parentId: null },
    { id: "folder-1", name: "Contracts", parentId: "root" },
  ],
  files: [{ id: "file-1", folderId: "root", fileName: "brief.pdf", fileType: "application/pdf", fileSize: 10, uploadedBy: "member-1", createdAt: "2026-11-20T12:00:00Z", updatedAt: "" }],
  permissions: { canUpload: false, canManage: false },
};

describe("Project Files UI", () => {
  beforeEach(() => {
    Object.values(mocks).forEach((mock) => mock.mockReset());
    mocks.listProjectFiles.mockImplementation(async (_projectId: string, folderId?: string) => ({
      data: folderId
        ? { ...listing, folder: { id: folderId, name: "Contracts", parentId: "root" }, breadcrumbs: listing.breadcrumbs.concat({ id: folderId, name: "Contracts" }), folders: [], files: [] }
        : listing,
    }));
  });

  it("uses the project-scoped file API and does not show mutations to read-only members", async () => {
    render(<MemoryRouter><ProjectFilesManager projectId="project-1" /></MemoryRouter>);
    expect(await screen.findByText("brief.pdf")).toBeInTheDocument();
    expect(mocks.listProjectFiles).toHaveBeenCalledWith("project-1", undefined);
    expect(screen.queryByRole("button", { name: "Upload" })).toBeNull();
    expect(screen.queryByRole("button", { name: "New folder" })).toBeNull();

    mocks.downloadDriveFile.mockResolvedValue({ blob: new Blob(["pdf"]), fileName: "brief.pdf", contentType: "application/pdf" });
    await userEvent.click(screen.getByRole("button", { name: "Download brief.pdf" }));
    await waitFor(() => expect(mocks.downloadDriveFile).toHaveBeenCalledWith("file-1"));
    expect(mocks.triggerBlobDownload).toHaveBeenCalled();

    await userEvent.click(screen.getByRole("button", { name: "Contracts" }));
    await waitFor(() => expect(mocks.listProjectFiles).toHaveBeenLastCalledWith("project-1", "folder-1"));
  });

  it("renders a parent project badge as a separate project link", () => {
    render(<MemoryRouter><ProjectBadge project={{ id: "project-1", companyId: "workspace-9", name: "Launch" }} /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Open project Launch" })).toHaveAttribute("href", "/projects/project-1?workspace=workspace-9");
    const { container } = render(<MemoryRouter><ProjectBadge project={null} /></MemoryRouter>);
    expect(container.querySelector("a")).toBeNull();
  });
});
