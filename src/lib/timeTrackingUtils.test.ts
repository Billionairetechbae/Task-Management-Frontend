import { describe, expect, it } from "vitest";
import { elapsedSeconds, formatDuration, localDateInput, weekStartInput } from "@/lib/timeTrackingUtils";

describe("Time Tracking display helpers", () => {
  it("formats short, hour, and multi-hour durations without fractional hours", () => {
    expect(formatDuration(32 * 60)).toBe("32m");
    expect(formatDuration(75 * 60)).toBe("1h 15m");
    expect(formatDuration(7 * 3600 + 5 * 60)).toBe("7h 05m");
    expect(formatDuration(-10)).toBe("0s");
  });

  it("calculates elapsed seconds from the server start timestamp and freezes completed entries", () => {
    const running = { startedAt: "2026-10-17T10:00:00.000Z", endedAt: null, durationSeconds: 0 };
    expect(elapsedSeconds(running, Date.parse("2026-10-17T10:01:15.000Z"))).toBe(75);
    expect(elapsedSeconds({ ...running, endedAt: "2026-10-17T10:01:20.000Z", durationSeconds: 80 }, Date.now())).toBe(80);
  });

  it("preserves local date selection and returns Monday as the week start", () => {
    const monday = new Date(2026, 9, 19, 0, 30);
    expect(localDateInput(monday)).toBe("2026-10-19");
    expect(weekStartInput(new Date(2026, 9, 21, 16))).toBe("2026-10-19");
  });
});
