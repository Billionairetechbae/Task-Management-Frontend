import { format } from "date-fns";

/** Viewport-space rectangle a calendar popover anchors to (an event element, or the point that was clicked). */
export interface AnchorRect { x: number; y: number; width: number; height: number }

export interface CalendarSlot {
    start: Date;
    /** False for month cells / all-day clicks: only the date is meaningful. */
    hasTime: boolean;
    anchor: AnchorRect;
}

const centreOfViewport = (): AnchorRect => ({ x: window.innerWidth / 2, y: window.innerHeight / 3, width: 0, height: 0 });

/** Anchor to the rendered event chip that was clicked. Must be called synchronously inside the click handler. */
export function anchorFromEvent(e: unknown): AnchorRect {
    const target = (e as { target?: EventTarget | null } | undefined)?.target;
    if (target instanceof Element) {
        const el = target.closest(".rbc-event") ?? target;
        const r = el.getBoundingClientRect();
        return { x: r.left, y: r.top, width: r.width, height: r.height };
    }
    return centreOfViewport();
}

/** Anchor to the pointer position of a react-big-calendar slot click. */
export function anchorFromSlot(slot: { box?: { clientX?: number; clientY?: number }; bounds?: { x?: number; y?: number } }): AnchorRect {
    const x = slot.box?.clientX ?? slot.bounds?.x;
    const y = slot.box?.clientY ?? slot.bounds?.y;
    return typeof x === "number" && typeof y === "number" ? { x, y, width: 0, height: 0 } : centreOfViewport();
}

export function toCalendarSlot(slot: { start: Date; box?: any; bounds?: any }): CalendarSlot {
    const start = new Date(slot.start);
    return { start, hasTime: start.getHours() !== 0 || start.getMinutes() !== 0, anchor: anchorFromSlot(slot) };
}

/** Local datetime-local value for the existing task form's Deadline field. */
export const toDeadlineInputValue = (d: Date) => format(d, "yyyy-MM-dd'T'HH:mm");

/** The form requires a time, so a date-only click defaults to end of the working day; the user can edit it. */
export const DEFAULT_DUE_HOUR = 17;
