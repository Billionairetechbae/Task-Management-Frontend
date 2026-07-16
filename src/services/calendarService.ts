
import { api } from "../lib/api";
import type {
    CalendarFilters,
    CalendarResponse,
} from "../types/calendar";

const calendarService = {
    async getEvents(filters: CalendarFilters): Promise<CalendarResponse> {
        const response = await api.get<CalendarResponse>("/calendar/events", {
            params: filters,
        });

        return response;
    },
};

export default calendarService;