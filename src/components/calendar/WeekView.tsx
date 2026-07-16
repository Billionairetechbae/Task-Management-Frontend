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
    onSelectEvent?: (event: SharedCalendarEvent) => void;
}

export default function WeekView({
    currentDate,
    events,
    loading = false,
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
                events={events}
                view="week"
                date={currentDate}
                defaultView="week"
                toolbar={false}
                selectable
                popup
                step={30}
                timeslots={2}
                min={new Date(1970, 1, 1, 7, 0)}
                max={new Date(1970, 1, 1, 20, 0)}
                scrollToTime={new Date()}
                startAccessor="start"
                endAccessor="end"
                titleAccessor="title"
                onSelectEvent={(event: any) =>
                    onSelectEvent?.(event as SharedCalendarEvent)
                }
                components={{
                    event: ({ event }) => (
                        <CalendarEvent event={event} />
                    ),
                }}
            />

        </div>
    );
}