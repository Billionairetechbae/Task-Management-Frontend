import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addDays,
    addMonths,
    addWeeks,
    subDays,
    subMonths,
    subWeeks,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    startOfDay,
    endOfDay,
    format,
} from "date-fns";
import { Search } from "lucide-react";

import CalendarToolbar from "../components/calendar/CalendarToolbar";
import CalendarSidebar from "../components/calendar/CalendarSidebar";
import CalendarFilters from "../components/calendar/CalendarFilters";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import DayView from "../components/calendar/DayView";
import ConfirmWorkspaceSwitchDialog from "../components/calendar/ConfirmWorkspaceSwitchDialog";
import { useToast } from "@/hooks/use-toast";
import WorkspacePickerDialog from "../components/calendar/WorkspacePickerDialog";
import CalendarAnchoredPopover from "../components/calendar/CalendarAnchoredPopover";
import { CalendarEventPopoverBody } from "../components/calendar/CalendarEventPopover";
import { CalendarSlotPopoverBody } from "../components/calendar/CalendarSlotPopover";
import { DEFAULT_DUE_HOUR, toDeadlineInputValue, type AnchorRect, type CalendarSlot } from "../components/calendar/calendarAnchor";
import CreateTaskDialog from "../components/CreateTaskDialog";

import calendarService from "../services/calendarService";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { isTaskOverdue, matchesCalendarSearch, resolveCalendarTaskPath, toCalendarEvents } from "../lib/calendarStatus";
import type { CalendarFilters as SharedCalendarFilters } from "../types/calendar";
import type { CalendarEvent } from "../types/calendar";
import DashboardLayout from "../components/dashboard/DashboardLayout";

export type CalendarView = "month" | "week" | "day";

export const CALENDAR_QUERY_KEY = "calendar-events";

const NO_EVENTS: CalendarEvent[] = [];
const NO_OPTIONS: { id: string; name: string }[] = [];

export default function CalendarPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { activeCompanyId, setActiveCompanyId } = useAuth();
    const { toast } = useToast();
    const [view, setView] = useState<CalendarView>("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [createTaskOpen, setCreateTaskOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState("");
    const [selected, setSelected] = useState<{ event: CalendarEvent; anchor: AnchorRect } | null>(null);
    const [slot, setSlot] = useState<CalendarSlot | null>(null);
    const [initialDeadline, setInitialDeadline] = useState<string | undefined>(undefined);

    const [filters, setFilters] = useState<
        Required<Pick<SharedCalendarFilters, "scope" | "priority" | "status" | "projectId" | "teamId" | "workspaceId">>
    >({
        // Personal calendar: my tasks (created or assigned) across all workspaces.
        scope: "my",
        workspaceId: "",
        priority: "",
        status: "",
        projectId: "",
        teamId: "",
    });

    const range = useMemo(() => {
        switch (view) {
            case "week":
                return {
                    start: startOfWeek(currentDate),
                    end: endOfWeek(currentDate),
                };
            case "day":
                return {
                    start: startOfDay(currentDate),
                    end: endOfDay(currentDate),
                };
            case "month":
            default:
                return {
                    start: startOfMonth(currentDate),
                    end: endOfMonth(currentDate),
                };
        }
    }, [currentDate, view]);

    // The calendar is personal and cross-workspace, so the globally active workspace is deliberately NOT part
    // of the key: switching workspace neither refetches nor re-labels it.  The Workspace *filter* is.
    // staleTime 0 => cached data renders instantly but is always revalidated on mount/focus.
    const { data: calendarData, isFetching, isError } = useQuery({
        queryKey: [
            CALENDAR_QUERY_KEY,
            range.start.toISOString(),
            range.end.toISOString(),
            filters.scope,
            filters.workspaceId,
            filters.priority,
            filters.status,
            filters.projectId,
            filters.teamId,
        ],
        queryFn: async () => {
            const response = await calendarService.getEvents({
                start: range.start,
                end: range.end,
                ...filters,
            });
            return { events: response.events || [], workspaces: response.workspaces || [] };
        },
        staleTime: 0,
    });
    const rawEvents = calendarData?.events ?? NO_EVENTS;
    const loading = isFetching && !calendarData;

    // The server returns every workspace the user belongs to regardless of the filter; remember the last list
    // so the Workspace dropdown does not blink empty while a new filter loads.
    const workspacesRef = useRef<{ id: string; name: string }[]>([]);
    if (calendarData?.workspaces?.length) workspacesRef.current = calendarData.workspaces;
    const workspaces = workspacesRef.current;

    // Project / team options for the workspace(s) being shown.  IDs are never assumed to belong to the active
    // workspace: each workspace is queried explicitly, and names are qualified when several are mixed.
    const optionTargets = filters.workspaceId ? workspaces.filter((w) => w.id === filters.workspaceId) : workspaces;
    const { data: filterOptions } = useQuery({
        queryKey: ["calendar-filter-options", optionTargets.map((w) => w.id).join(",")],
        queryFn: async () => {
            const targets: { id?: string; name: string }[] = optionTargets.length ? optionTargets : [{ id: undefined, name: "" }];
            const qualify = targets.length > 1;
            const label = (name: string, ws: string) => (qualify && ws ? `${name} · ${ws}` : name);
            const perWorkspace = await Promise.all(targets.map(async (w) => {
                const [projectRes, teamRes]: any[] = await Promise.all([
                    api.getProjects(w.id ? { workspaceId: w.id } : undefined).catch(() => null),
                    api.listTeams(w.id).catch(() => null),
                ]);
                const list = projectRes?.data?.projects ?? projectRes?.data?.items ?? (Array.isArray(projectRes?.data) ? projectRes.data : []);
                return {
                    projects: (list as any[]).map((p) => ({ id: p.id, name: label(p.name, w.name) })),
                    teams: ((teamRes?.data?.teams ?? []) as any[]).map((t) => ({ id: t.id, name: label(t.name, w.name) })),
                };
            }));
            return { projects: perWorkspace.flatMap((r) => r.projects), teams: perWorkspace.flatMap((r) => r.teams) };
        },
        staleTime: 60_000,
    });
    const projects = filterOptions?.projects ?? NO_OPTIONS;
    const teams = filterOptions?.teams ?? NO_OPTIONS;

    const heading = useMemo(() => {
        if (view === "month") return format(currentDate, "MMMM yyyy");
        if (view === "day") return format(currentDate, "EEEE, MMMM d, yyyy");
        return `${format(startOfWeek(currentDate), "MMM d")} – ${format(endOfWeek(currentDate), "MMM d, yyyy")}`;
    }, [currentDate, view]);

    const allEvents = useMemo(() => toCalendarEvents(rawEvents), [rawEvents]);
    const events = useMemo(
        () => allEvents.filter((e) => matchesCalendarSearch(e, search)),
        [allEvents, search]
    );

    const handlePrevious = () => {
        switch (view) {
            case "month":
                setCurrentDate(prev => subMonths(prev, 1));
                break;
            case "week":
                setCurrentDate(prev => subWeeks(prev, 1));
                break;
            case "day":
                setCurrentDate(prev => subDays(prev, 1));
                break;
        }
    };

    const handleNext = () => {
        switch (view) {
            case "month":
                setCurrentDate(prev => addMonths(prev, 1));
                break;
            case "week":
                setCurrentDate(prev => addWeeks(prev, 1));
                break;
            case "day":
                setCurrentDate(prev => addDays(prev, 1));
                break;
        }
    };

    const handleToday = () => {
        setCurrentDate(new Date());
    };

    const handleEventClick = (event: CalendarEvent, anchor: AnchorRect) => { setSlot(null); setSelected({ event, anchor }); };
    const handleSlotClick = (next: CalendarSlot) => { setSelected(null); setSlot(next); };
    const openSelectedTask = () => {
        if (!selected) return;
        const { event } = selected;
        setSelected(null);
        navigate(resolveCalendarTaskPath({ ...(event.task ?? {}), id: event.taskId ?? event.task?.id }));
    };
    // Task creation reuses the existing dialog, which always creates in the globally ACTIVE workspace.
    // So the destination is made explicit first: the workspace filter, a sole membership, or a picker.
    // Only the user's explicit choice ever changes the active workspace.
    const [pickerOpen, setPickerOpen] = useState(false);
    const [pickerDeadline, setPickerDeadline] = useState<string | undefined>(undefined);
    const [awaitingWorkspace, setAwaitingWorkspace] = useState<string | null>(null);

    const [confirmSwitch, setConfirmSwitch] = useState<string | null>(null);
    const SWITCH_TIMEOUT_MS = 3000;

    const failSwitch = (previous: string | null) => {
        setAwaitingWorkspace(null);
        // Leave the workspace as it was where possible.
        if (previous && previous !== activeCompanyId) { try { setActiveCompanyId(previous); } catch { /* nothing more to do */ } }
        toast({ title: "Couldn't switch workspace", description: "The task form was not opened. Your current workspace is unchanged.", variant: "destructive" });
    };

    // Same workspace: open directly.  Different workspace: nothing changes until the user confirms.
    const beginCreate = (workspaceId: string | null, deadline?: string) => {
        setInitialDeadline(deadline);
        if (!workspaceId || workspaceId === activeCompanyId) { setCreateTaskOpen(true); return; }
        setConfirmSwitch(workspaceId);
    };
    const continueSwitch = () => {
        const target = confirmSwitch;
        const previous = activeCompanyId;
        setConfirmSwitch(null);
        if (!target) return;
        if (!workspaces.some((w) => w.id === target)) return failSwitch(previous);
        setAwaitingWorkspace(target);
        try { setActiveCompanyId(target); } catch { failSwitch(previous); }
    };
    // The dialog opens only once the switch has actually taken effect (and never if it does not within a few seconds).
    useEffect(() => {
        if (!awaitingWorkspace) return;
        if (activeCompanyId === awaitingWorkspace) { setAwaitingWorkspace(null); setCreateTaskOpen(true); return; }
        const previous = activeCompanyId;
        const t = window.setTimeout(() => failSwitch(previous), SWITCH_TIMEOUT_MS);
        return () => window.clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [awaitingWorkspace, activeCompanyId]);

    const requestCreate = (deadline?: string) => {
        if (filters.workspaceId) return beginCreate(filters.workspaceId, deadline);
        if (workspaces.length <= 1) return beginCreate(workspaces[0]?.id ?? null, deadline);
        setPickerDeadline(deadline);
        setPickerOpen(true);
    };
    const createOnSelectedDate = () => {
        if (!slot) return;
        const due = new Date(slot.start);
        if (!slot.hasTime) due.setHours(DEFAULT_DUE_HOUR, 0, 0, 0);
        setSlot(null);
        requestCreate(toDeadlineInputValue(due));
    };
    const openBlankCreateTask = () => requestCreate(undefined);

    const handleTaskCreated = () => {
        queryClient.invalidateQueries({ queryKey: [CALENDAR_QUERY_KEY] });
    };

    return (
      <DashboardLayout hidePadding fullWidth>
        <div className="flex h-[calc(100dvh-3.5rem)] min-h-0 bg-gradient-to-br from-gray-50 to-gray-100/50">
            {/* Sidebar */}
            <CalendarSidebar
                view={view}
                onViewChange={setView}
                onCreateTask={openBlankCreateTask}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                // Intentional: the summary is derived from the events currently shown, i.e. the visible date range plus
                // every active Calendar filter and the search box (not a separate workspace-wide query).
                stats={{
                    total: events.length,
                    overdue: events.filter(e => isTaskOverdue({ status: e.status, deadline: e.task?.deadline ?? e.start })).length,
                    today: events.filter(e => new Date(e.start).toDateString() === new Date().toDateString()).length,
                    completed: events.filter(e => e.status === 'completed').length,
                }}
            />

            {/* Main Content */}
            <div className="flex flex-1 flex-col overflow-hidden">
                <CalendarToolbar
                    view={view}
                    setView={setView}
                    currentDate={currentDate}
                    heading={heading}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onToday={handleToday}
                    onCreateTask={openBlankCreateTask}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    showFilters={showFilters}
                />

                <div className="px-3 pt-3 sm:px-6 sm:pt-4">
                    <label className="relative block max-w-md">
                        <span className="sr-only">Search calendar tasks</span>
                        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search title, project, team, assignee or status..."
                            className="w-full rounded-lg border border-gray-300/60 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </label>
                    {isError && (
                        <p role="alert" className="mt-2 text-sm text-red-600">Could not load calendar tasks. Please try again.</p>
                    )}
                </div>

                {showFilters && (
                    <div className="px-3 pt-3 sm:px-6 sm:pt-4 animate-in slide-in-from-top-2 duration-200">
                        <CalendarFilters
                            filters={filters}
                            workspaces={workspaces}
                            projects={projects}
                            teams={teams}
                            onChange={setFilters}
                            onClose={() => setShowFilters(false)}
                        />
                    </div>
                )}

                <div className="flex-1 overflow-auto p-3 pt-3 sm:p-6 sm:pt-4">
                    <div className="h-full rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm border border-white/50 overflow-hidden">
                        {view === "month" && (
                            <MonthView
                                currentDate={currentDate}
                                events={events}
                                loading={loading}
                                onNavigate={setCurrentDate}
                                onSelectEvent={handleEventClick}
                                onSelectSlot={handleSlotClick}
                            />
                        )}

                        {view === "week" && (
                            <WeekView
                                currentDate={currentDate}
                                events={events}
                                loading={loading}
                                onSelectEvent={handleEventClick}
                                onSelectSlot={handleSlotClick}
                            />
                        )}

                        {view === "day" && (
                            <DayView
                                currentDate={currentDate}
                                events={events}
                                loading={loading}
                                onSelectEvent={handleEventClick}
                                onSelectSlot={handleSlotClick}
                            />
                        )}
                    </div>
                </div>
            </div>

            <CreateTaskDialog
                key={initialDeadline ?? "blank"}
                open={createTaskOpen}
                onOpenChange={setCreateTaskOpen}
                onSuccess={handleTaskCreated}
                initialDeadline={initialDeadline}
            />
            <ConfirmWorkspaceSwitchDialog
                workspaceName={confirmSwitch ? workspaces.find((w) => w.id === confirmSwitch)?.name ?? "this workspace" : null}
                onCancel={() => setConfirmSwitch(null)}
                onContinue={continueSwitch}
            />
            <WorkspacePickerDialog
                open={pickerOpen}
                workspaces={workspaces}
                onOpenChange={setPickerOpen}
                onConfirm={(id) => { setPickerOpen(false); beginCreate(id, pickerDeadline); }}
            />
            <CalendarAnchoredPopover anchor={selected?.anchor ?? null} onClose={() => setSelected(null)} label="Calendar task details">
                {selected && <CalendarEventPopoverBody event={selected.event} onOpen={openSelectedTask} />}
            </CalendarAnchoredPopover>
            <CalendarAnchoredPopover anchor={slot?.anchor ?? null} onClose={() => setSlot(null)} label="Create task on this date" className="w-64">
                {slot && <CalendarSlotPopoverBody start={slot.start} hasTime={slot.hasTime} onCreate={createOnSelectedDate} />}
            </CalendarAnchoredPopover>
        </div>
      </DashboardLayout>
    );
}
