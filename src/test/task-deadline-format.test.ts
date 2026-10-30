import { describe, expect, it } from "vitest";
import { formatTaskDeadline } from "@/components/dashboard/TaskComponents";

describe("task deadline display", () => {
  it("renders API null and missing deadlines as an em dash", () => {
    expect(formatTaskDeadline(null)).toBe("—");
    expect(formatTaskDeadline(undefined)).toBe("—");
  });

  it("renders a valid deadline using the locale date format", () => {
    const deadline = "2026-10-30T12:00:00.000Z";
    expect(formatTaskDeadline(deadline)).toBe(new Date(deadline).toLocaleDateString());
  });

  it("preserves a real January 1, 1970 deadline", () => {
    const deadline = "1970-01-01T00:00:00.000Z";
    expect(formatTaskDeadline(deadline)).toBe(new Date(deadline).toLocaleDateString());
    expect(formatTaskDeadline(deadline)).not.toBe("—");
  });

  it("does not turn blank, invalid, or numeric zero values into the Unix epoch", () => {
    expect(formatTaskDeadline("")).toBe("—");
    expect(formatTaskDeadline("not-a-date")).toBe("—");
    expect(formatTaskDeadline(0 as never)).toBe("—");
  });
});
