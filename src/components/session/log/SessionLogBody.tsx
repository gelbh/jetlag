import { useMemo } from "react";
import { isActive, type AnnotationRecord } from "@/domain/map/annotations";
import {
  activityAnnotationId,
  sessionActivitySummary,
  sessionActivityTypeLabel,
  sortActivityEventsDesc,
  type SessionActivityEvent,
  type SessionActivityType,
} from "@/domain/session/activity/sessionActivityLog";
import { EmptyState } from "@/components/ui/feedback/EmptyState";

interface SessionLogBodyProps {
  events: readonly SessionActivityEvent[];
  annotations: AnnotationRecord[];
  onDelete: (annotationId: string) => void;
  onEdit: (annotationId: string) => void;
  onSelect?: (annotationId: string) => void;
  readOnly?: boolean;
  compact?: boolean;
}

function typeLabelClass(type: SessionActivityType): string {
  switch (type) {
    case "session_started":
    case "hiding_timer_started":
    case "seeking_started":
      return "text-brand-blue";
    case "question_asked":
    case "thermometer_walk_started":
    case "photo_asked":
      return "text-highlight";
    case "question_answered":
    case "thermometer_walk_separated":
    case "photo_answered":
      return "text-status-success";
    case "question_cancelled":
    case "game_ended":
      return "text-ink-muted";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function answeredLate(event: SessionActivityEvent): boolean {
  return event.type === "question_answered" && event.payload.answeredLate === true;
}

export function SessionLogBody({
  events,
  annotations,
  onDelete,
  onEdit,
  onSelect,
  readOnly = false,
  compact = false,
}: SessionLogBodyProps) {
  const activeById = useMemo(() => {
    const map = new Map<string, AnnotationRecord>();
    for (const annotation of annotations) {
      if (isActive(annotation)) {
        map.set(annotation.id, annotation);
      }
    }
    return map;
  }, [annotations]);

  const sorted = useMemo(() => sortActivityEventsDesc(events), [events]);

  const rowPad = compact ? "px-3 py-2" : "px-3.5 py-2.5";
  const actionPad = compact
    ? "min-h-9 px-2.5 text-[0.8125rem]"
    : "min-h-10 px-3 text-sm";

  if (sorted.length === 0) {
    return <EmptyState className="text-ink-dim">No activity yet.</EmptyState>;
  }

  return (
    <div
      className="jl-ios-inset-group overflow-hidden rounded-xl"
      style={{
        backgroundColor: "oklch(from var(--color-field-ink) l c h / 0.08)",
        border: "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
        backdropFilter: "blur(20px) saturate(1.4)",
      }}
    >
      {sorted.map((event, index) => {
        const linkedId = activityAnnotationId(event);
        const liveId =
          linkedId && activeById.has(linkedId) ? linkedId : undefined;
        const summary = sessionActivitySummary(event);
        const showActions = Boolean(liveId) && !readOnly;
        const selectable = Boolean(liveId && onSelect);
        const late = answeredLate(event);

        return (
          <div
            key={event.id}
            className={`flex items-start justify-between gap-2.5 ${rowPad}`}
            style={{
              borderTop:
                index === 0
                  ? undefined
                  : "0.33px solid oklch(from var(--color-field-ink) l c h / 0.12)",
            }}
          >
            <button
              type="button"
              className="min-w-0 flex-1 text-left disabled:cursor-default"
              disabled={!selectable}
              onClick={() => {
                if (liveId && onSelect) {
                  onSelect(liveId);
                }
              }}
            >
              <p
                className={`mb-0.5 text-[0.75rem] font-bold uppercase tracking-[0.1em] ${typeLabelClass(event.type)}`}
              >
                {sessionActivityTypeLabel(event.type)}
              </p>
              <p
                className="line-clamp-2 text-sm font-semibold text-field-ink"
                title={summary}
              >
                {summary}
              </p>
              <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-field-ink-muted">
                <span>{new Date(event.createdAt).toLocaleTimeString()}</span>
                {late ? (
                  <span className="font-bold uppercase tracking-wide text-halt">
                    Late
                  </span>
                ) : null}
              </p>
            </button>
            {showActions && liveId ? (
              <div className="flex shrink-0 gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => onEdit(liveId)}
                  className={`rounded-lg bg-border/80 text-ink ${actionPad}`}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(liveId)}
                  className={`rounded-lg bg-status-error-surface text-status-error ${actionPad}`}
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
