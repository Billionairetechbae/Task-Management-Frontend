import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import type { TemplateType, TemplateUseResult } from "@/lib/api";
import { templateDestination } from "@/lib/templateForm";

/** Post-success navigation for every use-template entry point (identical for first runs and idempotent replays). */
export function useTemplateNavigation(type: TemplateType) {
  const navigate = useNavigate();
  const { toast } = useToast();
  return useCallback((result: TemplateUseResult) => {
    const dest = templateDestination(type, result);
    if (!dest.ok) toast({ title: `${type === "project" ? "Project" : "Task"} created`, description: "It was created, but we couldn't open it automatically. You can find it in your lists.", variant: "destructive" });
    navigate(dest.path);
  }, [type, navigate, toast]);
}
