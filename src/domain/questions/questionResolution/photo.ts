import type { PendingQuestionRecord } from "../../session/sessionChat";

export function isPhotoPendingQuestion(
  pending: PendingQuestionRecord | undefined,
): boolean {
  return pending?.toolType === "photo";
}

export function photoPendingQuestionAnswered(
  pending: PendingQuestionRecord,
): boolean {
  return pending.status === "answered" || pending.status === "resolved";
}
