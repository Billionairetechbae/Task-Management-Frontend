import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api", () => ({
  api: { previewTaskAttachment: vi.fn() },
}));

import { api } from "@/lib/api";
import { TaskCommentAttachment } from "@/components/tasks/TaskCommentAttachment";

describe("task comment attachment preview", () => {
  beforeEach(() => {
    vi.mocked(api.previewTaskAttachment).mockReset();
    vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:authenticated-preview");
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it("loads image bytes through the authenticated API and exposes preview and download actions", async () => {
    vi.mocked(api.previewTaskAttachment).mockResolvedValue({
      blob: new Blob(["image"]),
      fileName: "report.png",
      contentType: "image/png",
    });
    const onPreview = vi.fn();
    const onDownload = vi.fn();
    render(
      <TaskCommentAttachment
        taskId="task-1"
        attachment={{ id: "attachment-1", fileName: "report.png", fileType: "image/png" }}
        onPreview={onPreview}
        onDownload={onDownload}
      />,
    );

    expect(await screen.findByRole("img", { name: "report.png" })).toHaveAttribute("src", "blob:authenticated-preview");
    expect(api.previewTaskAttachment).toHaveBeenCalledWith("task-1", "attachment-1");
    fireEvent.click(screen.getByRole("button", { name: "Preview report.png" }));
    fireEvent.click(screen.getByRole("button", { name: "Download report.png" }));
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onDownload).toHaveBeenCalledTimes(1);
  });

  it("offers a retry when authenticated thumbnail loading fails", async () => {
    vi.mocked(api.previewTaskAttachment)
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({ blob: new Blob(["image"]), fileName: "retry.webp", contentType: "image/webp" });
    render(
      <TaskCommentAttachment
        taskId="task-1"
        attachment={{ id: "attachment-2", fileName: "retry.webp", fileType: "image/webp" }}
        onPreview={vi.fn()}
        onDownload={vi.fn()}
      />,
    );

    const retry = await screen.findByRole("button", { name: "Retry preview for retry.webp" });
    fireEvent.click(retry);
    await waitFor(() => expect(screen.getByRole("img", { name: "retry.webp" })).toBeInTheDocument());
    expect(api.previewTaskAttachment).toHaveBeenCalledTimes(2);
  });
});
