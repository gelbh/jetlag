import type { AnnotationRecord, AnnotationType } from "./annotations";
import type { QuestionCardCost } from "./mapTools";
import type { GameSize } from "./gameSize";
import { answerDeadlineMs } from "./gameSizeRules";
import type { PendingQuestionRecord } from "./sessionChat";

export type QuestionToolType = Extract<
  AnnotationType,
  "matching" | "measuring" | "radar" | "thermometer" | "tentacle"
>;

const BASE_COST_MULTIPLIERS: Record<QuestionCardCost, { draw: number; keep: number }> =
  {
    D3P1: { draw: 3, keep: 1 },
    D2P1: { draw: 2, keep: 1 },
    D4P2: { draw: 4, keep: 2 },
  };

export function questionCostLabel(
  baseCost: QuestionCardCost,
  useCount: number,
): string {
  const multiplier = useCount + 1;
  const { draw, keep } = BASE_COST_MULTIPLIERS[baseCost];
  return `D${draw * multiplier}P${keep * multiplier}`;
}

export function hasOpenPendingQuestion(
  pendingQuestions: readonly PendingQuestionRecord[],
): boolean {
  return pendingQuestions.some(
    (question) => question.status === "pending" || question.status === "walking",
  );
}

export function questionAnswerDeadlineMs(
  toolType: AnnotationType,
  gameSize: GameSize,
): number {
  return answerDeadlineMs(toolType, gameSize);
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

  const totalSeconds = Math.ceil(remaining / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")} remaining`;
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
    return "Time expired — timer paused";
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
