import type { ProjectHealthProject, ProjectHealthStatus } from "@/lib/api";

export type PortfolioDeadlineFilter = "all" | "overdue" | "next_7_days" | "no_deadline";
export type PortfolioProgressFilter = "all" | "0_24" | "25_49" | "50_74" | "75_99" | "100";
export type PortfolioSort = "attention" | "deadline" | "health" | "progress" | "overdue_tasks" | "name" | "recent";

export interface PortfolioFilters {
  search: string;
  status: string;
  health: ProjectHealthStatus | "all";
  ownerId: string;
  teamId: string;
  deadline: PortfolioDeadlineFilter;
  progress: PortfolioProgressFilter;
  needsAttention: boolean;
  sort: PortfolioSort;
}

export const defaultPortfolioFilters: PortfolioFilters = {
  search: "",
  status: "all",
  health: "all",
  ownerId: "all",
  teamId: "all",
  deadline: "all",
  progress: "all",
  needsAttention: false,
  sort: "attention",
};

export function portfolioDeadline(row: ProjectHealthProject): string | null {
  return row.deadline || row.project.dueDate || row.project.endDate || null;
}

export function portfolioProgress(row: ProjectHealthProject): number {
  return row.metrics.completionRate || 0;
}

export function portfolioIsCompleted(row: ProjectHealthProject): boolean {
  return row.metrics.totalTasks > 0 && row.metrics.completedTasks === row.metrics.totalTasks;
}

export function portfolioIsOverdue(row: ProjectHealthProject, now = new Date()): boolean {
  if (row.project.status === "archived" || portfolioIsCompleted(row)) return false;
  const deadline = portfolioDeadline(row);
  return row.metrics.overdueTasks > 0 || Boolean(deadline && new Date(deadline).getTime() < now.getTime());
}

export function portfolioNeedsAttention(row: ProjectHealthProject, now = new Date()): boolean {
  if (row.healthStatus === "at_risk" || row.healthStatus === "critical") return true;
  if (row.metrics.overdueTasks > 0) return true;
  if (row.project.status === "archived" || portfolioIsCompleted(row)) return false;
  const deadline = portfolioDeadline(row);
  if (!deadline) return false;
  const daysRemaining = (new Date(deadline).getTime() - now.getTime()) / 86_400_000;
  return daysRemaining < 0 || daysRemaining <= 7;
}

function healthPriority(status: ProjectHealthStatus): number {
  return ({ critical: 0, at_risk: 1, watchlist: 2, healthy: 3 } as Record<ProjectHealthStatus, number>)[status] ?? 4;
}

function attentionPriority(row: ProjectHealthProject, now: Date): number {
  if (row.healthStatus === "critical") return 0;
  if (row.healthStatus === "at_risk") return 1;
  if (portfolioIsOverdue(row, now)) return 2;
  if (portfolioNeedsAttention(row, now)) return 3;
  return 4;
}

function progressMatches(progress: number, filter: PortfolioProgressFilter): boolean {
  if (filter === "all") return true;
  if (filter === "0_24") return progress < 25;
  if (filter === "25_49") return progress >= 25 && progress < 50;
  if (filter === "50_74") return progress >= 50 && progress < 75;
  if (filter === "75_99") return progress >= 75 && progress < 100;
  return progress === 100;
}

export function filterAndSortPortfolioProjects(
  projects: ProjectHealthProject[],
  filters: PortfolioFilters,
  now = new Date(),
): ProjectHealthProject[] {
  const query = filters.search.trim().toLocaleLowerCase();
  const filtered = projects.filter((row) => {
    const searchable = [
      row.project.name,
      row.project.description,
      row.project.owner?.firstName,
      row.project.owner?.lastName,
      row.project.team?.name,
    ].filter(Boolean).join(" ").toLocaleLowerCase();
    if (query && !searchable.includes(query)) return false;
    if (filters.status !== "all" && row.project.status !== filters.status) return false;
    if (filters.health !== "all" && row.healthStatus !== filters.health) return false;
    if (filters.ownerId !== "all" && row.project.owner?.id !== filters.ownerId) return false;
    if (filters.teamId !== "all" && row.project.team?.id !== filters.teamId) return false;
    if (filters.needsAttention && !portfolioNeedsAttention(row, now)) return false;
    if (!progressMatches(portfolioProgress(row), filters.progress)) return false;

    const deadline = portfolioDeadline(row);
    if (filters.deadline === "no_deadline" && deadline) return false;
    if (filters.deadline === "overdue" && !portfolioIsOverdue(row, now)) return false;
    if (filters.deadline === "next_7_days") {
      if (!deadline || row.project.status === "archived" || portfolioIsCompleted(row)) return false;
      const days = (new Date(deadline).getTime() - now.getTime()) / 86_400_000;
      if (days < 0 || days > 7) return false;
    }
    return true;
  });

  const deadlineTime = (row: ProjectHealthProject) => {
    const value = portfolioDeadline(row);
    return value ? new Date(value).getTime() : Number.POSITIVE_INFINITY;
  };
  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case "deadline": return deadlineTime(a) - deadlineTime(b) || a.project.name.localeCompare(b.project.name);
      case "health": return healthPriority(a.healthStatus) - healthPriority(b.healthStatus) || deadlineTime(a) - deadlineTime(b);
      case "progress": return portfolioProgress(a) - portfolioProgress(b);
      case "overdue_tasks": return b.metrics.overdueTasks - a.metrics.overdueTasks || deadlineTime(a) - deadlineTime(b);
      case "name": return a.project.name.localeCompare(b.project.name);
      case "recent": return new Date(b.lastActivity || b.project.updatedAt || 0).getTime() - new Date(a.lastActivity || a.project.updatedAt || 0).getTime();
      default: return attentionPriority(a, now) - attentionPriority(b, now) || deadlineTime(a) - deadlineTime(b);
    }
  });
}
