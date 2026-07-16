import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import {
    format,
    parse,
    startOfWeek,
    getDay,
} from "date-fns";
import { enUS } from "date-fns/locale";

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
            <div className="flex h-full items-center justify-center">
                Loading calendar...
            </div>
        );
    }

    return (
        <div className="h-[calc(100vh-170px)] rounded-lg bg-white p-4">
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
            />
        </div>
    );
}