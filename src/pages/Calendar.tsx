import { useEffect, useMemo, useState } from "react";
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
import { Calendar as CalendarIcon, Filter, LayoutGrid, List } from "lucide-react";

import CalendarToolbar from "../components/calendar/CalendarToolbar";
import CalendarSidebar from "../components/calendar/CalendarSidebar";
import CalendarFilters from "../components/calendar/CalendarFilters";
import MonthView from "../components/calendar/MonthView";
import WeekView from "../components/calendar/WeekView";
import DayView from "../components/calendar/DayView";
import TaskDrawer from "../components/calendar/TaskDrawer";
import CreateTaskDialog from "../components/CreateTaskDialog";

import calendarService from "../services/calendarService";
import type { CalendarFilters as SharedCalendarFilters } from "../types/calendar";

export type CalendarView = "month" | "week" | "day";

export default function CalendarPage() {
    const [view, setView] = useState<CalendarView>("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedTask, setSelectedTask] = useState<any>(null);
    const [createTaskOpen, setCreateTaskOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

    useEffect(() => {
        loadEvents();
    }, [range, filters]);

    const loadEvents = async () => {
        try {
            setLoading(true);
            const response = await calendarService.getEvents({
                start: range.start,
                end: range.end,
                ...filters,
            });

            const calendarEvents = (response.events || []).map((event: any) => ({
                ...event,
                start: new Date(event.start),
                end: new Date(event.end),
            }));

            setEvents(calendarEvents);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
        setSelectedTask(event.task);
    };

    const handleTaskCreated = () => {
        loadEvents();
    };

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100/50">
            {/* Sidebar */}
            <CalendarSidebar
                view={view}
                onViewChange={setView}
                onCreateTask={() => setCreateTaskOpen(true)}
                collapsed={sidebarCollapsed}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
                stats={{
                    total: events.length,
                    overdue: events.filter(e => new Date(e.end) < new Date() && e.status !== 'completed').length,
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

                {showFilters && (
                    <div className="px-6 pt-4 animate-in slide-in-from-top-2 duration-200">
                        <CalendarFilters
                            filters={filters}
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

            <TaskDrawer
                open={!!selectedTask}
                task={selectedTask}
                onClose={() => setSelectedTask(null)}
            />

            <CreateTaskDialog
                open={createTaskOpen}
                onOpenChange={setCreateTaskOpen}
                onSuccess={handleTaskCreated}
            />
        </div>
    );
}