import { useEffect, useState } from "react";
import {
  parsePhotoAnswer,
  PHOTO_CANNOT_ANSWER_LABEL,
  PHOTO_SENT_EXTERNALLY_SEEKER_LABEL,
} from "../../domain/questions";
import { getPhotoDownloadUrl } from "../../services/core/photoStorage";

interface PhotoAnswerPreviewProps {
  answer: unknown;
}

export function PhotoAnswerPreview({ answer }: PhotoAnswerPreviewProps) {
  const parsed = parsePhotoAnswer(answer);
  const photoPath =
    parsed?.kind === "photo" ? parsed.storagePath : null;
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!photoPath) {
      return;
    }

    let cancelled = false;
    void getPhotoDownloadUrl(photoPath)
      .then((url) => {
        if (!cancelled) {
          setDownloadUrl(url);
          setError(null);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDownloadUrl(null);
          setError("Could not load photo.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [photoPath]);

  if (!parsed) {
    return <p className="mt-2 text-xs text-ink-dim">Answered</p>;
  }

  if (parsed.kind === "cannot_answer") {
    return (
      <p className="mt-2 text-xs text-ink-dim">
        Answered: {PHOTO_CANNOT_ANSWER_LABEL}
      </p>
    );
  }

  if (parsed.kind === "sent_externally") {
    return (
      <p className="mt-2 text-xs text-ink-dim">
        {PHOTO_SENT_EXTERNALLY_SEEKER_LABEL}
      </p>
    );
  }

  if (error) {
    return <p className="mt-2 text-xs text-status-warning">{error}</p>;
  }

  if (!downloadUrl) {
    return <p className="mt-2 text-xs text-ink-dim">Loading photo…</p>;
  }

  return (
    <div className="mt-2 space-y-1">
      <p className="text-xs text-ink-dim">Answered with photo</p>
      <img
        src={downloadUrl}
        alt="Hider photo answer"
        className="max-h-64 w-full rounded-lg border border-border object-contain"
      />
    </div>
  );
}
