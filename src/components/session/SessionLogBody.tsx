import { useMemo, useState } from "react";
import {
  annotationSummary,
  isActive,
  type AnnotationRecord,
  type AnnotationType,
} from "../../domain/map/annotations";
import { useSessionDistanceUnit } from "../../hooks/session/useSessionDistanceUnit";

const FILTER_OPTIONS: Array<AnnotationType | "all"> = [
  "all",
  "radar",
  "thermometer",
  "measuring",
  "matching",
  "zone",
  "pin",
  "tentacle",
];

interface SessionLogBodyProps {
  annotations: AnnotationRecord[];
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

export function SessionLogBody({
  annotations,
  onDelete,
  onEdit,
  readOnly = false,
  compact = false,
}: SessionLogBodyProps) {
  const distanceUnit = useSessionDistanceUnit();
  const [filter, setFilter] = useState<AnnotationType | "all">("all");

  const active = useMemo(() => {
    const items = annotations.filter(isActive).slice().reverse();
    if (filter === "all") {
      return items;
    }

    return items.filter((annotation) => annotation.type === filter);
  }, [annotations, filter]);

  const filterButtonClass = compact ? "min-h-9 px-2.5 text-xs" : "min-h-10 px-3 text-sm";

  return (
    <>
      <div className="mb-3 flex shrink-0 flex-wrap gap-1.5">
        {FILTER_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => setFilter(option)}
            className={`rounded-full capitalize ${filterButtonClass} ${
              filter === option
                ? "bg-action text-action-ink"
                : "bg-surface-raised text-ink"
            }`}
          >
            {option}
          </button>
        ))}
      </div>

      <div className="min-h-0 space-y-2">
        {active.length === 0 ? (
          <p className="text-sm text-ink-dim">No annotations yet.</p>
        ) : (
          active.map((annotation) => (
            <div
              key={annotation.id}
              className="flex items-center justify-between gap-3 rounded-xl bg-surface-raised/80 px-3 py-2.5"
            >
              <button
                type="button"
                onClick={() => onEdit(annotation.id)}
                className="min-w-0 flex-1 text-left"
                disabled={readOnly}
              >
                <p className="text-sm font-medium">
                  {annotationSummary(annotation, distanceUnit)}
                </p>
                <p className="text-xs text-ink-dim">
                  {new Date(
                    annotation.metadata.createdAt,
                  ).toLocaleTimeString()}
                </p>
              </button>
              {readOnly ? null : (
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(annotation.id)}
                    className="min-h-10 rounded-xl bg-border px-3 text-sm text-ink"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(annotation.id)}
                    className="min-h-10 rounded-xl bg-status-error-surface px-3 text-sm text-status-error"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
