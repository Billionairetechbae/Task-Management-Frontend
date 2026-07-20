import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
    format,
    parse,
    startOfWeek,
    getDay,
} from "date-fns";
import { enUS } from "date-fns/locale";
import { Loader2 } from "lucide-react";

import "react-big-calendar/lib/css/react-big-calendar.css";

import CalendarEvent from "./CalendarEvent";
import type { CalendarEvent as SharedCalendarEvent } from "../../types/calendar";

const locales = {
    "en-US": enUS,
};

const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales,
});

interface Props {
    currentDate: Date;
    events: SharedCalendarEvent[];
    loading?: boolean;
    onNavigate: (date: Date) => void;
    onSelectEvent?: (event: SharedCalendarEvent) => void;
}

export default function MonthView({
    currentDate,
    events,
    loading = false,
    onNavigate,
    onSelectEvent,
}: Props) {
    if (loading) {
        return (
            <div className="flex h-full items-center justify-center gap-3 text-gray-500">
                <Loader2 size={24} className="animate-spin text-blue-600" />
                <span>Loading calendar...</span>
            </div>
        );
    }

    return (
        <div className="h-full p-2">
            <Calendar
                localizer={localizer}
                view="month"
                date={currentDate}
                onNavigate={onNavigate}
                onView={() => {}}
                toolbar={false}
                popup
                selectable
                events={events}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                style={{ height: "100%" }}
                onSelectEvent={(event) =>
                    onSelectEvent?.(event as SharedCalendarEvent)
                }
                components={{
                    event: ({ event }) => (
                        <CalendarEvent
                            event={event}
                            compact
                        />
                    ),
                }}
                className="rbc-custom"
            />
        </div>
    );
}