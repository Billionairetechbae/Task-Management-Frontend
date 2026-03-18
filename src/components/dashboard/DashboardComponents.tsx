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
    "bg-card border border-border rounded-lg p-4 sm:p-5 transition-all duration-200 hover:shadow-elevated hover:border-primary/20 group",
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
        "w-10 h-10 sm:w-11 sm:h-11 rounded-lg flex items-center justify-center bg-primary/10 transition-transform duration-200 group-hover:scale-110",
        iconClassName
      )}>
        <Icon className="w-5 h-5 sm:w-5 sm:h-5 text-primary" />
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
  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8 animate-fade-in">
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
    "bg-card border border-border rounded-lg transition-shadow duration-200 hover:shadow-soft",
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
  <div className="flex flex-col items-center justify-center py-12 px-4 text-center animate-fade-in">
    <div className="w-14 h-14 bg-muted rounded-xl flex items-center justify-center mb-4">
      <Icon className="w-7 h-7 text-muted-foreground" />
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
        "w-10 h-10 rounded-lg flex items-center justify-center bg-primary/10 mb-3 transition-transform duration-200 group-hover:scale-110",
        iconClassName
      )}>
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold text-sm mb-0.5">{title}</h3>
      <p className="text-xs text-muted-foreground">{description}</p>
    </>
  );

  const className = "group bg-card border border-border rounded-lg p-4 hover:shadow-elevated hover:border-primary/20 transition-all duration-200 cursor-pointer text-left w-full";

  if (href) {
    return <a href={href} className={className}>{content}</a>;
  }

  return <button onClick={onClick} className={className}>{content}</button>;
};

interface LoadingSpinnerProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

export const LoadingSpinner = ({ className, size = "md" }: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-6 h-6 border-2",
    lg: "w-10 h-10 border-[3px]",
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
  <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
    <LoadingSpinner size="lg" />
    <p className="text-muted-foreground mt-4 text-sm">{message}</p>
  </div>
);
