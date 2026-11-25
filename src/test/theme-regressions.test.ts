import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const board = readFileSync("src/pages/Board.tsx", "utf8");
const teams = readFileSync("src/pages/Teams.tsx", "utf8");
const accountMenu = readFileSync("src/components/dashboard/AccountMenu.tsx", "utf8");

describe("theme and shared header regressions", () => {
  it("keeps every Board lane on semantic theme surfaces and status text tokens", () => {
    expect(board).toContain('panel: "bg-info/5"');
    expect(board).toContain('badge: "bg-success/10 text-success-text border-success/20"');
    expect(board).toContain('panel: "bg-destructive/5"');
    expect(board).not.toContain("bg-white");
    expect(board).not.toContain('panel: "bg-slate-50/80 dark:bg-slate-900/70"');
  });

  it("keeps the Team content region attached to the active theme", () => {
    expect(teams).toContain('data-testid="teams-workspace-shell"');
    expect(teams).toContain("min-h-0 flex-1 bg-background");
    expect(teams).toContain("text-foreground sm:p-5");
    expect(teams).not.toContain('bg-[#f7f7fa]');
  });

  it("does not render the avatar-adjacent semicolon", () => {
    expect(accountMenu).not.toContain("</DropdownMenu>;");
    expect(accountMenu).toContain('aria-label="Open account menu"');
  });
});
