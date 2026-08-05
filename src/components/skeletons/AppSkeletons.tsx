import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RefreshCw } from "lucide-react";

/** Subtle indicator shown while cached data is silently refreshed. */
export const RefreshingIndicator = ({
  active,
  className,
  label = "Refreshing",
}: {
  active?: boolean;
  className?: string;
  label?: string;
}) => {
  if (!active) return null;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground animate-fade-in",
        className
      )}
    >
      <RefreshCw className="h-3 w-3 animate-spin" />
      {label}
    </span>
  );
};

export const SkeletonCard = ({ className }: { className?: string }) => (
  <Card className={cn("p-4 space-y-3", className)}>
    <div className="flex items-center justify-between">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-8 w-8 rounded-lg" />
    </div>
    <Skeleton className="h-7 w-16" />
    <Skeleton className="h-3 w-32" />
  </Card>
);

export const SkeletonStatsRow = ({ count = 4 }: { count?: number }) => (
  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
    {Array.from({ length: count }).map((_, i) => (
      <SkeletonCard key={i} />
    ))}
  </div>
);

export const SkeletonTable = ({ rows = 6 }: { rows?: number }) => (
  <div className="w-full space-y-2">
    <div className="flex items-center gap-3 pb-2 border-b border-border">
      <Skeleton className="h-3 w-1/3" />
      <Skeleton className="h-3 w-20 ml-auto" />
      <Skeleton className="h-3 w-20" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 py-2.5">
        <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3.5 w-2/3" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
        <Skeleton className="h-6 w-20 rounded-full shrink-0" />
        <Skeleton className="h-6 w-16 rounded-md shrink-0 hidden sm:block" />
      </div>
    ))}
  </div>
);

export const SkeletonList = ({ rows = 5 }: { rows?: number }) => (
  <div className="space-y-2.5">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="flex items-center gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-2.5 w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export const SkeletonProjectGrid = ({ count = 6 }: { count?: number }) => (
  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
    {Array.from({ length: count }).map((_, i) => (
      <Card key={i} className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Skeleton className="h-11 w-11 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <div className="flex items-center gap-2 pt-1">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </Card>
    ))}
  </div>
);

export const SkeletonDashboard = () => (
  <div className="w-full space-y-6 animate-fade-in">
    <div className="space-y-2">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="h-3.5 w-80" />
    </div>
    <SkeletonStatsRow />
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="p-5 lg:col-span-1 space-y-4">
        <Skeleton className="h-4 w-32" />
        <SkeletonList rows={4} />
      </Card>
      <Card className="p-5 lg:col-span-2 space-y-4">
        <Skeleton className="h-4 w-40" />
        <SkeletonTable rows={5} />
      </Card>
    </div>
  </div>
);

export const SkeletonWorkbench = () => (
  <div className="flex w-full gap-3 animate-fade-in">
    <Card className="hidden md:block w-[260px] shrink-0 p-4 space-y-4">
      <Skeleton className="h-8 w-full rounded-lg" />
      <SkeletonList rows={7} />
    </Card>
    <Card className="flex-1 p-5 space-y-4">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-5/6" />
      <SkeletonTable rows={4} />
    </Card>
    <Card className="hidden xl:block w-[340px] shrink-0 p-4 space-y-4">
      <Skeleton className="h-8 w-full rounded-lg" />
      <SkeletonList rows={6} />
    </Card>
  </div>
);
