import { AlertCircle, ArrowLeft, Lock, RefreshCw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { classifyTaskLoadError } from "@/lib/taskLoadError";

/** Specific, safe load-failure state with a recovery action. Used instead of any editable/empty fallback. */
export function TaskLoadErrorPanel({ error, onRetry, onBack, backLabel = "Back", compact = false }: { error: unknown; onRetry?: () => void; onBack?: () => void; backLabel?: string; compact?: boolean }) {
  const info = classifyTaskLoadError(error);
  const Icon = info.kind === "network" ? WifiOff : info.kind === "forbidden" || info.kind === "suspended" ? Lock : AlertCircle;
  return (
    <div role="alert" data-testid={`task-load-error-${info.kind}`} className={compact ? "p-4 text-center" : "flex h-full flex-col items-center justify-center bg-muted/20 p-6 text-center"}>
      <Icon className="mx-auto mb-3 h-10 w-10 text-muted-foreground" aria-hidden />
      <h3 className="text-base font-semibold">{info.title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{info.message}</p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
        {info.retryable && onRetry && <Button variant="outline" onClick={onRetry} className="gap-2"><RefreshCw className="h-4 w-4" />Try again</Button>}
        {onBack && <Button variant="ghost" onClick={onBack} className="gap-2"><ArrowLeft className="h-4 w-4" />{backLabel}</Button>}
      </div>
    </div>
  );
}
