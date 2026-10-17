import { describe, expect, it } from "vitest";
import type { WorkloadPerson, WorkloadTeam } from "@/lib/api";
import { defaultWorkloadFilters, filterAndSortPeople, filterAndSortTeams } from "@/lib/workloadView";

function person(id: string, level: WorkloadPerson["workload"]["level"], metrics: Partial<WorkloadPerson["metrics"]> = {}, teams = [{ id: "t1", name: "Delivery" }]): WorkloadPerson {
  const firstName = id === "p1" ? "Amina" : id === "p2" ? "Bola" : "Chidi";
  return { user: { id, firstName, lastName: "Person", role: "member", avatar: null }, teams, metrics: { activeTasks: 0, overdueTasks: 0, dueSoonTasks: 0, highPriorityTasks: 0, activeProjects: 0, ...metrics }, workload: { level, score: 0, reasons: [] }, tasks: [] };
}
function team(id: string, level: WorkloadTeam["workload"]["level"], metrics: Partial<WorkloadTeam["metrics"]> = {}): WorkloadTeam {
  return { id, name: id === "t1" ? "Delivery" : "Operations", lead: null, memberCount: 2, metrics: { activeTasks: 0, overdueTasks: 0, dueSoonTasks: 0, highPriorityTasks: 0, activeProjects: 0, ...metrics }, workload: { level, score: 0, reasons: [] }, tasks: [] };
}

describe("workload view filters and sorting", () => {
  const people = [
    person("p1", "overloaded", { activeTasks: 12, overdueTasks: 3, highPriorityTasks: 2 }),
    person("p2", "heavy", { activeTasks: 8, dueSoonTasks: 2 }, [{ id: "t2", name: "Operations" }]),
    person("p3", "light", { activeTasks: 1 }),
  ];

  it("defaults to severity then overdue burden", () => {
    expect(filterAndSortPeople(people, defaultWorkloadFilters).map((row) => row.user.id)).toEqual(["p1", "p2", "p3"]);
    expect(filterAndSortPeople([people[1], people[0]], { ...defaultWorkloadFilters, sort: "overdue" }).map((row) => row.user.id)).toEqual(["p1", "p2"]);
  });

  it("combines case-insensitive search, workload, Team, role and burden filters", () => {
    const result = filterAndSortPeople(people, { ...defaultWorkloadFilters, search: "OPERATIONS", level: "heavy", teamId: "t2", role: "member", dueSoonOnly: true });
    expect(result.map((row) => row.user.id)).toEqual(["p2"]);
    expect(filterAndSortPeople(people, { ...defaultWorkloadFilters, overdueOnly: true }).map((row) => row.user.id)).toEqual(["p1"]);
    expect(filterAndSortPeople(people, { ...defaultWorkloadFilters, highPriorityOnly: true }).map((row) => row.user.id)).toEqual(["p1"]);
  });

  it("filters and sorts Teams by attention and workload metrics", () => {
    const teams = [team("t1", "heavy", { overdueTasks: 3, activeTasks: 8 }), team("t2", "overloaded", { overdueTasks: 1, activeTasks: 12 })];
    expect(filterAndSortTeams(teams, defaultWorkloadFilters).map((row) => row.id)).toEqual(["t2", "t1"]);
    expect(filterAndSortTeams(teams, { ...defaultWorkloadFilters, overdueOnly: true, sort: "overdue" }).map((row) => row.id)).toEqual(["t1", "t2"]);
    expect(filterAndSortTeams(teams, { ...defaultWorkloadFilters, search: "delivery", level: "heavy" }).map((row) => row.id)).toEqual(["t1"]);
  });
});
