import { describe, expect, it } from "vitest";
import { mapWorkspaceSummary } from "@/contexts/AuthContext";

describe("workspace logo hydration", () => {
  it("retains the company logo from /me/workspaces in the normalized workspace and company", () => {
    const workspace = mapWorkspaceSummary({
      companyId: "workspace-a",
      role: "owner",
      company: { id: "workspace-a", name: "Northstar", logoUrl: "https://cdn.test/northstar.png" },
    });
    expect(workspace.logoUrl).toBe("https://cdn.test/northstar.png");
    expect(workspace.company?.logoUrl).toBe("https://cdn.test/northstar.png");
  });

  it("preserves flat logo URLs in cached/legacy workspace records", () => {
    expect(mapWorkspaceSummary({ id: "workspace-b", name: "Orbit", logoUrl: "https://cdn.test/orbit.png" }).logoUrl)
      .toBe("https://cdn.test/orbit.png");
  });

  it("uses null for workspaces without a logo", () => {
    expect(mapWorkspaceSummary({ id: "workspace-c", name: "Plain" }).logoUrl).toBeNull();
  });
});
