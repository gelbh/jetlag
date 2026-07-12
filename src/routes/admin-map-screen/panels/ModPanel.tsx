interface ModPanelProps {
  moderationBusy: boolean;
  moderationError: string | null;
  onModerationAction: (action: "end" | "resetBoard" | "cleanupCode") => void;
}

export function ModPanel({
  moderationBusy,
  moderationError,
  onModerationAction,
}: ModPanelProps) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-ink-muted">
        Moderation actions apply immediately to the live session.
      </p>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          disabled={moderationBusy}
          onClick={() => onModerationAction("end")}
        >
          Force end
        </button>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs"
          disabled={moderationBusy}
          onClick={() => onModerationAction("resetBoard")}
        >
          Reset board
        </button>
        <button
          type="button"
          className="btn-secondary min-h-9 px-3 text-xs text-error"
          disabled={moderationBusy}
          onClick={() => onModerationAction("cleanupCode")}
        >
          Cleanup code
        </button>
      </div>
      {moderationError ? (
        <p className="text-xs text-error" role="alert">
          {moderationError}
        </p>
      ) : null}
    </div>
  );
}
