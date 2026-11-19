import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/OfficeDocumentPreview", () => ({ default: () => null }));
import AttachmentPreview from "@/components/AttachmentPreview";

const base = { type: "application/pdf", name: "Plan.pdf", onClose: vi.fn() };

describe("AttachmentPreview states", () => {
  it("shows a visible loading state immediately and no iframe/download target yet", () => {
    const { container } = render(<AttachmentPreview {...base} loading />);
    expect(screen.getByRole("status")).toHaveTextContent(/loading preview/i);
    expect(container.ownerDocument.querySelector("iframe")).toBeNull();
  });
  it("shows a clear error", () => {
    render(<AttachmentPreview {...base} error="You don't have access to this file." />);
    expect(screen.getByRole("alert")).toHaveTextContent("You don't have access");
  });
  it("renders PDF inline via iframe without navigating or downloading", () => {
    render(<AttachmentPreview {...base} url="blob:http://x/1" />);
    expect(document.querySelector("iframe")?.getAttribute("src")).toBe("blob:http://x/1");
  });
  it("renders images inline", () => {
    render(<AttachmentPreview {...base} type="image/png" name="a.png" url="blob:http://x/2" />);
    expect(screen.getByRole("img", { name: "a.png" })).toBeInTheDocument();
  });
  it("unsupported formats explain and offer an explicit Download", () => {
    render(<AttachmentPreview {...base} type="application/zip" name="a.zip" url="blob:http://x/3" />);
    expect(screen.getByText(/preview not available/i)).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /download/i })[0]).toHaveAttribute("download", "a.zip");
  });
});
