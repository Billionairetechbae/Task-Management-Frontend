import { api } from "../lib/api";
import type {
    CalendarFilters,
    CalendarResponse,
} from "../types/calendar";

const calendarService = {
    async getEvents(filters: CalendarFilters): Promise<CalendarResponse> {
        // Send ISO strings: String(Date) drops milliseconds, which hides tasks due at 23:59:59.999
        // on the last day of a month/week/day.
        // Personal, cross-workspace calendar: no x-company-id header, the active workspace is irrelevant.
        const response = await api.get<CalendarResponse>("/calendar/events", {
            includeWorkspace: false,
            params: {
                ...filters,
                start: filters.start.toISOString(),
                end: filters.end.toISOString(),
            },
        });

        return response;
    },
};

export default calendarService;
