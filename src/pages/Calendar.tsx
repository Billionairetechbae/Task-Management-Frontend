import { useMemo, useState } from "react";
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
} from "date-fns";
import { Search } from "lucide-react";

import CalendarToolbar from "../components/calendar/CalendarToolbar";
import CalendarSidebar from "../components/calendar/CalendarSidebar";
import CalendarFilters from "../components/calendar/CalendarFilters";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import DayView from "../components/calendar/DayView";
import CreateTaskDialog from "../components/CreateTaskDialog";

import calendarService from "../services/calendarService";
import { api } from "../lib/api";
import { useAuth } from "../contexts/AuthContext";
import { isTaskOverdue, matchesCalendarSearch, resolveCalendarTaskPath, toCalendarEvents } from "../lib/calendarStatus";
import type { CalendarFilters as SharedCalendarFilters } from "../types/calendar";
import DashboardLayout from "../components/dashboard/DashboardLayout";

export type CalendarView = "month" | "week" | "day";

export const CALENDAR_QUERY_KEY = "calendar-events";

export default function CalendarPage() {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { activeCompanyId } = useAuth();
    const [view, setView] = useState<CalendarView>("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [createTaskOpen, setCreateTaskOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [search, setSearch] = useState("");

    const [filters, setFilters] = useState<
        Required<Pick<SharedCalendarFilters, "scope" | "priority" | "status" | "projectId">>
    >({
        scope: "company",
        priority: "",
        status: "",
        projectId: "",
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

    // The workspace id is part of the key: switching workspace can never show another workspace's cache.
    // staleTime 0 => cached data renders instantly but is always revalidated on mount/focus.
    const { data: rawEvents = [], isFetching, isError } = useQuery({
        queryKey: [
            CALENDAR_QUERY_KEY,
            activeCompanyId,
            range.start.toISOString(),
            range.end.toISOString(),
            filters.scope,
            filters.priority,
            filters.status,
            filters.projectId,
        ],
        queryFn: async () => {
            const response = await calendarService.getEvents({
                start: range.start,
                end: range.end,
                ...filters,
            });
            return response.events || [];
        },
        staleTime: 0,
    });
    const loading = isFetching && rawEvents.length === 0;

    const { data: projects = [] } = useQuery({
        queryKey: ["calendar-projects", activeCompanyId],
        queryFn: async () => {
            const res: any = await api.getProjects();
            const list = res?.data?.projects ?? res?.data?.items ?? (Array.isArray(res?.data) ? res.data : []);
            return (list as any[]).map((p) => ({ id: p.id, name: p.name }));
        },
        staleTime: 60_000,
    });

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

    const handleEventClick = (event: any) => {
        navigate(resolveCalendarTaskPath({ ...(event.task ?? {}), id: event.taskId ?? event.task?.id }));
    };

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
                onCreateTask={() => setCreateTaskOpen(true)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
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
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onToday={handleToday}
                    onCreateTask={() => setCreateTaskOpen(true)}
                    onToggleFilters={() => setShowFilters(!showFilters)}
                    showFilters={showFilters}
                />

                <div className="px-6 pt-4">
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
                    <div className="px-6 pt-4 animate-in slide-in-from-top-2 duration-200">
                        <CalendarFilters
                            filters={filters}
                            projects={projects}
                            onChange={setFilters}
                            onClose={() => setShowFilters(false)}
                        />
                    </div>
                )}

                <div className="flex-1 overflow-auto p-6 pt-4">
                    <div className="h-full rounded-2xl bg-white/80 backdrop-blur-sm shadow-sm border border-white/50 overflow-hidden">
                        {view === "month" && (
                            <MonthView
                                currentDate={currentDate}
                                events={events}
                                loading={loading}
                                onNavigate={setCurrentDate}
                                onSelectEvent={handleEventClick}
                            />
                        )}

                        {view === "week" && (
                            <WeekView
                                currentDate={currentDate}
                                events={events}
                                loading={loading}
                                onSelectEvent={handleEventClick}
                            />
                        )}

                        {view === "day" && (
                            <DayView
                                currentDate={currentDate}
                                events={events}
                                loading={loading}
                                onSelectEvent={handleEventClick}
                            />
                        )}
                    </div>
                </div>
            </div>

            <CreateTaskDialog
                open={createTaskOpen}
                onOpenChange={setCreateTaskOpen}
                onSuccess={handleTaskCreated}
            />
        </div>
      </DashboardLayout>
    );
}
