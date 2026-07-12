import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { api } from "@/lib/api";
import { Integration, STATUS_STYLES, extractIntegrations } from "@/lib/integrations";
import { IntegrationLogo } from "@/components/integrations/IntegrationLogo";

export default function IntegrationsDropdown() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Integration[]>([]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    api
      .listIntegrations()
      .then((res) => setItems(extractIntegrations(res)))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open]);

  const connectedCount = items.filter((i) => i.connected).length;
  const preview = items.slice(0, 6);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 relative">
              <Plug className="h-4 w-4" />
              {connectedCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Integrations</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Integrations</span>
          {items.length > 0 && (
            <span className="text-xs font-normal text-muted-foreground">
              {connectedCount} connected
            </span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />

        <div className="max-h-80 overflow-y-auto p-1">
          {loading ? (
            <div className="space-y-2 p-2">
              {[0, 1, 2].map((k) => <Skeleton key={k} className="h-9 w-full" />)}
            </div>
          ) : preview.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No integrations available.
            </p>
          ) : (
            preview.map((i) => {
              const style = STATUS_STYLES[i.status];
              return (
                <Link
                  key={i.id}
                  to="/settings/integrations"
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-2 py-2 rounded-md hover:bg-accent transition-colors"
                >
                  <IntegrationLogo integration={i} size={28} />
                  <span className="text-sm font-medium flex-1 truncate">{i.name}</span>
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${style.className}`}>
                    {style.label}
                  </Badge>
                </Link>
              );
            })
          )}
        </div>

        <DropdownMenuSeparator />
        <Link
          to="/settings/integrations"
          onClick={() => setOpen(false)}
          className="block text-center text-sm font-medium text-primary hover:underline py-2"
        >
          View all →
        </Link>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
