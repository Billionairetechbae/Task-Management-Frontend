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

    const [filters, setFilters] = useState<
        Required<Pick<SharedCalendarFilters, "scope" | "priority" | "status" | "projectId">>
    >({
        scope: "company",
        priority: "",
        status: "",
        projectId: "",
    });

    /**
     * Calendar range
     */

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

    /**
     * Load events
     */

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

            console.log(response.events);
            // console.log(JSON.stringify(response.events, null, 2));

            // setEvents(response.events || []);
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

    /**
     * Navigation
     */

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
        <div className="flex h-screen bg-gray-50">
            <CalendarSidebar
                view={view}
                onViewChange={setView}
                onCreateTask={() => setCreateTaskOpen(true)}
            />

            <div className="flex flex-1 flex-col overflow-hidden">
                <CalendarToolbar
                    view={view}
                    setView={setView}
                    currentDate={currentDate}
                    onPrevious={handlePrevious}
                    onNext={handleNext}
                    onToday={handleToday}
                    onCreateTask={() => setCreateTaskOpen(true)}
                />

                <CalendarFilters
                    filters={filters}
                    onChange={setFilters}
                />

                <div className="flex-1 overflow-auto">
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