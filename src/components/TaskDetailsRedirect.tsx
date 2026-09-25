import { Navigate, useParams } from "react-router-dom";

/**
 * Backward-compatible redirect for the legacy/non-canonical task URL shape
 * `/tasks/:id`. The canonical task-detail route is `/task-details/:id`.
 *
 * Historically the Team Workspace "Active Assignments" link and the subtask
 * "Open" link pointed at `/tasks/:id`, which matched no route and fell through
 * to the catch-all NotFound page. Those links are now fixed, but this redirect
 * keeps any bookmarked, pasted, refreshed, or externally-shared `/tasks/:id`
 * URL working by forwarding to the canonical route.
 *
 * The redirect target (`/task-details/:id`) remains wrapped in ProtectedRoute,
 * so this does not bypass authentication or authorization.
 */
export default function TaskDetailsRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/task-details/${id ?? ""}`} replace />;
}
