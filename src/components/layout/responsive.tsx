import * as React from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Shared responsive building blocks for the User Portal. Their behaviour comes from the `rl-*` container-query
 * primitives in index.css, so they react to the space actually available to them (window width, browser zoom,
 * sidebar state and larger text all reduce it the same way) instead of to window breakpoints.
 */

/** Optional side rail + main column. The rail stacks above the main column until the container can hold both. */
export function SplitLayout({ rail, children, className }: { rail?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rl-split", className)}>
      <div className={cn("rl-split__grid", rail ? "rl-split__grid--rail" : undefined)}>
        {rail ? <aside aria-label="Overview" className="rl-split__rail min-w-0">{rail}</aside> : null}
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}

/** Cards (KPIs, summaries) that wrap onto more rows instead of being squeezed below `min`. */
export function CardGrid({ min = "11rem", className, children, ...rest }: { min?: string } & React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("rl-cards", className)} style={{ "--rl-card-min": min } as React.CSSProperties} {...rest}>
      {children}
    </div>
  );
}

const controlBase =
  "h-10 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-sm text-foreground";

/** Wrapper for a group of filters. Controls keep a usable minimum width and wrap in whole rows. */
export function FilterBar({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div role="group" className={cn("rl-filters rounded-xl border border-border/80 bg-card p-2 shadow-soft", className)} {...rest}>
      {children}
    </div>
  );
}

export function FilterSearch({ label, className, ...rest }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("rl-filters__search relative", className)}>
      <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input type="search" aria-label={label} className={cn(controlBase, "pl-9 placeholder:text-muted-foreground")} {...rest} />
    </div>
  );
}

export function FilterSelect({ label, className, children, ...rest }: { label: string } & React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select aria-label={label} className={cn(controlBase, "truncate", className)} {...rest}>
      {children}
    </select>
  );
}

/** Horizontal scroller for genuinely two-dimensional content. Focusable so keyboard users can scroll it. */
export function ScrollRegion({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div role="region" aria-label={label} tabIndex={0} className={cn("rl-scroll-x", className)}>
      {children}
    </div>
  );
}
