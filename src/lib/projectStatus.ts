export const PROJECT_STATUS_OPTIONS = [
  { value: "planning", label: "Planning" },
  { value: "active", label: "Active" },
  { value: "on_hold", label: "On Hold" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
] as const;

export type ProjectStatus = (typeof PROJECT_STATUS_OPTIONS)[number]["value"];

export function getProjectStatusLabel(status: string): string {
  return PROJECT_STATUS_OPTIONS.find((option) => option.value === status)?.label
    ?? status.replace(/_/g, " ");
}
