import type { WorkloadLevel, WorkloadPerson, WorkloadTeam } from "@/lib/api";

export type WorkloadSort = "attention" | "active" | "overdue" | "due_soon" | "priority" | "projects" | "name";
export interface WorkloadFilters {
  search: string;
  level: WorkloadLevel | "all";
  teamId: string;
  role: string;
  overdueOnly: boolean;
  dueSoonOnly: boolean;
  highPriorityOnly: boolean;
  sort: WorkloadSort;
}

export const defaultWorkloadFilters: WorkloadFilters = {
  search: "", level: "all", teamId: "all", role: "all", overdueOnly: false,
  dueSoonOnly: false, highPriorityOnly: false, sort: "attention",
};

const levelOrder: Record<WorkloadLevel, number> = { overloaded: 0, heavy: 1, balanced: 2, light: 3 };

export function filterAndSortPeople(people: WorkloadPerson[], filters: WorkloadFilters): WorkloadPerson[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return people.filter((person) => {
    const name = `${person.user.firstName} ${person.user.lastName}`.toLocaleLowerCase();
    if (query && !`${name} ${person.teams.map((team) => team.name).join(" ")}`.toLocaleLowerCase().includes(query)) return false;
    if (filters.level !== "all" && person.workload.level !== filters.level) return false;
    if (filters.teamId !== "all" && !person.teams.some((team) => team.id === filters.teamId)) return false;
    if (filters.role !== "all" && person.user.role !== filters.role) return false;
    if (filters.overdueOnly && person.metrics.overdueTasks === 0) return false;
    if (filters.dueSoonOnly && person.metrics.dueSoonTasks === 0) return false;
    if (filters.highPriorityOnly && person.metrics.highPriorityTasks === 0) return false;
    return true;
  }).sort((a, b) => {
    switch (filters.sort) {
      case "active": return b.metrics.activeTasks - a.metrics.activeTasks || levelOrder[a.workload.level] - levelOrder[b.workload.level];
      case "overdue": return b.metrics.overdueTasks - a.metrics.overdueTasks || levelOrder[a.workload.level] - levelOrder[b.workload.level];
      case "due_soon": return b.metrics.dueSoonTasks - a.metrics.dueSoonTasks || levelOrder[a.workload.level] - levelOrder[b.workload.level];
      case "priority": return b.metrics.highPriorityTasks - a.metrics.highPriorityTasks || levelOrder[a.workload.level] - levelOrder[b.workload.level];
      case "projects": return b.metrics.activeProjects - a.metrics.activeProjects || levelOrder[a.workload.level] - levelOrder[b.workload.level];
      case "name": return `${a.user.firstName} ${a.user.lastName}`.localeCompare(`${b.user.firstName} ${b.user.lastName}`);
      default: return levelOrder[a.workload.level] - levelOrder[b.workload.level] || b.metrics.overdueTasks - a.metrics.overdueTasks || b.workload.score - a.workload.score;
    }
  });
}

export function filterAndSortTeams(teams: WorkloadTeam[], filters: WorkloadFilters): WorkloadTeam[] {
  const query = filters.search.trim().toLocaleLowerCase();
  return teams.filter((team) => {
    if (query && !`${team.name} ${team.lead?.firstName || ""} ${team.lead?.lastName || ""}`.toLocaleLowerCase().includes(query)) return false;
    if (filters.level !== "all" && team.workload.level !== filters.level) return false;
    if (filters.overdueOnly && team.metrics.overdueTasks === 0) return false;
    if (filters.dueSoonOnly && team.metrics.dueSoonTasks === 0) return false;
    if (filters.highPriorityOnly && team.metrics.highPriorityTasks === 0) return false;
    return true;
  }).sort((a, b) => {
    switch (filters.sort) {
      case "active": return b.metrics.activeTasks - a.metrics.activeTasks;
      case "overdue": return b.metrics.overdueTasks - a.metrics.overdueTasks;
      case "due_soon": return b.metrics.dueSoonTasks - a.metrics.dueSoonTasks;
      case "priority": return b.metrics.highPriorityTasks - a.metrics.highPriorityTasks;
      case "projects": return b.metrics.activeProjects - a.metrics.activeProjects;
      case "name": return a.name.localeCompare(b.name);
      default: return levelOrder[a.workload.level] - levelOrder[b.workload.level] || b.metrics.overdueTasks - a.metrics.overdueTasks || b.workload.score - a.workload.score;
    }
  });
}
