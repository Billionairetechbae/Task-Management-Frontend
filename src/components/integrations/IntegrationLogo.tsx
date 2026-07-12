import { Integration, PROVIDER_META } from "@/lib/integrations";
import { cn } from "@/lib/utils";

/**
 * Provider-agnostic logo tile. Uses colored initials so any provider the
 * backend returns renders without extra work. If we later ship SVG logos,
 * this is the only component to update.
 */
export const IntegrationLogo = ({
  integration,
  size = 40,
  className,
}: {
  integration: Pick<Integration, "id" | "name">;
  size?: number;
  className?: string;
}) => {
  const meta = PROVIDER_META[integration.id];
  const brand = meta?.brand ?? "hsl(var(--primary))";
  const letter = (integration.name?.[0] ?? "?").toUpperCase();
  const px = `${size}px`;

  return (
    <div
      className={cn(
        "rounded-xl flex items-center justify-center font-semibold text-white shadow-sm shrink-0",
        className
      )}
      style={{
        width: px,
        height: px,
        background: `linear-gradient(135deg, ${brand}, ${brand}cc)`,
        fontSize: size * 0.42,
      }}
      aria-hidden
    >
      {letter}
    </div>
  );
};
