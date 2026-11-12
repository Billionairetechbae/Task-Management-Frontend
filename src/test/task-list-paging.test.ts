import { describe, expect, it } from "vitest";
import { nextTaskPageParam, TASK_LIST_PAGE_SIZE } from "@/lib/taskListUtils";

/**
 * Regression for the production incident "continuous GET /api/v1/tasks, ~1 request per second".
 * The backend's `total` is a SQL count that also counts joined rows, so it can exceed the number of distinct tasks that exist.
 * The old stopping rule ("keep going while loaded < total") then never ended, and the Dashboard/Board requested empty pages forever.
 */
const page = (n: number, total?: number, extra: Record<string, unknown> = {}) => ({ data: { tasks: Array.from({ length: n }, (_, i) => ({ id: String(i) })) }, ...(total === undefined ? {} : { total }), ...extra });
const walk = (pages: ReturnType<typeof page>[], limit = 200) => {
  // emulate React Query's infinite loop: ask for the next page until nextTaskPageParam says stop
  const loaded: ReturnType<typeof page>[] = []; let requests = 0;
  for (const next of pages) {
    requests += 1; loaded.push(next);
    if (nextTaskPageParam(next, loaded) === undefined) return { requests, ended: true };
    if (requests >= limit) break;
  }
  return { requests, ended: false };
};

describe("nextTaskPageParam", () => {
  it("production shape: a workspace whose total over-reports (37 tasks, total 93) ends after ONE request, not never", () => {
    const empties = Array.from({ length: 50 }, () => page(0, 93));
    expect(walk([page(37, 93), ...empties])).toEqual({ requests: 1, ended: true });
  });
  it("the old rule would not have ended on that data (documents the defect)", () => {
    const oldRule = (last: ReturnType<typeof page>, all: ReturnType<typeof page>[]) => (all.reduce((n, p) => n + p.data.tasks.length, 0) < (last.total as number) ? all.length + 1 : undefined);
    const all = [page(37, 93), page(0, 93), page(0, 93)];
    expect(oldRule(all[2], all)).toBe(4);
  });
  it("an empty page always ends the loop, whatever total says", () => {
    expect(nextTaskPageParam(page(0, 1_000_000), [page(100, 1_000_000), page(0, 1_000_000)])).toBeUndefined();
    expect(nextTaskPageParam(page(0), [page(0)])).toBeUndefined();
  });
  it("a short page (fewer than requested) always ends the loop", () => {
    expect(nextTaskPageParam(page(99, 5000), [page(99, 5000)])).toBeUndefined();
    expect(nextTaskPageParam(page(1, 5000), [page(100, 5000), page(1, 5000)])).toBeUndefined();
  });
  it("full pages continue while there is more to load", () => {
    expect(nextTaskPageParam(page(TASK_LIST_PAGE_SIZE, 250), [page(100, 250)])).toBe(2);
    expect(nextTaskPageParam(page(TASK_LIST_PAGE_SIZE, 250), [page(100, 250), page(100, 250)])).toBe(3);
  });
  it("complete multi-page population is still fully loaded: 250 real tasks over pages of 100", () => {
    expect(walk([page(100, 250), page(100, 250), page(50, 250), page(0, 250)])).toEqual({ requests: 3, ended: true });
  });
  it("an over-reporting total on full pages still ends at the short page (150 real tasks, total 400)", () => {
    expect(walk([page(100, 400), page(50, 400), page(0, 400)])).toEqual({ requests: 2, ended: true });
  });
  it("an exact multiple of the page size ends on the accurate total without an extra request", () => {
    expect(walk([page(100, 100), page(0, 100)])).toEqual({ requests: 1, ended: true });
    expect(walk([page(100, 200), page(100, 200), page(0, 200)])).toEqual({ requests: 2, ended: true });
  });
  it("a full page with no total keeps going until a short or empty page", () => {
    expect(walk([page(100), page(100), page(20)])).toEqual({ requests: 3, ended: true });
  });
  it("a pagination object, when a backend provides one, is honoured", () => {
    expect(nextTaskPageParam(page(100, undefined, { pagination: { hasNextPage: true } }), [page(100)])).toBe(2);
    expect(nextTaskPageParam(page(100, undefined, { pagination: { hasNextPage: false } }), [page(100)])).toBeUndefined();
  });
});
