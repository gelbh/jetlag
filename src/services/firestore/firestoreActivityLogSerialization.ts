import type { AnnotationType } from "../../domain/map/annotations";
import type { SessionActivityEvent } from "../../domain/session/sessionActivityLog";
import {
  assertNoNestedArrays,
  stripUndefinedValues,
} from "./firestoreSerialization";
import { parseFirestoreDocument } from "./zodConverter";
import { activityLogDocumentSchema } from "./schemas/firestoreDocuments";

const ACTIVITY_ANNOTATION_TYPES = [
  "radar",
  "thermometer",
  "measuring",
  "zone",
  "pin",
  "tentacle",
  "matching",
] as const satisfies readonly AnnotationType[];

const ACTIVITY_ANNOTATION_TYPE_SET: ReadonlySet<string> = new Set(
  ACTIVITY_ANNOTATION_TYPES,
);

function optionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function optionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function parseActivityToolType(value: unknown): AnnotationType {
  if (typeof value === "string" && ACTIVITY_ANNOTATION_TYPE_SET.has(value)) {
    return value as AnnotationType;
  }
  throw new Error(`Invalid activity log toolType: ${String(value)}`);
}

export function buildActivityLogDocument(
  event: SessionActivityEvent,
): Record<string, unknown> {
  const payload = stripUndefinedValues({
    type: event.type,
    createdAt: event.createdAt,
    payload: event.payload,
    createdByUid: event.createdByUid,
  }) as Record<string, unknown>;
  assertNoNestedArrays(payload);
  return payload;
}

export function deserializeActivityLogFromFirestore(
  eventId: string,
  sessionId: string,
  data: Record<string, unknown>,
): SessionActivityEvent {
  const document = parseFirestoreDocument(
    activityLogDocumentSchema,
    data,
    `activity log ${eventId}`,
  );
  const payload = document.payload;
  const createdByUid = optionalString(document.createdByUid);
  const base = {
    id: eventId,
    sessionId,
    createdAt: String(document.createdAt),
    ...(createdByUid ? { createdByUid } : {}),
  };

  switch (document.type) {
    case "session_started":
    case "hiding_timer_started":
    case "seeking_started":
      return { ...base, type: document.type, payload: {} };
    case "question_asked":
    case "question_answered":
    case "question_cancelled":
      return {
        ...base,
        type: document.type,
        payload: {
          toolType: parseActivityToolType(payload.toolType),
          promptText: String(payload.promptText ?? ""),
          pendingQuestionId: optionalString(payload.pendingQuestionId),
          annotationId: optionalString(payload.annotationId),
          answerSummary: optionalString(payload.answerSummary),
          answeredLate: optionalBoolean(payload.answeredLate),
        },
      };
    case "thermometer_walk_started":
    case "thermometer_walk_separated":
      return {
        ...base,
        type: document.type,
        payload: {
          pendingQuestionId: optionalString(payload.pendingQuestionId),
          promptText: optionalString(payload.promptText),
        },
      };
    case "photo_asked":
    case "photo_answered":
      return {
        ...base,
        type: document.type,
        payload: {
          pendingQuestionId: optionalString(payload.pendingQuestionId),
          promptText: optionalString(payload.promptText),
          answerSummary: optionalString(payload.answerSummary),
        },
      };
    case "game_ended":
      return {
        ...base,
        type: "game_ended",
        payload: {
          outcome:
            typeof payload.outcome === "string" ? payload.outcome : undefined,
          summary: optionalString(payload.summary),
        },
      };
    default: {
      const _exhaustive: never = document.type;
      throw new Error(
        `Unhandled activity log type: ${String(_exhaustive)}`,
      );
    }
  }
}
