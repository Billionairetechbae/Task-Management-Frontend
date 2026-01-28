import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconClassName?: string;
}

export const StatsCard = ({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconClassName,
}: StatsCardProps) => (
  <div className={cn(
    "bg-card border border-border rounded-xl p-4 sm:p-6 transition-all hover:shadow-md",
    className
  )}>
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs sm:text-sm font-medium text-muted-foreground mb-1">
          {title}
        </p>
        <p className="text-2xl sm:text-3xl font-bold tracking-tight">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs font-medium mt-2",
            trend.isPositive ? "text-success" : "text-destructive"
          )}>
            {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% from last month
          </p>
        )}
      </div>
      <div className={cn(
        "w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center bg-primary/10",
        iconClassName
      )}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
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
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{title}</h1>
      {description && (
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2 sm:gap-3">{actions}</div>}
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
    <div>
      <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
    {actions && <div className="flex items-center gap-2">{actions}</div>}
  </div>
);

interface ContentCardProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export const ContentCard = ({ children, className, noPadding }: ContentCardProps) => (
  <div className={cn(
    "bg-card border border-border rounded-xl",
    !noPadding && "p-4 sm:p-6",
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
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
    <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
      <Icon className="w-8 h-8 text-muted-foreground" />
    </div>
    <h3 className="text-lg font-semibold mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm max-w-sm mb-4">{description}</p>
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

export const QuickActionCard = ({ 
  title, 
  description, 
  icon: Icon, 
  href, 
  onClick,
  iconClassName 
}: QuickActionCardProps) => {
  const content = (
    <>
      <div className={cn(
        "w-12 h-12 rounded-xl flex items-center justify-center bg-primary/10 mb-4",
        iconClassName
      )}>
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </>
  );

  const className = "bg-card border border-border rounded-xl p-6 hover:shadow-md hover:border-primary/20 transition-all cursor-pointer text-left w-full";

  if (href) {
    return (
      <a href={href} className={className}>
        {content}
      </a>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
};

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <div className={cn(
        "border-primary border-t-transparent rounded-full animate-spin",
        sizeClasses[size]
      )} />
    </div>
  );
};

export const LoadingState = ({ message = "Loading..." }: { message?: string }) => (
  <div className="flex flex-col items-center justify-center py-12">
    <LoadingSpinner size="lg" />
    <p className="text-muted-foreground mt-4">{message}</p>
  </div>
);
