import { Repeat } from "lucide-react";

type Props = {
  task: { isRecurring?: boolean | null; recurrenceSummary?: string | null; recurrenceSequence?: number | null } | null | undefined;
  className?: string;
};

/** Subtle "repeats" marker for ordinary tasks that belong to a recurring series. */
export default function RepeatBadge({ task, className = "" }: Props) {
  if (!task?.isRecurring) return null;
  const label = task.recurrenceSummary ? `Repeats: ${task.recurrenceSummary}` : "Part of a recurring series";
  return (
    <span
      data-testid="repeat-badge"
      title={label}
      aria-label={label}
      className={`inline-flex items-center gap-1 rounded-full bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100 ${className}`}
    >
      <Repeat size={11} aria-hidden="true" />
      {task.recurrenceSequence ? `#${task.recurrenceSequence}` : "Repeats"}
    </span>
  );
}
