import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BookTemplate, CheckSquare2, FileText, FolderKanban, Loader2, Search, Users, X, type LucideIcon } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceSettings } from "@/hooks/useWorkspaceSettings";
import { Input } from "@/components/ui/input";
import { getSearchNavigation } from "@/components/dashboard/searchNavigation";

type Result = { id: string; title: string; subtitle: string; href: string; icon?: LucideIcon };
type Groups = Record<string, Result[]>;
const GROUP_ORDER = ["Tasks", "Projects", "Subtasks", "Teams", "People", "Templates", "Files", "Navigation", "Settings"];
const ICONS: Record<string, typeof CheckSquare2> = { Tasks: CheckSquare2, Projects: FolderKanban, Subtasks: CheckSquare2, Teams: Users, People: Users, Templates: BookTemplate, Files: FileText, Navigation: Search, Settings: Search };
const GROUP_KEYS: Record<string, string> = { tasks: "Tasks", projects: "Projects", subtasks: "Subtasks", teams: "Teams", people: "People", templates: "Templates", files: "Files" };
function normalizeGroups(raw: Record<string, Result[]>): Groups {
  return Object.fromEntries(Object.entries(raw).map(([key, value]) => [GROUP_KEYS[key] || key, value]));
}

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { workspaceRole, activeCompanyId } = useAuth();
  const { canPerformRoleOperation } = useWorkspaceSettings();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultCache = useRef(new Map<string, Groups>());
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [resultKey, setResultKey] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [backendGroups, setBackendGroups] = useState<Groups>({});
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query.trim()), 220); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); } };
    window.addEventListener("keydown", onShortcut); return () => window.removeEventListener("keydown", onShortcut);
  }, []);
  useEffect(() => {
    const normalized = debounced.trim();
    if (normalized.length < 2 || !activeCompanyId) { setBackendGroups({}); setResultKey(""); setLoading(false); setSearchError(false); return; }
    const key = `${activeCompanyId}:${normalized.toLocaleLowerCase()}`;
    const cached = resultCache.current.get(key);
    if (cached) { setBackendGroups(cached); setResultKey(key); setLoading(false); setSearchError(false); return; }
    const controller = new AbortController();
    setLoading(true);
    setSearchError(false);
    setResultKey("");
    api.globalSearch(normalized, activeCompanyId, controller.signal).then((response) => {
      if (controller.signal.aborted) return;
      const groups = normalizeGroups(response.data?.groups || {});
      resultCache.current.set(key, groups);
      if (resultCache.current.size > 40) resultCache.current.delete(resultCache.current.keys().next().value!);
      setBackendGroups(groups); setResultKey(key);
    }).catch(() => { if (!controller.signal.aborted) { setBackendGroups({}); setResultKey(key); setSearchError(true); } }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [debounced, activeCompanyId]);

  const normalizedQuery = query.trim();
  const navigation = useMemo(() => getSearchNavigation(normalizedQuery, workspaceRole, canPerformRoleOperation), [normalizedQuery, workspaceRole, canPerformRoleOperation]);
  const currentKey = `${activeCompanyId || ""}:${debounced.trim().toLocaleLowerCase()}`;
  const currentBackendGroups = resultKey === currentKey ? backendGroups : {};
  const visibleGroups = useMemo(() => {
    const next: Groups = {};
    for (const group of GROUP_ORDER.slice(0, 7)) {
      const items = (currentBackendGroups[group] || []).slice(0, 8);
      if (items.length) next[group] = items;
    }
    for (const category of ["Navigation", "Settings"]) {
      const items = (navigation[category] || []).map(({ id, title, subtitle, href, icon }) => ({ id, title, subtitle, href, icon }));
      if (items.length) next[category] = items;
    }
    return next;
  }, [currentBackendGroups, navigation]);
  const results = GROUP_ORDER.flatMap((group) => visibleGroups[group] || []);
  useEffect(() => { setActiveIndex((index) => Math.min(index, Math.max(0, results.length - 1))); }, [results.length, normalizedQuery]);
  useEffect(() => { document.querySelector<HTMLElement>('[data-search-selected="true"]')?.scrollIntoView({ block: "nearest" }); }, [activeIndex]);
  const navigateResult = (result: Result) => { navigate(result.href); setOpen(false); setQuery(""); setBackendGroups({}); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, Math.max(0, results.length - 1))); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
    if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); navigateResult(results[activeIndex]); }
  };
  const querySettled = normalizedQuery.length < 2 || !activeCompanyId || (debounced === normalizedQuery && resultKey === currentKey);
  const showLoading = normalizedQuery.length >= 2 && (!querySettled || loading);

  return <div className="relative flex min-w-0 flex-1 items-center justify-center lg:mx-5">
    <div className="relative hidden w-full max-w-[900px] lg:block">
      <div className="relative"><Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={inputRef} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }} onKeyDown={onKeyDown} aria-label="Search Admiino" aria-expanded={open} aria-controls="global-search-results" placeholder="Search tasks, projects, people or jump to…" className="h-10 rounded-xl border-border/80 bg-muted/30 pl-10 pr-16 shadow-sm transition-all focus-visible:bg-background focus-visible:shadow-md" /><kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘ K</kbd></div>
      {open && <>
        <button type="button" aria-label="Close search results" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
        <SearchSurface groups={visibleGroups} results={results} activeIndex={activeIndex} onSelect={navigateResult} onHover={setActiveIndex} loading={showLoading} query={normalizedQuery} hasWorkspace={!!activeCompanyId} searchError={searchError} />
      </>}
    </div>
    <button type="button" aria-label="Open global search" onClick={() => { setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"><Search className="h-4 w-4" /></button>
    {open && <div className="fixed inset-0 z-[70] bg-background/70 p-2 backdrop-blur-sm lg:hidden" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <div className="relative mx-auto mt-2 w-full max-w-2xl rounded-2xl border bg-popover p-2 shadow-2xl">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input ref={inputRef} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }} onKeyDown={onKeyDown} aria-label="Search Admiino" autoFocus className="h-11 border-0 bg-transparent pl-9 pr-10 focus-visible:ring-0" placeholder="Search Admiino…" /><button aria-label="Close search" onClick={() => setOpen(false)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-muted-foreground hover:bg-muted"><X className="h-4 w-4" /></button></div>
        <SearchSurface groups={visibleGroups} results={results} activeIndex={activeIndex} onSelect={navigateResult} onHover={setActiveIndex} loading={showLoading} query={normalizedQuery} hasWorkspace={!!activeCompanyId} searchError={searchError} />
      </div>
    </div>}
  </div>;
}

function SearchSurface({ groups, results, activeIndex, onSelect, onHover, loading, query, hasWorkspace, searchError }: { groups: Groups; results: Result[]; activeIndex: number; onSelect: (result: Result) => void; onHover: (index: number) => void; loading: boolean; query: string; hasWorkspace: boolean; searchError: boolean }) {
  let offset = 0;
  const highlight = (title: string) => {
    const at = title.toLocaleLowerCase().indexOf(query.toLocaleLowerCase());
    if (at < 0 || !query) return title;
    return <>{title.slice(0, at)}<mark className="rounded bg-primary/15 text-inherit">{title.slice(at, at + query.length)}</mark>{title.slice(at + query.length)}</>;
  };
  return <div id="global-search-results" role="listbox" aria-label="Search results" className="relative z-40 max-h-[min(65vh,38rem)] w-full overflow-y-auto rounded-xl border bg-popover p-2 shadow-xl lg:absolute lg:left-1/2 lg:top-12 lg:max-h-[min(72vh,42rem)] lg:w-[min(940px,calc(100vw-320px))] lg:-translate-x-1/2 lg:rounded-2xl lg:p-3 lg:shadow-2xl">
    {query.length < 2 ? <div className="px-4 py-5 text-sm text-muted-foreground"><p>Search this workspace or jump to a page.</p><p className="mt-2 text-xs">Try calendar, drive, custom fields, project health, or a task name.</p></div> : <>
      <div className="border-b px-3 pb-2 pt-1 text-xs text-muted-foreground">Results for <span className="font-medium text-foreground">“{query}”</span></div>
      {Object.keys(groups).length === 0 && loading && <div className="space-y-2 p-3" aria-label="Searching"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching this workspace…</div>{[1, 2, 3].map((item) => <div key={item} className="h-11 animate-pulse rounded-lg bg-muted" />)}</div>}
      {Object.entries(groups).map(([group, items]) => { const base = offset; offset += items.length; return <section key={group} className="py-1.5"><h2 className="px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-muted-foreground">{group}</h2><div className="space-y-0.5">{items.map((result, itemIndex) => { const index = base + itemIndex; const Icon = result.icon || ICONS[group] || Search; return <button key={`${group}-${result.id}`} type="button" role="option" data-search-selected={activeIndex === index ? "true" : undefined} aria-selected={activeIndex === index} onMouseEnter={() => onHover(index)} onClick={() => onSelect(result)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${activeIndex === index ? "bg-accent" : "hover:bg-muted/70"}`}><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{highlight(result.title)}</span><span className="block truncate text-xs text-muted-foreground">{result.subtitle}</span></span><span className="hidden text-[10px] text-muted-foreground sm:block">{group}</span></button>; })}</div></section>; })}
      {Object.keys(groups).length === 0 && !loading && query.length >= 2 && <p className="px-4 py-5 text-center text-sm text-muted-foreground">{!hasWorkspace ? "Select a workspace to search its items." : searchError ? "Search is temporarily unavailable. Try again." : "No matching results in this workspace."}</p>}
      {Object.keys(groups).length > 0 && loading && <div className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" />Searching workspace items…</div>}
    </>}
    <div className="sticky bottom-0 flex justify-between border-t bg-popover/95 px-3 py-2 text-[10px] text-muted-foreground"><span>↑ ↓ Navigate · Enter Open · Esc Close</span><span>Admiino Search</span></div>
  </div>;
}
