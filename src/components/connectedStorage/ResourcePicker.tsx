import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, FolderKanban, ListChecks, Loader2, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PickerProject { id: string; name: string }
export interface PickerTask { id: string; title: string; projectId?: string | null; projectName?: string | null }
export type PickerTarget = { type: "task" | "project"; id: string };

/** Most rows ever rendered at once. Longer lists ask the user to refine the search instead of rendering everything. */
export const PICKER_RENDER_LIMIT = 50;
const NO_PROJECT = "__none__";

interface Props {
  projects: PickerProject[];
  tasks: PickerTask[];
  value: PickerTarget | null;
  onChange: (target: PickerTarget | null) => void;
  /** Tasks are fetched server-side (bounded, authorized); the picker reports what the user is looking for. */
  onTaskQuery?: (query: { q: string; projectId: string | null }) => void;
  tasksLoading?: boolean;
  loading?: boolean;
  /** Label of the currently selected resource (the lists may no longer contain it after a search). */
  selectedLabel?: string | null;
}

/**
 * Searchable, keyboard-operable destination picker for "Attach Dropbox file to…".
 * Projects tab: search, choose. Tasks tab: optionally narrow by project first (or "No project"), search, choose.
 */
export function ResourcePicker({ projects, tasks, value, onChange, onTaskQuery, tasksLoading, loading, selectedLabel }: Props) {
  const uid = useId();
  const [tab, setTab] = useState<"project" | "task">(value?.type ?? "project");
  const [query, setQuery] = useState("");
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);

  const projectName = useMemo(() => new Map(projects.map((p) => [p.id, p.name])), [projects]);

  useEffect(() => {
    if (tab !== "task" || !onTaskQuery) return;
    const timer = window.setTimeout(() => onTaskQuery({ q: query.trim(), projectId: projectFilter && projectFilter !== NO_PROJECT ? projectFilter : null }), 300);
    return () => window.clearTimeout(timer);
  }, [tab, query, projectFilter, onTaskQuery]);

  const items = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    if (tab === "project") return projects.filter((p) => !q || p.name.toLocaleLowerCase().includes(q)).map((p) => ({ key: `project:${p.id}`, type: "project" as const, id: p.id, label: p.name || "Untitled project", context: null as string | null }));
    return tasks
      .filter((t) => (!projectFilter ? true : projectFilter === NO_PROJECT ? !t.projectId : t.projectId === projectFilter))
      .filter((t) => !q || (t.title || "").toLocaleLowerCase().includes(q))
      .map((t) => ({ key: `task:${t.id}`, type: "task" as const, id: t.id, label: t.title || "Untitled task", context: t.projectName || (t.projectId ? projectName.get(t.projectId) ?? null : null) }));
  }, [tab, query, projects, tasks, projectFilter, projectName]);

  const shown = items.slice(0, PICKER_RENDER_LIMIT);
  useEffect(() => { setActive(0); }, [tab, query, projectFilter]);
  useEffect(() => { listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView?.({ block: "nearest" }); }, [active]);

  const choose = (index: number) => { const item = shown[index]; if (item) onChange({ type: item.type, id: item.id }); };
  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") { event.preventDefault(); setActive((i) => Math.min(i + 1, shown.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActive((i) => Math.max(i - 1, 0)); }
    else if (event.key === "Home") { event.preventDefault(); setActive(0); }
    else if (event.key === "End") { event.preventDefault(); setActive(Math.max(shown.length - 1, 0)); }
    else if (event.key === "Enter") { event.preventDefault(); choose(active); }
    else if (event.key === "Escape" && query) { event.preventDefault(); setQuery(""); }
  };

  const busy = loading || (tab === "task" && tasksLoading);
  const listId = `${uid}-list`;

  return (
    <div className="space-y-3" data-testid="resource-picker">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${uid}-label`} className="text-sm font-medium">Attach Dropbox file to</p>
        {value && (
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-primary/5 px-2.5 py-1 text-xs" data-testid="picker-selection">
            {value.type === "project" ? <FolderKanban className="h-3.5 w-3.5 shrink-0" /> : <ListChecks className="h-3.5 w-3.5 shrink-0" />}
            <span className="truncate" title={selectedLabel || undefined}>{selectedLabel || (value.type === "project" ? "Selected project" : "Selected task")}</span>
            <button type="button" aria-label="Clear selection" onClick={() => onChange(null)} className="rounded-full p-0.5 hover:bg-muted"><X className="h-3 w-3" /></button>
          </span>
        )}
      </div>

      <div role="tablist" aria-labelledby={`${uid}-label`} className="inline-flex rounded-lg border p-0.5 text-sm">
        {([["project", "Projects", projects.length], ["task", "Tasks", null]] as const).map(([key, label, count]) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => { setTab(key); setQuery(""); }} className={cn("rounded-md px-3 py-1.5 font-medium", tab === key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>
            {label}{count !== null && <span className="ml-1.5 text-xs opacity-80">{count}</span>}
          </button>
        ))}
      </div>

      {tab === "task" && (
        <label className="block space-y-1 text-xs font-medium">Project
          <select aria-label="Filter tasks by project" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)} className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm font-normal">
            <option value="">All projects</option>
            <option value={NO_PROJECT}>No project</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </label>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          role="combobox" aria-expanded="true" aria-controls={listId} aria-autocomplete="list" aria-activedescendant={shown[active] ? `${uid}-opt-${active}` : undefined}
          aria-label={tab === "project" ? "Search projects" : "Search tasks"} placeholder={tab === "project" ? "Search projects…" : "Search tasks…"}
          value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={onKeyDown}
          className="h-10 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm"
        />
        {busy && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Loading" />}
      </div>

      <ul id={listId} ref={listRef} role="listbox" aria-label={tab === "project" ? "Projects" : "Tasks"} className="max-h-[min(50vh,22rem)] overflow-auto rounded-lg border divide-y">
        {shown.map((item, index) => {
          const selected = value?.type === item.type && value.id === item.id;
          return (
            <li key={item.key} id={`${uid}-opt-${index}`} data-index={index} role="option" aria-selected={selected} aria-label={item.context ? `${item.label}, project ${item.context}` : item.label}
              onClick={() => choose(index)} onMouseMove={() => setActive(index)}
              className={cn("flex cursor-pointer items-center gap-2 px-3 py-2.5 text-sm", index === active && "bg-muted/60", selected && "bg-primary/10")}>
              {selected ? <Check className="h-4 w-4 shrink-0 text-primary" /> : item.type === "project" ? <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ListChecks className="h-4 w-4 shrink-0 text-muted-foreground" />}
              <span className="min-w-0 flex-1">
                <span className="block truncate" title={item.label}>{item.label}</span>
                {item.context && <span className="block truncate text-xs text-muted-foreground" title={item.context}>{item.context}</span>}
              </span>
            </li>
          );
        })}
        {!shown.length && (
          <li role="presentation" className="px-3 py-8 text-center text-sm text-muted-foreground">
            {busy ? "Loading…" : query || projectFilter ? `No ${tab === "project" ? "projects" : "tasks"} match your search.` : `No ${tab === "project" ? "projects" : "tasks"} available to you.`}
          </li>
        )}
      </ul>
      {items.length > shown.length && <p className="text-xs text-muted-foreground" role="status">Showing {shown.length} of {items.length}. Type to narrow the list.</p>}
    </div>
  );
}
