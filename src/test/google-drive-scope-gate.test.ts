import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook } from "@testing-library/react";
import { googleDriveService } from "@/services/googleDriveService";
import { useGoogleDrive } from "@/hooks/useGoogleDrive";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Google Drive scope gate", () => {
  it("does not call Drive APIs when the user lacks Drive authorization", async () => {
    const root = vi.spyOn(googleDriveService, "getRootFolder").mockResolvedValue({ id: "root", name: "My Drive" } as any);
    renderHook(() => useGoogleDrive("my-drive", false));
    await Promise.resolve();
    expect(root).not.toHaveBeenCalled();
  });
});
