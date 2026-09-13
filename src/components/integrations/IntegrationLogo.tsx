import { Integration, PROVIDER_META } from "@/lib/integrations";
import { cn } from "@/lib/utils";

/** Local provider artwork, with initials only for providers without an asset. */
export const IntegrationLogo = ({
  integration,
  size = 36,
  className,
  decorative = true,
}: {
  integration: Pick<Integration, "id" | "name">;
  size?: number;
  className?: string;
  decorative?: boolean;
}) => {
  const meta = PROVIDER_META[integration.id];
  const brand = meta?.brand ?? "hsl(var(--primary))";
  const letter = (integration.name?.[0] ?? "?").toUpperCase();
  const px = `${size}px`;

  if (meta?.icon) {
    return (
      <img
        src={meta.icon}
        alt={decorative ? "" : meta.name}
        width={size}
        height={size}
        className={cn("object-contain shrink-0", className)}
        style={{ width: px, height: px }}
      />
    );
  }

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
