import { useEffect, useRef, useState } from "react";
import {
  getPhotoCategory,
  PHOTO_CANNOT_ANSWER_LABEL,
  photoAnswerSelectedReply,
  readPhotoCategoryId,
  type PhotoAnswer,
} from "../../domain/questions/photoQuestions";
import { photoUploadAccessError } from "../../domain/questions/photoUploadAccess";
import type { PendingQuestionRecord } from "../../domain/session/sessionChat";
import { ensureAnonymousUser } from "../../services/core/firebase";
import {
  deletePhotoAnswer,
  uploadPhotoAnswer,
} from "../../services/core/photoStorage";
import { capturePhotoUploadFailure } from "../../services/core/sentry";
import { useSessionStore } from "../../state/sessionStore";

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
  const [authUid, setAuthUid] = useState<string | null>(null);
  const session = useSessionStore((state) => state.session);
  const storeUid = useSessionStore((state) => state.myUid);

  useEffect(() => {
    let cancelled = false;
    void ensureAnonymousUser()
      .then((user) => {
        if (!cancelled) {
          setAuthUid(user.uid);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuthUid(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const accessUid = authUid ?? storeUid;
  const accessError = photoUploadAccessError(session, accessUid);
  const syncPending =
    accessError !== null &&
    (accessError.startsWith("Syncing") || accessError.includes("still syncing"));

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
    let storagePath: string | null = null;
    try {
      storagePath = await uploadPhotoAnswer(
        sessionId,
        pendingQuestion.id,
        file,
        session,
        accessUid,
      );
      await submitAnswer({ kind: "photo", storagePath });
    } catch (uploadError) {
      if (storagePath) {
        try {
          await deletePhotoAnswer(storagePath);
        } catch (cleanupError) {
          capturePhotoUploadFailure(cleanupError, "storage", {
            sessionId,
            questionId: pendingQuestion.id,
            storagePath,
            phase: "orphan_cleanup",
          });
        }
      }

      if (storagePath) {
        capturePhotoUploadFailure(uploadError, "firestore", {
          sessionId,
          questionId: pendingQuestion.id,
          storagePath,
        });
      }

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
      {accessError ? (
        <p
          className={
            syncPending ? "text-sm text-ink-muted" : "text-sm text-status-warning"
          }
        >
          {accessError}
        </p>
      ) : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => void handleFileChange(event)}
      />
      <button
        type="button"
        disabled={uploading || accessError !== null}
        onClick={(event) => {
          event.stopPropagation();
          inputRef.current?.click();
        }}
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
