import { useState } from "react";
import {
  PRELOAD_NOTE_MAX_LENGTH,
  type PreloadPresetSnapshot,
} from "../../domain/preloadRequest/preloadRequestTypes";
import { usePermanentAuthUser } from "../../hooks/billing/usePermanentAuthUser";
import {
  createPreloadRequest,
  type CreatePreloadRequestResult,
} from "../../services/preloadRequest/preloadRequestApi";

export interface RequestPreloadSectionProps {
  snapshot: PreloadPresetSnapshot;
  /** Injected for tests; production uses {@link createPreloadRequest}. */
  createPreloadRequestFn?: (
    input: {
      presetSnapshot: PreloadPresetSnapshot;
      note?: string | null;
    },
  ) => Promise<CreatePreloadRequestResult>;
}

export function RequestPreloadSection({
  snapshot,
  createPreloadRequestFn = createPreloadRequest,
}: RequestPreloadSectionProps) {
  const { isPermanent, authReady } = usePermanentAuthUser();
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  const canSubmit =
    authReady &&
    isPermanent &&
    snapshot.name.trim().length > 0 &&
    !submitting &&
    successId == null;

  async function handleSubmit() {
    if (!canSubmit) {
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await createPreloadRequestFn({
        presetSnapshot: {
          ...snapshot,
          name: snapshot.name.trim(),
        },
        note: note.trim() || null,
      });
      setSuccessId(result.requestId);
    } catch (submitError) {
      const message =
        submitError instanceof Error
          ? submitError.message
          : "Could not submit the preload request.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section
      className="jl-field-frame space-y-3"
      aria-labelledby="request-preload-heading"
    >
      <div className="space-y-1">
        <p
          id="request-preload-heading"
          className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-ink-dim"
        >
          Request location preload
        </p>
        <p className="text-xs leading-snug text-ink-muted">
          Ask us to review this custom preset for the same pack-style place
          data recommended cities get. Requests are reviewed manually and are
          not instant.
        </p>
      </div>

      {!authReady ? (
        <p className="text-sm text-ink-muted">Checking sign-in…</p>
      ) : !isPermanent ? (
        <p className="text-sm text-ink-muted">
          Sign in with Google or email to submit a preload request.
        </p>
      ) : successId ? (
        <p className="text-sm text-status-success" role="status">
          Request submitted. We will review it manually.
        </p>
      ) : (
        <>
          <label className="field-label font-display text-xs uppercase tracking-[0.1em]">
            Optional note
            <textarea
              value={note}
              onChange={(event) => {
                setNote(event.target.value.slice(0, PRELOAD_NOTE_MAX_LENGTH));
                setError(null);
              }}
              maxLength={PRELOAD_NOTE_MAX_LENGTH}
              rows={3}
              placeholder="Anything helpful about this area?"
              className="field-input mt-2"
            />
            <span className="mt-1 block text-xs text-ink-muted">
              {note.length}/{PRELOAD_NOTE_MAX_LENGTH}
            </span>
          </label>

          {error ? (
            <p className="text-sm text-error" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            className="btn-secondary w-full disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Request preload"}
          </button>
        </>
      )}
    </section>
  );
}
