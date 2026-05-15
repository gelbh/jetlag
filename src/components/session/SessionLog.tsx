import { useMemo, useState } from "react";
import {
  annotationSummary,
  isActive,
  type AnnotationRecord,
  type AnnotationType,
} from "../../domain/annotations";
import { useMapStore } from "../../state/sessionStore";

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

interface SessionLogProps {
  open: boolean;
  annotations: AnnotationRecord[];
  onClose: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string) => void;
}

export function SessionLog({
  open,
  annotations,
  onClose,
  onDelete,
  onEdit,
}: SessionLogProps) {
  const distanceUnit = useMapStore((state) => state.distanceUnit);
  const [filter, setFilter] = useState<AnnotationType | "all">("all");

  const active = useMemo(() => {
    const items = annotations.filter(isActive).slice().reverse();
    if (filter === "all") {
      return items;
    }

    return items.filter((annotation) => annotation.type === filter);
  }, [annotations, filter]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-[1100] bg-slate-950/70 backdrop-blur-sm"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
    >
      <div
        className="absolute inset-x-0 bottom-0 max-h-[min(85dvh,720px)] rounded-t-3xl border border-slate-700 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Session log</h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-12 rounded-xl bg-slate-800 px-4 text-sm font-medium"
          >
            Close
          </button>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setFilter(option)}
              className={`min-h-10 rounded-full px-3 text-sm capitalize ${
                filter === option
                  ? "bg-sky-500 text-slate-950"
                  : "bg-slate-800 text-slate-100"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="space-y-2 overflow-y-auto overscroll-contain">
          {active.length === 0 ? (
            <p className="text-sm text-slate-400">No annotations yet.</p>
          ) : (
            active.map((annotation) => (
              <div
                key={annotation.id}
                className="flex items-center justify-between gap-3 rounded-xl bg-slate-800/80 px-3 py-3"
              >
                <button
                  type="button"
                  onClick={() => onEdit(annotation.id)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="text-sm font-medium">
                    {annotationSummary(annotation, distanceUnit)}
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(
                      annotation.metadata.createdAt,
                    ).toLocaleTimeString()}
                  </p>
                </button>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => onEdit(annotation.id)}
                    className="min-h-12 rounded-xl bg-slate-700 px-3 text-sm text-slate-100"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(annotation.id)}
                    className="min-h-12 rounded-xl bg-rose-500/20 px-3 text-sm text-rose-200"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
