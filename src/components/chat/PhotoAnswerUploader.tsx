import { useRef, useState } from "react";
import {
  getPhotoCategory,
  PHOTO_CANNOT_ANSWER_LABEL,
  photoAnswerSelectedReply,
  readPhotoCategoryId,
  type PhotoAnswer,
} from "../../domain/photoQuestions";
import type { PendingQuestionRecord } from "../../domain/sessionChat";
import { uploadPhotoAnswer } from "../../services/photoStorage";

interface PhotoAnswerUploaderProps {
  sessionId: string;
  pendingQuestion: PendingQuestionRecord;
  messageId: string;
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
  sessionId,
  pendingQuestion,
  messageId,
  deadlineExpired = false,
  onAnswerQuestion,
}: PhotoAnswerUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const categoryId = readPhotoCategoryId(pendingQuestion);
  const ruleSummary = categoryId
    ? getPhotoCategory(categoryId).ruleSummary
    : null;

  const submitAnswer = async (answer: PhotoAnswer) => {
    setError(null);
    await onAnswerQuestion(
      pendingQuestion.id,
      messageId,
      answer,
      photoAnswerSelectedReply(answer),
      deadlineExpired,
    );
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) {
      return;
    }

    setUploading(true);
    setError(null);
    try {
      const storagePath = await uploadPhotoAnswer(
        sessionId,
        pendingQuestion.id,
        file,
      );
      await submitAnswer({ kind: "photo", storagePath });
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Could not upload the photo. Try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-3 space-y-2">
      {ruleSummary ? (
        <p className="text-xs leading-snug text-ink-dim">{ruleSummary}</p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="btn-primary min-h-11 w-full disabled:opacity-50"
      >
        {uploading ? "Uploading photo…" : "Upload photo"}
      </button>
      <button
        type="button"
        disabled={uploading}
        onClick={() => void submitAnswer({ kind: "cannot_answer" })}
        className="btn-secondary min-h-11 w-full disabled:opacity-50"
      >
        {PHOTO_CANNOT_ANSWER_LABEL}
      </button>
      {error ? <p className="text-sm text-status-error">{error}</p> : null}
    </div>
  );
}
