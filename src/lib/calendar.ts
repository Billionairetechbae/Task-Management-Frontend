import { api } from "./api";

export async function getCalendarEvents(
  start: Date,
  end: Date,
  scope: "company" | "my" | "team" = "company"
) {
  const response = await api.getCalendarEvents(start, end, scope);
  return response.events;
}