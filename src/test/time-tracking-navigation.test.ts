import { describe, expect, it } from "vitest";
import { getSearchNavigation } from "@/components/dashboard/searchNavigation";

describe("Time Tracking global navigation", () => {
  it.each(["time", "timer", "timesheet", "tracked hours"])("finds the page by %s", (query) => {
    const results = getSearchNavigation(query, "team_member", () => false).Navigation;
    expect(results?.find((result) => result.id === "time-tracking")?.href).toBe("/time");
  });
});
