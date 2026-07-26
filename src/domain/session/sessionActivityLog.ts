import type { GameOutcome } from "../game/foundHider";
import type { AnnotationType } from "../map/annotations";
import { MAP_TOOL_DOCK_ENTRIES } from "../map/mapTools";

export const SESSION_ACTIVITY_TYPES = [
  "session_started",
  "hiding_timer_started",
  "seeking_started",
  "question_asked",
  "thermometer_walk_started",
  "thermometer_walk_separated",
  "question_answered",
  "question_cancelled",
  "photo_asked",
  "photo_answered",
  "game_ended",
] as const;

export type SessionActivityType = (typeof SESSION_ACTIVITY_TYPES)[number];

export const FIXED_ACTIVITY_EVENT_IDS = [
  "session_started",
  "hiding_timer_started",
  "seeking_started",
  "game_ended",
] as const satisfies readonly SessionActivityType[];

export type FixedSessionActivityType = (typeof FIXED_ACTIVITY_EVENT_IDS)[number];

interface SessionActivityEventBase {
  id: string;
  sessionId: string;
  type: SessionActivityType;
  createdAt: string;
  createdByUid?: string;
}

export type SessionActivityEvent = SessionActivityEventBase &
  (
    | { type: "session_started"; payload: Record<string, never> }
    | { type: "hiding_timer_started"; payload: Record<string, never> }
    | { type: "seeking_started"; payload: Record<string, never> }
    | {
        type: "question_asked" | "question_answered" | "question_cancelled";
        payload: {
          toolType: AnnotationType;
          promptText: string;
          pendingQuestionId?: string;
          annotationId?: string;
          answerSummary?: string;
          answeredLate?: boolean;
        };
      }
    | {
        type: "thermometer_walk_started" | "thermometer_walk_separated";
        payload: {
          pendingQuestionId?: string;
          promptText?: string;
        };
      }
    | {
        type: "photo_asked" | "photo_answered";
        payload: {
          pendingQuestionId?: string;
          promptText?: string;
          answerSummary?: string;
        };
      }
    | {
        type: "game_ended";
        payload: { outcome?: GameOutcome | string; summary?: string };
      }
  );

export function createActivityEventId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function phaseActivityEventId(type: FixedSessionActivityType): string {
  return type;
}

export function sortActivityEventsDesc(
  events: readonly SessionActivityEvent[],
): SessionActivityEvent[] {
  return [...events].sort((left, right) =>
    right.createdAt.localeCompare(left.createdAt),
  );
}

/** Annotation id for map focus / edit when the event links to a live answer. */
export function activityAnnotationId(
  event: SessionActivityEvent,
): string | undefined {
  switch (event.type) {
    case "question_asked":
    case "question_answered":
    case "question_cancelled":
      return event.payload.annotationId;
    case "session_started":
    case "hiding_timer_started":
    case "seeking_started":
    case "thermometer_walk_started":
    case "thermometer_walk_separated":
    case "photo_asked":
    case "photo_answered":
    case "game_ended":
      return undefined;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}

/** Short Barlow label for timeline rows. */
export function sessionActivityTypeLabel(type: SessionActivityType): string {
  switch (type) {
    case "session_started":
      return "Session";
    case "hiding_timer_started":
      return "Hiding";
    case "seeking_started":
      return "Seeking";
    case "question_asked":
      return "Asked";
    case "thermometer_walk_started":
      return "Walk";
    case "thermometer_walk_separated":
      return "Ready";
    case "question_answered":
      return "Answered";
    case "question_cancelled":
      return "Cancelled";
    case "photo_asked":
    case "photo_answered":
      return "Photo";
    case "game_ended":
      return "Ended";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

function activityToolLabel(toolType: AnnotationType): string {
  const entry = MAP_TOOL_DOCK_ENTRIES.find((item) => item.id === toolType);
  return entry?.name ?? toolType;
}

export function sessionActivitySummary(event: SessionActivityEvent): string {
  switch (event.type) {
    case "session_started":
      return "Session started";
    case "hiding_timer_started":
      return "Hiding timer started";
    case "seeking_started":
      return "Seeking started";
    case "thermometer_walk_started":
      return "Thermometer walk started";
    case "thermometer_walk_separated":
      return "Thermometer ready — awaiting answer";
    case "question_asked":
      return `${activityToolLabel(event.payload.toolType)} asked — ${event.payload.promptText}`;
    case "question_answered": {
      const tool = activityToolLabel(event.payload.toolType);
      const { promptText, answerSummary } = event.payload;
      if (answerSummary) {
        return `${tool} — ${promptText}: ${answerSummary}`;
      }
      return `${tool} — ${promptText}`;
    }
    case "question_cancelled":
      return `${activityToolLabel(event.payload.toolType)} cancelled — ${event.payload.promptText}`;
    case "photo_asked":
      return event.payload.promptText
        ? `Photo asked — ${event.payload.promptText}`
        : "Photo asked";
    case "photo_answered": {
      const { promptText, answerSummary } = event.payload;
      if (promptText && answerSummary) {
        return `Photo answered — ${promptText}: ${answerSummary}`;
      }
      if (answerSummary) {
        return `Photo answered — ${answerSummary}`;
      }
      if (promptText) {
        return `Photo answered — ${promptText}`;
      }
      return "Photo answered";
    }
    case "game_ended":
      return event.payload.summary
        ? `Game ended — ${event.payload.summary}`
        : "Game ended";
    default: {
      const _exhaustive: never = event;
      throw new Error(`Unhandled session activity type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
