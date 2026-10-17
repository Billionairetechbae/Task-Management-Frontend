import type { TimeEntry } from "@/lib/api";

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  if (hours) return `${hours}h ${String(minutes).padStart(2, "0")}m`;
  if (minutes) return `${minutes}m`;
  return `${safe}s`;
}

export function elapsedSeconds(entry: Pick<TimeEntry, "startedAt" | "endedAt" | "durationSeconds">, now = Date.now()): number {
  if (entry.endedAt) return Math.max(0, entry.durationSeconds || 0);
  return Math.max(0, Math.floor((now - new Date(entry.startedAt).getTime()) / 1000));
}

export function localDateInput(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export function weekStartInput(date = new Date()): string {
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return localDateInput(monday);
}
