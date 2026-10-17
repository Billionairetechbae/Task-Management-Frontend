import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CheckSquare2, Loader2, Search, Settings, X } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";

type Result = { type: string; title: string; subtitle: string; href: string; icon: typeof CheckSquare2 };

export default function GlobalSearch() {
  const navigate = useNavigate();
  const { workspaceRole } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [taskResults, setTaskResults] = useState<Result[]>([]);
  const [projectResults, setProjectResults] = useState<Result[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query.trim()), 250);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const onShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault(); setOpen(true); requestAnimationFrame(() => inputRef.current?.focus());
      }
    };
    window.addEventListener("keydown", onShortcut);
    return () => window.removeEventListener("keydown", onShortcut);
  }, []);

  useEffect(() => {
    if (debounced.length < 2) { setTaskResults([]); setProjectResults([]); setLoading(false); return; }
    let current = true;
    setLoading(true);
    Promise.allSettled([
      api.getTasks({ q: debounced, limit: 8, page: 1 }),
      api.getProjects({ search: debounced }),
    ]).then(([tasks, projects]) => {
      if (!current) return;
      setTaskResults(tasks.status === "fulfilled" ? (tasks.value.data?.tasks ?? []).slice(0, 8).map((task) => ({
        type: "Task", title: task.title || "Untitled task", subtitle: [task.status?.replaceAll("_", " "), task.project?.name, task.team?.name].filter(Boolean).join(" · "), href: `/task-details/${task.id}`, icon: CheckSquare2,
      })) : []);
      const projectData = projects.status === "fulfilled" ? (projects.value.data as any)?.projects ?? [] : [];
      setProjectResults(projectData.slice(0, 8).map((project: any) => ({ type: "Project", title: project.name, subtitle: project.team?.name || "Workspace project", href: `/projects/${project.id}`, icon: Building2 })));
      setLoading(false);
    });
    return () => { current = false; };
  }, [debounced]);

  const settings: Result[] = useMemo(() => {
    const pages: Result[] = [
      { type: "Settings", title: "Integrations", subtitle: "Google, Dropbox and connected services", href: "/settings/integrations", icon: Settings },
    ];
    if (["owner", "admin", "manager"].includes(String(workspaceRole))) {
      pages.push({ type: "Settings", title: "Workspace customization", subtitle: "Custom fields and workspace preferences", href: "/settings/workspace/customization", icon: Settings });
    }
    if (["owner", "admin"].includes(String(workspaceRole))) pages.push({ type: "Settings", title: "Company profile", subtitle: "Workspace details and logo", href: "/company-profile", icon: Settings });
    return pages.filter((result) => `${result.title} ${result.subtitle}`.toLowerCase().includes(debounced.toLowerCase()));
  }, [debounced, workspaceRole]);

  const results = [...taskResults, ...projectResults, ...settings];
  const navigateResult = (result: Result) => { navigate(result.href); setOpen(false); setQuery(""); };
  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") { setOpen(false); inputRef.current?.blur(); }
    if (event.key === "ArrowDown") { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, results.length - 1)); }
    if (event.key === "ArrowUp") { event.preventDefault(); setActiveIndex((index) => Math.max(0, index - 1)); }
    if (event.key === "Enter" && results[activeIndex]) { event.preventDefault(); navigateResult(results[activeIndex]); }
  };

  return <div className="relative hidden w-full max-w-[34rem] flex-1 lg:block">
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input ref={inputRef} value={query} onFocus={() => setOpen(true)} onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); setOpen(true); }} onKeyDown={onKeyDown} aria-label="Search Admiino" aria-expanded={open} aria-controls="global-search-results" placeholder="Search tasks, projects, settings…" className="h-9 rounded-xl border-border/80 bg-muted/35 pl-9 pr-16 transition-all focus-visible:bg-background focus-visible:shadow-sm" />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 rounded border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">⌘ K</kbd>
    </div>
    {open && <>
      <button type="button" aria-label="Close search results" className="fixed inset-0 z-30 cursor-default" onClick={() => setOpen(false)} />
      <div id="global-search-results" role="listbox" aria-label="Search results" className="absolute left-0 right-0 top-11 z-40 max-h-[min(70vh,34rem)] overflow-y-auto rounded-xl border bg-popover p-2 shadow-xl">
        {query.trim().length < 2 ? <p className="px-3 py-5 text-center text-sm text-muted-foreground">Type at least two characters to search this workspace.</p>
          : loading ? <div className="space-y-2 p-3" aria-label="Searching"><div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Searching this workspace…</div>{[1, 2, 3].map((item) => <div key={item} className="h-9 animate-pulse rounded bg-muted" />)}</div>
          : results.length === 0 ? <p className="px-3 py-6 text-center text-sm text-muted-foreground">No matching tasks, projects or settings.</p>
          : <div className="space-y-2">{[["Tasks", taskResults], ["Projects", projectResults], ["Settings", settings]].filter(([, group]) => (group as Result[]).length > 0).map(([label, group]) => <section key={label as string}><h2 className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label as string}</h2>{(group as Result[]).map((result) => {
            const index = results.indexOf(result); const Icon = result.icon;
            return <button key={`${result.type}-${result.href}`} type="button" role="option" aria-selected={activeIndex === index} onMouseEnter={() => setActiveIndex(index)} onClick={() => navigateResult(result)} className={`flex w-full items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${activeIndex === index ? "bg-accent" : "hover:bg-muted/70"}`}><Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{result.title}</span><span className="block truncate text-xs capitalize text-muted-foreground">{result.subtitle}</span></span></button>;
          })}</section>)}</div>}
        <div className="mt-1 flex justify-between border-t px-2 pt-2 text-[10px] text-muted-foreground"><span>↑ ↓ to navigate · Enter to open</span><button type="button" onClick={() => setOpen(false)} className="inline-flex items-center gap-1 hover:text-foreground"><X className="h-3 w-3" />Close</button></div>
      </div>
    </>}
  </div>;
}
