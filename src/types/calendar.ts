export type CalendarScope =
    | "company"
    | "my"
    | "team";

export interface CalendarFilters {
    start: Date;
    end: Date;

    scope: CalendarScope;

    priority?: string;
    status?: string;
    projectId?: string;
}

export interface CalendarUser {
    id: string;
    firstName: string;
    lastName: string;
    profilePictureUrl?: string;
}

export interface CalendarProject {
    id: string;
    name: string;
}

export interface CalendarEvent {
    id: string;
    taskId: string;

    title: string;

    start: string;
    end: string;

    priority: string;
    status: string;

    creator: CalendarUser;

    project?: CalendarProject;

    assignees: CalendarUser[];

    task: any;
}

export interface CalendarResponse {
    success: boolean;
    events: CalendarEvent[];
}
