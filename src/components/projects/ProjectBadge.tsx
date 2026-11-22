import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function ProjectBadge({
  project,
  className = "",
  onNavigate,
}: {
  project?: { id?: string | null; companyId?: string | null; name?: string | null } | null;
  className?: string;
  onNavigate?: () => void;
}) {
  if (!project?.id || !project.name) return null;
  const workspace = project.companyId ? `?workspace=${encodeURIComponent(project.companyId)}` : "";
  return (
    <Link
      to={`/projects/${encodeURIComponent(project.id)}${workspace}`}
      onClick={(event) => {
        event.stopPropagation();
        onNavigate?.();
      }}
      aria-label={`Open project ${project.name}`}
      className="inline-flex max-w-full"
    >
      <Badge variant="outline" className={`max-w-full truncate text-[0.5625rem] font-medium text-primary-text hover:bg-primary/10 ${className}`}>
        {project.name}
      </Badge>
    </Link>
  );
}
