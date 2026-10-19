/**
 * One classification of "the task could not be loaded", shared by Task Workbench, Team Workspace and the edit drawer.
 * ApiError carries the HTTP status in `statusCode` (its `status` field is a string), and the backend's stable code in `body.code`.
 * Never treat a failed load as an empty task, and never show a raw server message.
 */
export type TaskLoadErrorKind = "not_found" | "forbidden" | "suspended" | "invalid" | "network" | "server";

export interface TaskLoadErrorInfo { kind: TaskLoadErrorKind; title: string; message: string; retryable: boolean }

const INFO: Record<TaskLoadErrorKind, Omit<TaskLoadErrorInfo, "kind">> = {
  not_found: { title: "Task not found", message: "This task may have been deleted, moved out of this workspace, or the link is no longer valid.", retryable: false },
  forbidden: { title: "You don't have access to this task", message: "Ask a workspace admin or the task's owner to share it with you. You can still browse other tasks.", retryable: false },
  suspended: { title: "This workspace is suspended", message: "Its tasks are temporarily unavailable. Your data has been kept and access returns when the workspace is reactivated.", retryable: false },
  invalid: { title: "This task link is invalid", message: "The task identifier in the address is not valid. Open the task from a list instead.", retryable: false },
  network: { title: "You're offline", message: "Check your connection and try again.", retryable: true },
  server: { title: "The task couldn't be loaded", message: "Something went wrong on our side. Your task has not been changed. Try again in a moment.", retryable: true },
};

export function classifyTaskLoadError(error: unknown): TaskLoadErrorInfo {
  const e = error as { name?: string; statusCode?: number; status?: number | string; body?: { code?: string } } | null;
  const status = typeof e?.statusCode === "number" ? e.statusCode : typeof e?.status === "number" ? e.status : null;
  const code = e?.body?.code;
  let kind: TaskLoadErrorKind = "server";
  if (e?.name === "NetworkError") kind = "network";
  else if (status === 423 || code === "WORKSPACE_SUSPENDED") kind = "suspended";
  else if (status === 400 && code === "INVALID_TASK_ID") kind = "invalid";
  else if (status === 404 || code === "TASK_NOT_FOUND") kind = "not_found";
  else if (status === 401 || status === 403 || code === "TASK_ACCESS_DENIED") kind = "forbidden";
  else if (status === null && e?.name !== "ApiError" && typeof navigator !== "undefined" && navigator.onLine === false) kind = "network";
  return { kind, ...INFO[kind] };
}
