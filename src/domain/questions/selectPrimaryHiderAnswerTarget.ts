import type { SessionRulesInput } from "../session/rules";
import type {
  PendingQuestionRecord,
  SessionMessageRecord,
} from "../session/activity/sessionChat";
import { selectPrimaryQuestionTimer } from "./questionTimerDisplay";

export interface PrimaryHiderAnswerTarget {
  pending: PendingQuestionRecord;
  message: SessionMessageRecord;
}

export function selectPrimaryHiderAnswerTarget(
  pendingQuestions: readonly PendingQuestionRecord[],
  messages: readonly SessionMessageRecord[],
  sessionRules: SessionRulesInput,
  nowMs: number = Date.now(),
): PrimaryHiderAnswerTarget | null {
  const primary = selectPrimaryQuestionTimer(
    pendingQuestions,
    sessionRules,
    nowMs,
  );
  if (!primary) {
    return null;
  }

  const pending = pendingQuestions.find(
    (question) => question.id === primary.pendingQuestionId,
  );
  if (!pending) {
    return null;
  }

  const message = messages.find(
    (entry) =>
      entry.channel === "game" &&
      entry.kind === "question" &&
      entry.pendingQuestionId === pending.id,
  );
  if (!message) {
    return null;
  }

  return { pending, message };
}
