import type { AnnotationType } from "../../domain/map/annotations";
import type { GameOutcome } from "../../domain/game/foundHider";
import {
  createActivityEventId,
  phaseActivityEventId,
  type SessionActivityEvent,
} from "../../domain/session/activity/sessionActivityLog";
import type { PendingQuestionToolType } from "../../domain/session/activity/sessionChat";
import { parsePhotoAnswer } from "../../domain/questions/photoQuestions";
import { trackSessionEnded } from "../core/analytics";
import { appendSessionActivityEvent } from "./sessionActivityLog";

/** Fire-and-forget append; lifecycle writers must not fail the primary action. */
export function voidAppendSessionActivityEvent(
  event: SessionActivityEvent,
): void {
  void appendSessionActivityEvent(event).catch(() => {
    // Silent miss — timeline stays on last good snapshot.
  });
}

function isGameOverAnalyticsOutcome(
  outcome: GameOutcome | string | undefined,
): boolean {
  return outcome === "found" || outcome === "abandoned";
}

export function pendingActivityEventId(
  pendingQuestionId: string,
  phase:
    | "asked"
    | "walk_started"
    | "walk_separated"
    | "answered"
    | "cancelled"
    | "photo_asked"
    | "photo_answered",
): string {
  return `${pendingQuestionId}_${phase}`;
}

export function emitSessionStartedActivity(
  sessionId: string,
  createdByUid?: string,
): void {
  voidAppendSessionActivityEvent({
    id: phaseActivityEventId("session_started"),
    sessionId,
    type: "session_started",
    createdAt: new Date().toISOString(),
    createdByUid,
    payload: {},
  });
}

export function emitHidingTimerStartedActivity(
  sessionId: string,
  createdByUid?: string,
): void {
  voidAppendSessionActivityEvent({
    id: phaseActivityEventId("hiding_timer_started"),
    sessionId,
    type: "hiding_timer_started",
    createdAt: new Date().toISOString(),
    createdByUid,
    payload: {},
  });
}

export function emitSeekingStartedActivity(sessionId: string): void {
  voidAppendSessionActivityEvent({
    id: phaseActivityEventId("seeking_started"),
    sessionId,
    type: "seeking_started",
    createdAt: new Date().toISOString(),
    payload: {},
  });
}

export function emitGameEndedActivity(
  sessionId: string,
  payload: { outcome?: GameOutcome | string; summary?: string } = {},
  createdByUid?: string,
): void {
  voidAppendSessionActivityEvent({
    id: phaseActivityEventId("game_ended"),
    sessionId,
    type: "game_ended",
    createdAt: new Date().toISOString(),
    createdByUid,
    payload,
  });
  // Host end / leave paths track separately; ended_early must not double-fire.
  if (isGameOverAnalyticsOutcome(payload.outcome)) {
    trackSessionEnded("game_over");
  }
}

export function emitQuestionAskedActivity(input: {
  sessionId: string;
  toolType: AnnotationType;
  promptText: string;
  pendingQuestionId?: string;
  createdByUid?: string;
}): void {
  const id = input.pendingQuestionId
    ? pendingActivityEventId(input.pendingQuestionId, "asked")
    : createActivityEventId();
  voidAppendSessionActivityEvent({
    id,
    sessionId: input.sessionId,
    type: "question_asked",
    createdAt: new Date().toISOString(),
    createdByUid: input.createdByUid,
    payload: {
      toolType: input.toolType,
      promptText: input.promptText,
      pendingQuestionId: input.pendingQuestionId,
    },
  });
}

export function emitQuestionAnsweredActivity(input: {
  sessionId: string;
  toolType: AnnotationType;
  promptText: string;
  pendingQuestionId?: string;
  annotationId?: string;
  answerSummary?: string;
  answeredLate?: boolean;
  createdByUid?: string;
}): void {
  const id = input.pendingQuestionId
    ? pendingActivityEventId(input.pendingQuestionId, "answered")
    : createActivityEventId();
  voidAppendSessionActivityEvent({
    id,
    sessionId: input.sessionId,
    type: "question_answered",
    createdAt: new Date().toISOString(),
    createdByUid: input.createdByUid,
    payload: {
      toolType: input.toolType,
      promptText: input.promptText,
      pendingQuestionId: input.pendingQuestionId,
      annotationId: input.annotationId,
      answerSummary: input.answerSummary,
      answeredLate: input.answeredLate,
    },
  });
}

export function emitQuestionCancelledActivity(input: {
  sessionId: string;
  toolType: PendingQuestionToolType;
  promptText: string;
  pendingQuestionId?: string;
  createdByUid?: string;
}): void {
  const id = input.pendingQuestionId
    ? pendingActivityEventId(input.pendingQuestionId, "cancelled")
    : createActivityEventId();
  voidAppendSessionActivityEvent({
    id,
    sessionId: input.sessionId,
    type: "question_cancelled",
    createdAt: new Date().toISOString(),
    createdByUid: input.createdByUid,
    payload: {
      toolType: input.toolType,
      promptText: input.promptText,
      pendingQuestionId: input.pendingQuestionId,
    },
  });
}

export function emitThermometerWalkStartedActivity(input: {
  sessionId: string;
  pendingQuestionId?: string;
  promptText?: string;
  createdByUid?: string;
}): void {
  const id = input.pendingQuestionId
    ? pendingActivityEventId(input.pendingQuestionId, "walk_started")
    : createActivityEventId();
  voidAppendSessionActivityEvent({
    id,
    sessionId: input.sessionId,
    type: "thermometer_walk_started",
    createdAt: new Date().toISOString(),
    createdByUid: input.createdByUid,
    payload: {
      pendingQuestionId: input.pendingQuestionId,
      promptText: input.promptText,
    },
  });
}

export function emitThermometerWalkSeparatedActivity(input: {
  sessionId: string;
  pendingQuestionId?: string;
  promptText?: string;
  createdByUid?: string;
}): void {
  const id = input.pendingQuestionId
    ? pendingActivityEventId(input.pendingQuestionId, "walk_separated")
    : createActivityEventId();
  voidAppendSessionActivityEvent({
    id,
    sessionId: input.sessionId,
    type: "thermometer_walk_separated",
    createdAt: new Date().toISOString(),
    createdByUid: input.createdByUid,
    payload: {
      pendingQuestionId: input.pendingQuestionId,
      promptText: input.promptText,
    },
  });
}

export function emitPhotoAskedActivity(input: {
  sessionId: string;
  pendingQuestionId?: string;
  promptText?: string;
  createdByUid?: string;
}): void {
  const id = input.pendingQuestionId
    ? pendingActivityEventId(input.pendingQuestionId, "photo_asked")
    : createActivityEventId();
  voidAppendSessionActivityEvent({
    id,
    sessionId: input.sessionId,
    type: "photo_asked",
    createdAt: new Date().toISOString(),
    createdByUid: input.createdByUid,
    payload: {
      pendingQuestionId: input.pendingQuestionId,
      promptText: input.promptText,
    },
  });
}

export function emitPhotoAnsweredActivity(input: {
  sessionId: string;
  pendingQuestionId?: string;
  promptText?: string;
  answerSummary?: string;
  createdByUid?: string;
}): void {
  const id = input.pendingQuestionId
    ? pendingActivityEventId(input.pendingQuestionId, "photo_answered")
    : createActivityEventId();
  voidAppendSessionActivityEvent({
    id,
    sessionId: input.sessionId,
    type: "photo_answered",
    createdAt: new Date().toISOString(),
    createdByUid: input.createdByUid,
    payload: {
      pendingQuestionId: input.pendingQuestionId,
      promptText: input.promptText,
      answerSummary: input.answerSummary,
    },
  });
}

export function answerSummaryFromPendingReply(
  answer: unknown,
  replyOptions: readonly { id: string; label: string }[],
): string | undefined {
  if (typeof answer === "string") {
    const match = replyOptions.find((option) => option.id === answer);
    return match?.label ?? answer;
  }
  if (answer == null) {
    return undefined;
  }
  const photo = parsePhotoAnswer(answer);
  if (photo) {
    if (photo.kind === "photo") {
      return "Photo received";
    }
    const match = replyOptions.find((option) => option.id === photo.kind);
    return match?.label ?? photo.kind;
  }
  if (typeof answer === "object" && answer !== null && "kind" in answer) {
    const kind = (answer as { kind?: unknown }).kind;
    if (typeof kind === "string") {
      const match = replyOptions.find((option) => option.id === kind);
      return match?.label ?? kind;
    }
  }
  return undefined;
}

export function isAnnotationQuestionTool(
  toolType: PendingQuestionToolType,
): toolType is AnnotationType {
  return toolType !== "photo";
}
