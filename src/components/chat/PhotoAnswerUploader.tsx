import { useState } from "react";
import {
  PHOTO_CANNOT_ANSWER_LABEL,
  PHOTO_SENT_EXTERNALLY_LABEL,
  PHOTO_UPLOAD_OUTAGE_NOTICE,
  photoAnswerSelectedReply,
  photoRuleSummaryForUnit,
  readPhotoCategoryId,
  type PhotoAnswer,
} from "../../domain/questions";
import type { DistanceUnit } from "../../domain/map/distance";
import type { PendingQuestionRecord } from "../../domain/session/activity/sessionChat";

interface PhotoAnswerUploaderProps {
  sessionId: string;
  pendingQuestion: PendingQuestionRecord;
  messageId: string;
  distanceUnit?: DistanceUnit;
  deadlineExpired?: boolean;
  onAnswerQuestion: (
    pendingQuestionId: string,
    messageId: string,
    answer: unknown,
    selectedReply: string,
    deadlineExpired?: boolean,
  ) => Promise<void>;
}

export function PhotoAnswerUploader({
  pendingQuestion,
  messageId,
  distanceUnit = "imperial",
  deadlineExpired = false,
  onAnswerQuestion,
}: PhotoAnswerUploaderProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryId = readPhotoCategoryId(pendingQuestion);
  const ruleSummary = categoryId
    ? photoRuleSummaryForUnit(categoryId, distanceUnit)
    : null;

  const submitAnswer = async (answer: PhotoAnswer) => {
    if (submitting) {
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onAnswerQuestion(
        pendingQuestion.id,
        messageId,
        answer,
        photoAnswerSelectedReply(answer),
        deadlineExpired,
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Could not save your answer.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      <p className="rounded-lg border border-status-warning/30 bg-status-warning/10 px-3 py-2 text-xs leading-snug text-ink">
        {PHOTO_UPLOAD_OUTAGE_NOTICE}
      </p>
      {ruleSummary ? (
        <p className="text-xs leading-snug text-ink-dim">{ruleSummary}</p>
      ) : null}
      <button
        type="button"
        disabled={submitting}
        onClick={() => void submitAnswer({ kind: "sent_externally" })}
        className="btn-primary min-h-11 w-full disabled:opacity-50"
      >
        {PHOTO_SENT_EXTERNALLY_LABEL}
      </button>
      <button
        type="button"
        disabled={submitting}
        onClick={() => void submitAnswer({ kind: "cannot_answer" })}
        className="btn-secondary min-h-11 w-full disabled:opacity-50"
      >
        {PHOTO_CANNOT_ANSWER_LABEL}
      </button>
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
