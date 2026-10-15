import { useMemo, type ReactNode } from "react";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import type { AnchorRect } from "./calendarAnchor";

interface Props {
    anchor: AnchorRect | null;
    onClose: () => void;
    label: string;
    className?: string;
    children: ReactNode;
}

/**
 * Floating popover pinned to a rectangle in the viewport (Radix/Floating UI picks right/left/top/bottom
 * and shifts to stay on screen).  Modal: the first outside click only dismisses it, Escape closes it,
 * focus moves into it and returns afterwards.
 */
export default function CalendarAnchoredPopover({ anchor, onClose, label, className = "", children }: Props) {
    const virtualRef = useMemo(() => {
        const a = anchor ?? { x: 0, y: 0, width: 0, height: 0 };
        const rect = { x: a.x, y: a.y, left: a.x, top: a.y, width: a.width, height: a.height, right: a.x + a.width, bottom: a.y + a.height, toJSON: () => ({}) };
        return { current: { getBoundingClientRect: () => rect as DOMRect } };
    }, [anchor]);

    return (
        <Popover open={Boolean(anchor)} onOpenChange={(open) => { if (!open) onClose(); }} modal>
            <PopoverAnchor virtualRef={virtualRef} />
            <PopoverContent
                aria-label={label}
                side="right"
                align="start"
                sideOffset={8}
                collisionPadding={12}
                className={`w-80 max-w-[calc(100vw-1.5rem)] max-h-[min(28rem,var(--radix-popover-content-available-height))] overflow-y-auto rounded-xl border-gray-200 bg-white p-4 shadow-xl ${className}`}
            >
                {children}
            </PopoverContent>
        </Popover>
    );
}
