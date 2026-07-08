import type { AnnotationRecord, SessionRecord } from "../map/annotations";
import type { QuestionCardCost } from "../map/mapTools";
import type { GameSize } from "../session/gameSize";
import type {
  PendingQuestionRecord,
  PendingQuestionStatus,
  PendingQuestionToolType,
} from "../session/sessionChat";
import { resolveAnswerDeadlineMs } from "../session/sessionRules";
import {
  formatRemainingCountdownFromMs,
} from "../time/formatClockDuration";

export type QuestionToolType = Extract<
  PendingQuestionToolType,
  "matching" | "measuring" | "radar" | "thermometer" | "tentacle" | "photo"
>;

const BASE_COST_MULTIPLIERS: Record<QuestionCardCost, { draw: number; keep: number }> =
  {
    D3P1: { draw: 3, keep: 1 },
    D2P1: { draw: 2, keep: 1 },
    D4P2: { draw: 4, keep: 2 },
    D1P1: { draw: 1, keep: 1 },
  };

export interface QuestionCostBreakdown {
  label: string;
  draw: number;
  keep: number;
}

export function questionCostBreakdown(
  baseCost: QuestionCardCost,
  useCount: number,
): QuestionCostBreakdown {
  const multiplier = useCount + 1;
  const { draw, keep } = BASE_COST_MULTIPLIERS[baseCost];
  const scaledDraw = draw * multiplier;
  const scaledKeep = keep * multiplier;
  return {
    label: `D${scaledDraw}P${scaledKeep}`,
    draw: scaledDraw,
    keep: scaledKeep,
  };
}

export function questionCostLabel(
  baseCost: QuestionCardCost,
  useCount: number,
): string {
  return questionCostBreakdown(baseCost, useCount).label;
}

export function formatDrawPickSummary(draw: number, keep: number): string {
  const drawLabel = draw === 1 ? "Draw 1" : `Draw ${draw}`;
  const pickLabel = keep === 1 ? "pick 1" : `pick ${keep}`;
  return `${drawLabel}, ${pickLabel}`;
}

export function isCountablePendingQuestionStatus(
  status: PendingQuestionStatus,
): boolean {
  return (
    status === "pending" ||
    status === "answered" ||
    status === "resolved" ||
    status === "walking"
  );
}

export function hasOpenPendingQuestion(
  pendingQuestions: readonly PendingQuestionRecord[],
): boolean {
  return pendingQuestions.some(
    (question) => question.status === "pending" || question.status === "walking",
  );
}

export function questionAnswerDeadlineMs(
  toolType: PendingQuestionToolType,
  sessionOrGameSize: Pick<
    SessionRecord,
    | "gameSize"
    | "photoAnswerDeadlineMinutes"
    | "questionAnswerDeadlineMinutes"
  > | GameSize,
): number {
  if (typeof sessionOrGameSize === "string") {
    return resolveAnswerDeadlineMs({ gameSize: sessionOrGameSize }, toolType);
  }

  return resolveAnswerDeadlineMs(sessionOrGameSize, toolType);
}

export function formatAnswerCountdown(
  answerableAt: string | undefined,
  deadlineMs: number,
  nowMs: number = Date.now(),
): string | null {
  if (!answerableAt) {
    return null;
  }

  const elapsed = nowMs - Date.parse(answerableAt);
  const remaining = deadlineMs - elapsed;

  if (remaining <= 0) {
    return "Time expired";
  }

  return formatRemainingCountdownFromMs(remaining);
}

export function isQuestionAnswerDeadlineExpired(
  answerableAt: string | undefined,
  deadlineMs: number,
  nowMs: number = Date.now(),
): boolean {
  if (!answerableAt) {
    return false;
  }

  return nowMs - Date.parse(answerableAt) >= deadlineMs;
}

export function formatExpiredAnswerCountdown(
  answerableAt: string | undefined,
  deadlineMs: number,
  deadlineExpiredAt: string | undefined,
  nowMs: number = Date.now(),
): string | null {
  if (deadlineExpiredAt || isQuestionAnswerDeadlineExpired(answerableAt, deadlineMs, nowMs)) {
    return "Time expired. Timer paused.";
  }

  return formatAnswerCountdown(answerableAt, deadlineMs, nowMs);
}

export function countAnnotationUses<T extends string>(
  annotations: readonly AnnotationRecord[],
  readKey: (annotation: AnnotationRecord) => T | null,
  optionKey: T,
  exceptAnnotationId?: string,
): number {
  let count = 0;
  for (const annotation of annotations) {
    if (annotation.status !== "active") {
      continue;
    }
    if (exceptAnnotationId && annotation.id === exceptAnnotationId) {
      continue;
    }
    if (readKey(annotation) === optionKey) {
      count += 1;
    }
  }
  return count;
}
