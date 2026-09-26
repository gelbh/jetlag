import { useState } from "react";
import { Button, Stack, Text } from "@mantine/core";
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
import {
  iosFilledStyles,
  iosGrayStyles,
} from "../ui/apple/iosEntryChrome";

interface PhotoAnswerUploaderProps {
  sessionId: string;
  pendingQuestion: PendingQuestionRecord;
  messageId: string;
  distanceUnit?: DistanceUnit;
  deadlineExpired?: boolean;
  disabled?: boolean;
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
  disabled = false,
  onAnswerQuestion,
}: PhotoAnswerUploaderProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const categoryId = readPhotoCategoryId(pendingQuestion);
  const ruleSummary = categoryId
    ? photoRuleSummaryForUnit(categoryId, distanceUnit)
    : null;

  const busy = submitting || disabled;

  const submitAnswer = async (answer: PhotoAnswer) => {
    if (busy) {
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
    <Stack gap={8} mt={8}>
      <Text
        size="xs"
        c="var(--color-field-ink)"
        lh={1.35}
        px={10}
        py={8}
        style={{
          borderRadius: 12,
          border: "1px solid oklch(from var(--color-halt) l c h / 0.35)",
          backgroundColor: "oklch(from var(--color-halt) l c h / 0.1)",
        }}
      >
        {PHOTO_UPLOAD_OUTAGE_NOTICE}
      </Text>
      {ruleSummary ? (
        <Text size="xs" c="var(--color-field-ink-muted)" lh={1.35}>
          {ruleSummary}
        </Text>
      ) : null}
      <Button
        fullWidth
        disabled={busy}
        onClick={() => void submitAnswer({ kind: "sent_externally" })}
        styles={iosFilledStyles}
      >
        {PHOTO_SENT_EXTERNALLY_LABEL}
      </Button>
      <Button
        fullWidth
        disabled={busy}
        onClick={() => void submitAnswer({ kind: "cannot_answer" })}
        styles={iosGrayStyles}
      >
        {PHOTO_CANNOT_ANSWER_LABEL}
      </Button>
      {error ? (
        <Text size="sm" c="var(--color-halt)" role="alert">
          {error}
        </Text>
      ) : null}
    </Stack>
  );
}
