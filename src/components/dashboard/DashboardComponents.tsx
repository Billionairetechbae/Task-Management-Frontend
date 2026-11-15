import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: { value: number; isPositive: boolean };
  className?: string;
  iconClassName?: string;
}

export const StatsCard = ({ title, value, icon: Icon, description, trend, className, iconClassName }: StatsCardProps) => (
  <div className={cn(
    "bg-card border border-border rounded-xl p-4 sm:p-5 transition-all duration-300 hover:shadow-elevated hover:border-primary/15 group",
    className
  )}>
    <div className="flex items-start justify-between gap-3">
      <div className="flex-1 min-w-0">
        <p className="mb-1.5 text-[0.6875rem] font-medium uppercase tracking-wider text-muted-foreground [overflow-wrap:anywhere] sm:text-xs">{title}</p>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight leading-none [overflow-wrap:anywhere]">{value}</p>
        {description && <p className="text-[0.6875rem] text-muted-foreground mt-1.5">{description}</p>}
        {trend && (
          <p className={cn("text-[0.6875rem] font-semibold mt-2 flex flex-wrap items-center gap-1 [overflow-wrap:anywhere]", trend.isPositive ? "text-success-text" : "text-destructive-text")}>
            <span>{trend.isPositive ? "↑" : "↓"}</span> {Math.abs(trend.value)}% from last month
          </p>
        )}
      </div>
      <div className={cn(
        "w-10 h-10 sm:w-11 sm:h-11 max-[20rem]:hidden rounded-xl flex items-center justify-center bg-primary/8 transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/12 shrink-0",
        iconClassName
      )}>
        <Icon className="w-5 h-5 text-primary-text" />
      </div>
    </div>
  </div>
);

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

export const PageHeader = ({ title, description, actions }: PageHeaderProps) => (
  <div className="mb-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 sm:mb-8">
    <div className="min-w-0 flex-1 basis-[min(100%,18rem)]">
      <h1 className="text-xl sm:text-2xl font-bold tracking-tight [overflow-wrap:anywhere]">{title}</h1>
      {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
    </div>
    {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">{actions}</div>}
  </div>
);

interface SectionHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const SectionHeader = ({ title, description, actions, className }: SectionHeaderProps) => (
  <div className={cn("flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4", className)}>
    <div className="min-w-0">
      <h2 className="text-base sm:text-lg font-semibold tracking-tight">{title}</h2>
      {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
    </div>
    {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
  </div>
);

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const ContentCard = ({ children, className, noPadding }: ContentCardProps) => (
  <div className={cn(
    "bg-card border border-border rounded-xl transition-all duration-200",
    !noPadding && "p-4 sm:p-5",
    className
  )}>
    {children}
  </div>
);

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ icon: Icon, title, description, action }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-12 sm:py-16 px-4 text-center">
    <div className="w-14 h-14 bg-muted rounded-2xl flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-muted-foreground/60" />
    </div>
    <h3 className="text-base font-semibold mb-1.5">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-sm mb-5">{description}</p>
    {action}
  </div>
);

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  onClick?: () => void;
  iconClassName?: string;
}

export const QuickActionCard = ({ title, description, icon: Icon, href, onClick, iconClassName }: QuickActionCardProps) => {
  const content = (
    <>
      <div className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center bg-primary/8 mb-3 transition-all duration-300 group-hover:scale-105 group-hover:bg-primary/12",
        iconClassName
      )}>
        <Icon className="w-5 h-5 text-primary-text" />
      </div>
      <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
      <p className="text-[0.6875rem] text-muted-foreground">{description}</p>
    </>
  );

  const className = "group bg-card border border-border rounded-xl p-4 hover:shadow-elevated hover:border-primary/15 transition-all duration-300 cursor-pointer text-left w-full";

  if (href) return <a href={href} className={className}>{content}</a>;
  return <button onClick={onClick} className={className}>{content}</button>;
};

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  const sizeClasses = { sm: "w-4 h-4 border-2", md: "w-6 h-6 border-2", lg: "w-10 h-10 border-[3px]" };
  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn("border-primary border-t-transparent rounded-full animate-spin", sizeClasses[size])} />
    </div>
  );
};

export const LoadingState = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <LoadingSpinner size="lg" />
    <p className="text-muted-foreground mt-4 text-sm">{message}</p>
  </div>
);

/* Skeleton helpers */
export const SkeletonCard = () => (
  <div className="bg-card border border-border rounded-xl p-5 space-y-3">
    <div className="h-4 w-1/3 bg-muted rounded-md animate-pulse" />
    <div className="h-8 w-1/2 bg-muted rounded-md animate-pulse" />
    <div className="h-3 w-2/3 bg-muted rounded-md animate-pulse" />
  </div>
);

export const SkeletonTable = ({ rows = 5 }: { rows?: number }) => (
  <div className="bg-card border border-border rounded-xl overflow-hidden">
    <div className="p-3 border-b border-border bg-muted/30">
      <div className="h-3 w-full bg-muted rounded-md animate-pulse" />
    </div>
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="p-3 border-b border-border last:border-0 flex gap-4">
        <div className="h-4 flex-[2] bg-muted rounded-md animate-pulse" />
        <div className="h-4 flex-1 bg-muted rounded-md animate-pulse" />
        <div className="h-4 flex-1 bg-muted rounded-md animate-pulse" />
      </div>
    ))}
  </div>
);
