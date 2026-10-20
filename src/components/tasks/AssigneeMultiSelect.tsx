import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { CompanyMember } from "@/lib/api";
import { memberInitials, memberLabel, memberMatches, memberName } from "@/lib/memberIdentity";

interface Props {
  members: CompanyMember[];
  value: string[];
  onChange: (userIds: string[]) => void;
  meId?: string | null;
  loading?: boolean;
  disabled?: boolean;
  label?: string;
  error?: string | null;
}

/** Searchable multi-select of workspace members. Stores and emits stable user ids; the label is display only. */
export function AssigneeMultiSelect({ members, value, onChange, meId, loading = false, disabled = false, label = "Assignees", error = null }: Props) {
  const [open, setOpen] = useState(false);
  const byId = useMemo(() => new Map(members.map((m) => [m.userId, m])), [members]);
  const selected = value.map((id) => byId.get(id)).filter(Boolean) as CompanyMember[];
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return <div className="mt-2 space-y-2">
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" role="combobox" aria-expanded={open} aria-label={`${label}: ${value.length} selected. Open to search people`} disabled={disabled || loading} className="w-full justify-between font-normal">
          <span className="truncate text-left">{loading ? "Loading people…" : value.length ? `${value.length} selected` : "Search people by name or email"}</span>
          {loading ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[18rem] p-0" align="start">
        <Command filter={(itemValue, search) => (itemValue.toLowerCase().includes(search.trim().toLowerCase()) ? 1 : 0)}>
          <CommandInput placeholder="Search by name or email…" aria-label={`Search ${label.toLowerCase()}`} />
          <CommandList>
            <CommandEmpty>{members.length === 0 ? "No eligible people in this workspace." : "No one matches your search."}</CommandEmpty>
            <CommandGroup>
              {members.map((m) => {
                const isSelected = value.includes(m.userId);
                return <CommandItem key={m.userId} value={`${memberName(m)} ${m.user?.email || ""} ${m.userId}`} onSelect={() => toggle(m.userId)} aria-label={memberLabel(m, meId)} aria-selected={isSelected} className="gap-2">
                  <span aria-hidden className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold">{memberInitials(m)}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{m.userId === meId ? "Me — " : ""}{memberName(m)}</span><span className="block max-w-full truncate text-xs text-muted-foreground" title={m.user?.email}>{m.user?.email}</span></span>
                  {isSelected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
                </CommandItem>;
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
    <div className="flex flex-wrap items-center gap-2" aria-live="polite">
      {selected.map((m) => <Badge key={m.userId} variant="secondary" className="max-w-full gap-1 py-1 pl-2 pr-1">
        <span className="truncate" title={memberLabel(m, meId)}>{m.userId === meId ? "Me — " : ""}{memberName(m)}{m.user?.email ? <span className="ml-1 hidden text-muted-foreground sm:inline">({m.user.email})</span> : null}</span>
        <button type="button" onClick={() => toggle(m.userId)} aria-label={`Remove ${memberLabel(m, meId)}`} className="rounded-full p-0.5 hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="h-3 w-3" aria-hidden /></button>
      </Badge>)}
      {value.length > 0 && <>
        <span className="text-xs text-muted-foreground" data-testid="assignee-count">{value.length} selected</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => onChange([])}>Clear all</Button>
      </>}
    </div>
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
