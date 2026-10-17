import { describe, expect, it } from "vitest";
import { canonicalTaskCategories, matchTaskCategory } from "@/lib/taskCategories";

describe("workspace task categories", () => {
  it("trims and deduplicates category suggestions without rewriting the stored values", () => {
    expect(canonicalTaskCategories([" Marketing ", "marketing", "MARKETING", "Sales", null, "  "]))
      .toEqual(["Marketing", "Sales"]);
  });

  it("matches suggestions case-insensitively and permits a new or blank value", () => {
    expect(matchTaskCategory("  MARKETING ", ["Marketing"])).toBe("Marketing");
    expect(matchTaskCategory("Operations", ["Marketing"])).toBeNull();
    expect(matchTaskCategory("  ", ["Marketing"])).toBeNull();
  });
});
